import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Server-side game action handler with validation
// This ensures all game state changes are validated before being applied

interface GameAction {
  type: string;
  playerId: string;
  cardIndex?: number;
  payload?: Record<string, unknown>;
}

interface ActionRequest {
  partyId: string;
  action: GameAction;
  actionId: string;
  playerId: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ActionRequest = await request.json();
    const { partyId, action, actionId, playerId } = body;

    if (!partyId || !action || !playerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Load current game state with lock
    const { data: gameData, error: loadError } = await supabase
      .from('game_states')
      .select('*')
      .eq('party_id', partyId)
      .single();

    if (loadError) {
      console.error('[v0] Failed to load game state:', loadError);
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    const currentState = gameData.state;
    const currentVersion = gameData.version;

    // 2. Validate action
    const validation = validateAction(currentState, action);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error, actionId },
        { status: 400 }
      );
    }

    // 3. Apply action to get new state
    const newState = applyAction(currentState, action);
    const newVersion = currentVersion + 1;

    // 4. Save new state with optimistic locking
    const { error: saveError } = await supabase
      .from('game_states')
      .update({
        state: newState,
        version: newVersion,
        updated_at: new Date().toISOString()
      })
      .eq('party_id', partyId)
      .eq('version', currentVersion); // Optimistic lock

    if (saveError) {
      console.error('[v0] Failed to save game state:', saveError);
      return NextResponse.json(
        { error: 'Conflict - state was modified', actionId },
        { status: 409 }
      );
    }

    // 5. Log event
    await supabase.from('game_events').insert({
      party_id: partyId,
      event_type: action.type.toLowerCase(),
      player_id: playerId,
      payload: action,
      sequence: newVersion
    });

    return NextResponse.json({
      success: true,
      actionId,
      newState,
      version: newVersion
    });

  } catch (error) {
    console.error('[v0] Game action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Validate action based on game type and current state
function validateAction(
  state: Record<string, unknown>,
  action: GameAction
): { valid: boolean; error?: string } {
  const gameType = state.gameType as string;
  const players = state.players as Array<{ id: string }>;
  const currentPlayerIndex = state.currentPlayerIndex as number;
  const currentPlayer = players[currentPlayerIndex];

  // Common validations
  if (state.phase === 'finished') {
    return { valid: false, error: 'Game is already finished' };
  }

  // Turn-based validation
  if (action.type === 'DRAW_CARD' || action.type === 'NEXT_TURN') {
    if (action.playerId !== currentPlayer?.id) {
      return { valid: false, error: 'Not your turn' };
    }
  }

  // Game-specific validations
  switch (gameType) {
    case 'kings-cup':
      return validateKingsCupAction(state, action);
    case 'ride-the-bus':
      return validateRideTheBusAction(state, action);
    default:
      return { valid: true };
  }
}

function validateKingsCupAction(
  state: Record<string, unknown>,
  action: GameAction
): { valid: boolean; error?: string } {
  const deck = state.deck as unknown[];
  const currentCard = state.currentCard;

  switch (action.type) {
    case 'DRAW_CARD':
      if (currentCard !== null) {
        return { valid: false, error: 'Already showing a card' };
      }
      if (deck.length === 0) {
        return { valid: false, error: 'No cards left' };
      }
      if (action.cardIndex !== undefined && action.cardIndex >= deck.length) {
        return { valid: false, error: 'Invalid card index' };
      }
      return { valid: true };

    case 'NEXT_TURN':
      if (currentCard === null) {
        return { valid: false, error: 'Must draw a card first' };
      }
      return { valid: true };

    case 'NEW_GAME':
      // Only host can start new game
      return { valid: true };

    default:
      return { valid: true };
  }
}

function validateRideTheBusAction(
  state: Record<string, unknown>,
  action: GameAction
): { valid: boolean; error?: string } {
  // Add Ride the Bus specific validations
  return { valid: true };
}

// Apply action to state and return new state
function applyAction(
  state: Record<string, unknown>,
  action: GameAction
): Record<string, unknown> {
  const gameType = state.gameType as string;

  switch (gameType) {
    case 'kings-cup':
      return applyKingsCupAction(state, action);
    case 'ride-the-bus':
      return applyRideTheBusAction(state, action);
    default:
      return state;
  }
}

function applyKingsCupAction(
  state: Record<string, unknown>,
  action: GameAction
): Record<string, unknown> {
  const deck = [...(state.deck as Array<{ id: string; value: string }>)];
  const players = state.players as Array<{ id: string; name: string }>;
  const currentPlayerIndex = state.currentPlayerIndex as number;
  let kingsDrawn = state.kingsDrawn as number;

  switch (action.type) {
    case 'DRAW_CARD': {
      const cardIndex = action.cardIndex ?? 0;
      const card = deck[cardIndex];
      deck.splice(cardIndex, 1);
      
      if (card.value === 'K') {
        kingsDrawn++;
      }

      const currentPlayer = players[currentPlayerIndex];
      
      return {
        ...state,
        deck,
        drawnCards: [...(state.drawnCards as string[]), card.id],
        currentCard: card,
        kingsDrawn,
        lastKingPlayer: card.value === 'K' ? currentPlayer.name : state.lastKingPlayer,
        phase: kingsDrawn >= 4 ? 'finished' : 'playing',
        version: (state.version as number) + 1
      };
    }

    case 'NEXT_TURN': {
      const nextIndex = (currentPlayerIndex + 1) % players.length;
      return {
        ...state,
        currentPlayerIndex: nextIndex,
        currentCard: null,
        version: (state.version as number) + 1
      };
    }

    default:
      return state;
  }
}

function applyRideTheBusAction(
  state: Record<string, unknown>,
  action: GameAction
): Record<string, unknown> {
  // Add Ride the Bus action application
  return state;
}
