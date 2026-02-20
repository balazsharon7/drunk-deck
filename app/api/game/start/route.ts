import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createDeck, shuffleDeck } from '@/lib/deck';

interface Player {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
}

interface StartGameRequest {
  partyId: string;
  playerId: string;
  players: Player[];
  gameType?: string;
  settings?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const body: StartGameRequest = await request.json();
    const { partyId, playerId, players, gameType = 'kings-cup', settings = {} } = body;

    if (!partyId || !playerId || !players || players.length < 2) {
      return NextResponse.json(
        { error: 'Missing required fields or not enough players' },
        { status: 400 }
      );
    }

    // Verify the requesting player is the host
    const host = players.find(p => p.isHost);
    if (!host || host.id !== playerId) {
      return NextResponse.json(
        { error: 'Only the host can start the game' },
        { status: 403 }
      );
    }

    const supabase = await createClient();

    // Create initial game state based on game type
    let gameState: Record<string, unknown>;

    switch (gameType) {
      case 'kings-cup':
        gameState = createKingsCupState(partyId, players, settings);
        break;
      case 'ride-the-bus':
        gameState = createRideTheBusState(partyId, players, settings);
        break;
      case 'blackjack':
        gameState = createBlackjackState(partyId, players, settings);
        break;
      default:
        gameState = createKingsCupState(partyId, players, settings);
    }

    // Save to database
    const { error: saveError } = await supabase
      .from('game_states')
      .upsert({
        party_id: partyId,
        game_type: gameType,
        state: gameState,
        version: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (saveError) {
      console.error('[v0] Failed to save game state:', saveError);
      return NextResponse.json(
        { error: 'Failed to start game' },
        { status: 500 }
      );
    }

    // Log game start event
    await supabase.from('game_events').insert({
      party_id: partyId,
      event_type: 'game_started',
      player_id: playerId,
      payload: { gameType, playerCount: players.length },
      sequence: 1
    });

    return NextResponse.json({
      success: true,
      gameState,
      gameType
    });

  } catch (error) {
    console.error('[v0] Start game error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function createKingsCupState(
  partyId: string,
  players: Player[],
  settings: Record<string, unknown>
) {
  const deck = shuffleDeck(createDeck());
  
  return {
    partyId,
    gameType: 'kings-cup',
    deck,
    drawnCards: [],
    currentPlayerIndex: 0,
    players: players.map(p => ({
      ...p,
      isOnline: true,
      score: 0,
      sips: 0
    })),
    kingsDrawn: 0,
    phase: 'playing',
    currentCard: null,
    lastKingPlayer: null,
    thumbMaster: null,
    questionMaster: null,
    customRule: null,
    settings: {
      language: settings.language || 'hu',
      ...settings
    },
    version: 1,
    startedAt: new Date().toISOString()
  };
}

function createRideTheBusState(
  partyId: string,
  players: Player[],
  settings: Record<string, unknown>
) {
  const deck = shuffleDeck(createDeck());
  
  return {
    partyId,
    gameType: 'ride-the-bus',
    deck,
    playerCards: {},
    currentPlayerIndex: 0,
    players: players.map(p => ({
      ...p,
      isOnline: true,
      cards: [],
      wrongGuesses: 0
    })),
    phase: 'round1',
    currentQuestion: 'Piros vagy fekete?',
    busRider: null,
    settings: {
      language: settings.language || 'hu',
      ...settings
    },
    version: 1,
    startedAt: new Date().toISOString()
  };
}

function createBlackjackState(
  partyId: string,
  players: Player[],
  settings: Record<string, unknown>
) {
  const deck = shuffleDeck(createDeck());
  
  return {
    partyId,
    gameType: 'blackjack',
    deck,
    dealerHand: [],
    playerHands: {},
    currentPlayerIndex: 0,
    players: players.map(p => ({
      ...p,
      isOnline: true,
      hand: [],
      bet: 0,
      status: 'playing'
    })),
    phase: 'betting',
    currentBet: 1,
    settings: {
      language: settings.language || 'hu',
      ...settings
    },
    version: 1,
    startedAt: new Date().toISOString()
  };
}
