-- =====================================================
-- 008: Fix game_states table - align with application code
-- The code uses 'state' column (not 'game_data'), 
-- 'version' for optimistic concurrency, 'sequence' integer in events
-- =====================================================

-- Drop old tables if they exist with wrong schema
DROP TABLE IF EXISTS player_presence CASCADE;
DROP TABLE IF EXISTS game_events CASCADE;
DROP TABLE IF EXISTS game_states CASCADE;

-- Game States - persistent game state for each party's active game
CREATE TABLE game_states (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  party_id UUID NOT NULL REFERENCES parties(id) ON DELETE CASCADE,
  game_type TEXT NOT NULL,
  state JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'paused', 'finished')),
  version INTEGER NOT NULL DEFAULT 1,
  host_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(party_id, game_type)
);

-- Game Events - event log for replay/debugging
CREATE TABLE game_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_state_id UUID NOT NULL REFERENCES game_states(id) ON DELETE CASCADE,
  player_id UUID REFERENCES auth.users(id),
  action_type TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  sequence INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Player Presence - who is currently connected to a game
CREATE TABLE player_presence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  game_state_id UUID NOT NULL REFERENCES game_states(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  display_name TEXT NOT NULL DEFAULT 'Guest',
  is_connected BOOLEAN DEFAULT true,
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  UNIQUE(game_state_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_game_states_party ON game_states(party_id);
CREATE INDEX idx_game_states_status ON game_states(status);
CREATE INDEX idx_game_events_game_state ON game_events(game_state_id);
CREATE INDEX idx_game_events_sequence ON game_events(game_state_id, sequence);
CREATE INDEX idx_player_presence_game ON player_presence(game_state_id);
CREATE INDEX idx_player_presence_user ON player_presence(user_id);

-- Enable RLS
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_presence ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_states
-- Anyone in the party can read game state
CREATE POLICY "Party members can view game state"
  ON game_states FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM party_members
      WHERE party_members.party_id = game_states.party_id
      AND party_members.user_id = auth.uid()
    )
  );

-- Host can insert/update game state
CREATE POLICY "Party members can insert game state"
  ON game_states FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM party_members
      WHERE party_members.party_id = game_states.party_id
      AND party_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Party members can update game state"
  ON game_states FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM party_members
      WHERE party_members.party_id = game_states.party_id
      AND party_members.user_id = auth.uid()
    )
  );

-- RLS for game_events
CREATE POLICY "Party members can view game events"
  ON game_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_states gs
      JOIN party_members pm ON pm.party_id = gs.party_id
      WHERE gs.id = game_events.game_state_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Party members can insert game events"
  ON game_events FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM game_states gs
      JOIN party_members pm ON pm.party_id = gs.party_id
      WHERE gs.id = game_events.game_state_id
      AND pm.user_id = auth.uid()
    )
  );

-- RLS for player_presence
CREATE POLICY "Party members can view presence"
  ON player_presence FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM game_states gs
      JOIN party_members pm ON pm.party_id = gs.party_id
      WHERE gs.id = player_presence.game_state_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own presence"
  ON player_presence FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own presence"
  ON player_presence FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own presence"
  ON player_presence FOR DELETE
  USING (user_id = auth.uid());

-- Enable realtime for game_states
ALTER PUBLICATION supabase_realtime ADD TABLE game_states;
ALTER PUBLICATION supabase_realtime ADD TABLE player_presence;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_game_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER game_states_updated_at
  BEFORE UPDATE ON game_states
  FOR EACH ROW
  EXECUTE FUNCTION update_game_state_timestamp();
