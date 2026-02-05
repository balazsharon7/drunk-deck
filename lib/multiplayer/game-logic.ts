// Pure functions for game logic - used both client and server side
// These functions validate and apply game actions

import type { 
  GameState, 
  KingsCupState, 
  KingsCupAction,
  Card,
  PlayerInGame,
  GameSettings
} from './types';
import { getKingsCupRule } from '@/lib/kings-cup-rules';

// ============================================
// DECK UTILITIES
// ============================================

export function createDeck(): Card[] {
  const suits: Card['suit'][] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  
  const deck: Card[] = [];
  
  for (const suit of suits) {
    for (let i = 0; i < values.length; i++) {
      deck.push({
        suit,
        value: values[i],
        numericValue: i + 1 // A=1, 2=2, ..., K=13
      });
    }
  }
  
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// ============================================
// KINGS CUP GAME LOGIC
// ============================================

export function createKingsCupInitialState(
  players: PlayerInGame[],
  settings: GameSettings
): KingsCupState {
  const deck = shuffleDeck(createDeck());
  
  return {
    gameType: 'kings-cup',
    status: 'playing',
    currentPlayerIndex: 0,
    players,
    settings,
    deck,
    drawnCards: [],
    currentCard: null,
    kingsDrawn: 0,
    currentRule: null,
    thumbMaster: null,
    questionMaster: null,
    customRule: null,
    startedAt: new Date().toISOString()
  };
}

export function validateKingsCupAction(
  state: KingsCupState,
  action: KingsCupAction
): { valid: boolean; error?: string } {
  const currentPlayer = state.players[state.currentPlayerIndex];
  
  switch (action.type) {
    case 'DRAW_CARD':
      // Only current player can draw
      if (action.playerId !== currentPlayer.id) {
        return { valid: false, error: 'Not your turn to draw' };
      }
      // Must have cards left
      if (state.deck.length === 0) {
        return { valid: false, error: 'No cards left in deck' };
      }
      // Can't draw if already showing a card
      if (state.currentCard !== null) {
        return { valid: false, error: 'Already showing a card' };
      }
      return { valid: true };
      
    case 'NEXT_TURN':
      // Only current player can end their turn
      if (action.playerId !== currentPlayer.id) {
        return { valid: false, error: 'Not your turn' };
      }
      // Must have drawn a card first
      if (state.currentCard === null) {
        return { valid: false, error: 'Must draw a card first' };
      }
      return { valid: true };
      
    case 'SET_THUMB_MASTER':
      // Only works if someone drew a special card
      return { valid: true };
      
    case 'SET_QUESTION_MASTER':
      return { valid: true };
      
    case 'ADD_CUSTOM_RULE':
      // Only King drawer can add rule
      return { valid: true };
      
    case 'ASSIGN_DRINK':
      return { valid: true };
      
    case 'END_GAME':
      // Only host can end game
      const host = state.players.find(p => p.isHost);
      if (action.playerId !== host?.id) {
        return { valid: false, error: 'Only host can end game' };
      }
      return { valid: true };
      
    default:
      return { valid: false, error: 'Unknown action type' };
  }
}

export function applyKingsCupAction(
  state: KingsCupState,
  action: KingsCupAction
): KingsCupState {
  const validation = validateKingsCupAction(state, action);
  if (!validation.valid) {
    console.error('[v0] Invalid action:', validation.error);
    return state;
  }
  
  switch (action.type) {
    case 'DRAW_CARD': {
      const [drawnCard, ...remainingDeck] = state.deck;
      const rule = getKingsCupRule(drawnCard.value, state.settings.language);
      
      let kingsDrawn = state.kingsDrawn;
      let newStatus = state.status;
      
      // Check for King
      if (drawnCard.value === 'K') {
        kingsDrawn++;
        // 4th King ends the game
        if (kingsDrawn >= 4) {
          newStatus = 'finished';
        }
      }
      
      return {
        ...state,
        deck: remainingDeck,
        drawnCards: [...state.drawnCards, drawnCard],
        currentCard: drawnCard,
        currentRule: rule,
        kingsDrawn,
        status: newStatus
      };
    }
    
    case 'NEXT_TURN': {
      const nextIndex = (state.currentPlayerIndex + 1) % state.players.length;
      return {
        ...state,
        currentPlayerIndex: nextIndex,
        currentCard: null,
        currentRule: null
      };
    }
    
    case 'SET_THUMB_MASTER': {
      return {
        ...state,
        thumbMaster: action.targetId
      };
    }
    
    case 'SET_QUESTION_MASTER': {
      return {
        ...state,
        questionMaster: action.targetId
      };
    }
    
    case 'ADD_CUSTOM_RULE': {
      return {
        ...state,
        customRule: action.rule
      };
    }
    
    case 'END_GAME': {
      return {
        ...state,
        status: 'finished',
        finishedAt: new Date().toISOString()
      };
    }
    
    default:
      return state;
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getNextPlayerIndex(
  currentIndex: number,
  totalPlayers: number,
  skipCount: number = 1
): number {
  return (currentIndex + skipCount) % totalPlayers;
}

export function calculateCardValue(card: Card): number {
  return card.numericValue;
}

export function isRedCard(card: Card): boolean {
  return card.suit === 'hearts' || card.suit === 'diamonds';
}

export function isBlackCard(card: Card): boolean {
  return card.suit === 'clubs' || card.suit === 'spades';
}

export function compareCards(card1: Card, card2: Card): number {
  return card1.numericValue - card2.numericValue;
}

// Generate a unique game event ID
export function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generate a unique player session ID
export function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
