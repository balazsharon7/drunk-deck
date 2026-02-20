-- scripts/007-multiplayer-game-state.sql
-- Multiplayer game state management tables

-- ============================================
-- GAME STATES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS game_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  
  -- Game state (JSONB for flexibility)
  game_data JSONB NOT NULL DEFAULT '{}',
  
  -- Optimistic concurrency control
  version INTEGER NOT NULL DEFAULT 0,
  
  -- Phase tracking
  phase TEXT NOT NULL DEFAULT 'lobby',
  current_player_index INTEGER DEFAULT 0,
  
  -- Broadcast trigger for Supabase Realtime
  broadcast_trigger BIGINT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint
  UNIQUE(party_id)
);

CREATE INDEX IF NOT EXISTS idx_game_states_party ON game_states(party_id);
CREATE INDEX IF NOT EXISTS idx_game_states_phase ON game_states(phase);

-- ============================================
-- GAME EVENTS TABLE (Event Sourcing)
-- ============================================

CREATE TABLE IF NOT EXISTS game_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  
  -- Event details
  event_type TEXT NOT NULL,
  player_id UUID NOT NULL REFERENCES profiles(id),
  payload JSONB NOT NULL,
  
  -- Ordering
  sequence_id SERIAL,
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  
  -- Processing status
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  
  -- Conflict resolution
  superseded_by UUID REFERENCES game_events(id)
);

CREATE INDEX IF NOT EXISTS idx_game_events_party ON game_events(party_id, sequence_id);
CREATE INDEX IF NOT EXISTS idx_game_events_unprocessed ON game_events(party_id, processed) WHERE NOT processed;

-- ============================================
-- PLAYER PRESENCE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS player_presence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Status
  is_online BOOLEAN DEFAULT TRUE,
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  
  -- Connection info
  connection_id TEXT,
  latency_ms INTEGER,
  
  UNIQUE(party_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_player_presence_party ON player_presence(party_id);
CREATE INDEX IF NOT EXISTS idx_player_presence_online ON player_presence(party_id, is_online);

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_presence ENABLE ROW LEVEL SECURITY;

-- Game States: party members can view
DROP POLICY IF EXISTS "Party members can view game state" ON game_states;
CREATE POLICY "Party members can view game state"
ON game_states FOR SELECT
USING (
  party_id IN (
    SELECT party_id FROM party_members WHERE user_id = auth.uid()
  )
);

-- Game States: host or service role can update
DROP POLICY IF EXISTS "Host can update game state" ON game_states;
CREATE POLICY "Host can update game state"
ON game_states FOR UPDATE
USING (
  party_id IN (
    SELECT id FROM parties WHERE host_id = auth.uid()
  )
);

-- Game States: host can insert
DROP POLICY IF EXISTS "Host can insert game state" ON game_states;
CREATE POLICY "Host can insert game state"
ON game_states FOR INSERT
WITH CHECK (
  party_id IN (
    SELECT id FROM parties WHERE host_id = auth.uid()
  )
);

-- Game Events: party members can insert their own events
DROP POLICY IF EXISTS "Party members can insert events" ON game_events;
CREATE POLICY "Party members can insert events"
ON game_events FOR INSERT
WITH CHECK (
  party_id IN (
    SELECT party_id FROM party_members WHERE user_id = auth.uid()
  )
  AND player_id = auth.uid()
);

-- Game Events: party members can view
DROP POLICY IF EXISTS "Party members can view events" ON game_events;
CREATE POLICY "Party members can view events"
ON game_events FOR SELECT
USING (
  party_id IN (
    SELECT party_id FROM party_members WHERE user_id = auth.uid()
  )
);

-- Player Presence: party members can view
DROP POLICY IF EXISTS "Party members can view presence" ON player_presence;
CREATE POLICY "Party members can view presence"
ON player_presence FOR SELECT
USING (
  party_id IN (
    SELECT party_id FROM party_members WHERE user_id = auth.uid()
  )
);

-- Player Presence: users can update own presence
DROP POLICY IF EXISTS "Users can update own presence" ON player_presence;
CREATE POLICY "Users can update own presence"
ON player_presence FOR UPDATE
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own presence" ON player_presence;
CREATE POLICY "Users can insert own presence"
ON player_presence FOR INSERT
WITH CHECK (user_id = auth.uid());

-- ============================================
-- REALTIME CONFIGURATION
-- ============================================

-- Enable Realtime for multiplayer tables
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'game_states'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE game_states;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'game_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE game_events;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'player_presence'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE player_presence;
  END IF;
END $$;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Initialize a new game state
CREATE OR REPLACE FUNCTION initialize_game_state(
  p_party_id UUID,
  p_game_type TEXT,
  p_initial_data JSONB
)
RETURNS UUID AS $$
DECLARE
  v_state_id UUID;
BEGIN
  INSERT INTO game_states (party_id, game_type, game_data, phase)
  VALUES (p_party_id, p_game_type, p_initial_data, 'playing')
  ON CONFLICT (party_id) 
  DO UPDATE SET 
    game_data = p_initial_data,
    game_type = p_game_type,
    phase = 'playing',
    version = 0,
    updated_at = NOW()
  RETURNING id INTO v_state_id;
  
  RETURN v_state_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if it's a player's turn
CREATE OR REPLACE FUNCTION is_player_turn(
  p_party_id UUID,
  p_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_current_index INTEGER;
  v_player_index INTEGER;
BEGIN
  -- Get current player index
  SELECT current_player_index INTO v_current_index
  FROM game_states
  WHERE party_id = p_party_id;
  
  -- Get user's index in party (ordered by join time)
  WITH numbered_members AS (
    SELECT user_id, ROW_NUMBER() OVER (ORDER BY joined_at) - 1 AS idx
    FROM party_members
    WHERE party_id = p_party_id
  )
  SELECT idx INTO v_player_index
  FROM numbered_members
  WHERE user_id = p_user_id;
  
  RETURN v_current_index = v_player_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Advance to next player
CREATE OR REPLACE FUNCTION advance_turn(p_party_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_player_count INTEGER;
  v_current_index INTEGER;
  v_next_index INTEGER;
BEGIN
  -- How many players?
  SELECT COUNT(*) INTO v_player_count
  FROM party_members
  WHERE party_id = p_party_id;
  
  -- Current index
  SELECT current_player_index INTO v_current_index
  FROM game_states
  WHERE party_id = p_party_id;
  
  -- Next index (circular)
  v_next_index := (v_current_index + 1) % v_player_count;
  
  -- Update
  UPDATE game_states
  SET current_player_index = v_next_index,
      version = version + 1,
      updated_at = NOW()
  WHERE party_id = p_party_id;
  
  RETURN v_next_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup stale presence (run periodically)
CREATE OR REPLACE FUNCTION cleanup_stale_presence()
RETURNS void AS $$
BEGIN
  UPDATE player_presence
  SET is_online = FALSE
  WHERE last_heartbeat < NOW() - INTERVAL '5 minutes'
    AND is_online = TRUE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS game_states_updated_at ON game_states;
CREATE TRIGGER game_states_updated_at
BEFORE UPDATE ON game_states
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Broadcast trigger increment on game_data change
CREATE OR REPLACE FUNCTION increment_broadcast_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.broadcast_trigger = COALESCE(OLD.broadcast_trigger, 0) + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS game_states_broadcast ON game_states;
CREATE TRIGGER game_states_broadcast
BEFORE UPDATE ON game_states
FOR EACH ROW
WHEN (OLD.game_data IS DISTINCT FROM NEW.game_data)
EXECUTE FUNCTION increment_broadcast_trigger();
