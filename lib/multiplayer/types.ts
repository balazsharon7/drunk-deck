// Multiplayer Game Types
// Based on the architecture from MULTIPLAYER_ARCHITECTURE.md

export type GameType = 'kings-cup' | 'ride-the-bus' | 'blackjack' | 'charades' | 'taboo' | 'rating-game';

export type GameStatus = 'waiting' | 'playing' | 'paused' | 'finished';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

// Base game state that all games share
export interface BaseGameState {
  gameType: GameType;
  status: GameStatus;
  currentPlayerIndex: number;
  players: PlayerInGame[];
  settings: GameSettings;
  startedAt?: string;
  finishedAt?: string;
}

// Player in a game session
export interface PlayerInGame {
  odavaloId?: string;    // Supabase user_id if logged in
  odavaloAvatarUrl?: string;  // Avatar URL if logged in
  odavaloDisplayName?: string; // Display name if logged in
  odavaloEmail?: string;      // Email if logged in
  odavaloIsHost?: boolean;    // Is the host
  odavaloIsReady?: boolean;  // Is ready to start
  odavaloJoinedAt?: string;  // When they joined
  odavaloScore?: number;     // Score in the game
  odavaloSips?: number;      // Sips taken/given
  odavaloLastSeen?: string;  // Last seen timestamp for presence
  id: string;           // Unique player ID for this session
  odavaloName?: string;       // Display name for this game
  name: string;          // Display name for this game  
  odavaloAvatar?: string;     // Avatar emoji/icon
  avatar: string;        // Avatar emoji/icon
  isHost: boolean;       // Is the host of the party
  isOnline: boolean;     // Is currently connected
  isReady?: boolean;     // Ready to start (used in lobby)
}

// Game settings
export interface GameSettings {
  difficulty?: 'easy' | 'medium' | 'hard';
  language: 'hu' | 'en';
  customRules?: Record<string, unknown>;
  timeLimit?: number;
  maxPlayers?: number;
}

// Kings Cup specific state
export interface KingsCupState extends BaseGameState {
  gameType: 'kings-cup';
  deck: Card[];
  drawnCards: Card[];
  currentCard: Card | null;
  kingsDrawn: number;
  currentRule: KingsCupRule | null;
  activeRule?: {
    type: 'thumb-master' | 'question-master' | 'rule-maker';
    playerId: string;
    rule?: string;
  };
  thumbMaster: string | null;
  questionMaster: string | null;
  customRule: string | null;
}

// Ride the Bus specific state
export interface RideTheBusState extends BaseGameState {
  gameType: 'ride-the-bus';
  phase: 'round1' | 'round2' | 'round3' | 'round4' | 'bus';
  deck: Card[];
  playerCards: Record<string, Card[]>;
  currentQuestion: string;
  busRider: string | null;
  pyramidCards?: Card[][];
}

// Blackjack specific state
export interface BlackjackState extends BaseGameState {
  gameType: 'blackjack';
  deck: Card[];
  dealerHand: Card[];
  playerHands: Record<string, Card[]>;
  bets: Record<string, number>;
  currentBet: number;
  dealerScore: number;
}

// Charades specific state
export interface CharadesState extends BaseGameState {
  gameType: 'charades';
  currentWord: string;
  category: string;
  timeRemaining: number;
  roundScore: Record<string, number>;
  wordsUsed: string[];
}

// Rating game specific state
export interface RatingGameState extends BaseGameState {
  gameType: 'rating-game';
  currentPrompt: string;
  playerAnswers: Record<string, { answer: string; rating: number }>;
  guesserId: string;
  revealedAnswers: string[];
}

// Card type
export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: string;
  numericValue: number;
}

// Kings Cup rule type
export interface KingsCupRule {
  card: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  action?: string;
}

// Union type for all game states
export type GameState = KingsCupState | RideTheBusState | BlackjackState | CharadesState | RatingGameState;

// Game event types for the event log
export type GameEventType = 
  | 'game_started'
  | 'game_ended'
  | 'player_joined'
  | 'player_left'
  | 'card_drawn'
  | 'turn_changed'
  | 'rule_activated'
  | 'player_action'
  | 'chat_message'
  | 'drink_assigned'
  | 'custom_event';

// Game event
export interface GameEvent {
  id: string;
  partyId: string;
  eventType: GameEventType;
  playerId: string;
  payload: Record<string, unknown>;
  timestamp: string;
  sequence: number;
}

// Action types for game mutations
export interface GameAction {
  type: string;
  playerId: string;
  payload?: Record<string, unknown>;
  timestamp?: string;
}

// Kings Cup specific actions
export type KingsCupAction = 
  | { type: 'DRAW_CARD'; playerId: string }
  | { type: 'NEXT_TURN'; playerId: string }
  | { type: 'SET_THUMB_MASTER'; playerId: string; targetId: string }
  | { type: 'SET_QUESTION_MASTER'; playerId: string; targetId: string }
  | { type: 'ADD_CUSTOM_RULE'; playerId: string; rule: string }
  | { type: 'ASSIGN_DRINK'; playerId: string; targetId: string; amount: number }
  | { type: 'END_GAME'; playerId: string };

// Ride the Bus specific actions
export type RideTheBusAction =
  | { type: 'GUESS_COLOR'; playerId: string; guess: 'red' | 'black' }
  | { type: 'GUESS_HIGHER_LOWER'; playerId: string; guess: 'higher' | 'lower' }
  | { type: 'GUESS_INSIDE_OUTSIDE'; playerId: string; guess: 'inside' | 'outside' }
  | { type: 'GUESS_SUIT'; playerId: string; guess: Card['suit'] }
  | { type: 'NEXT_ROUND'; playerId: string }
  | { type: 'START_BUS'; playerId: string };

// Multiplayer hook return type
export interface UseMultiplayerReturn<T extends GameState> {
  // State
  gameState: T | null;
  players: PlayerInGame[];
  currentPlayer: PlayerInGame | null;
  isMyTurn: boolean;
  connectionStatus: ConnectionStatus;
  error: string | null;
  
  // Actions
  dispatch: (action: GameAction) => Promise<void>;
  sendChatMessage: (message: string) => void;
  
  // Lifecycle
  startGame: () => Promise<void>;
  endGame: () => Promise<void>;
  leaveGame: () => Promise<void>;
}

// Party/Room info
export interface PartyInfo {
  id: string;
  code: string;
  hostId: string;
  gameType: GameType;
  status: GameStatus;
  maxPlayers: number;
  isPrivate: boolean;
  createdAt: string;
  settings: GameSettings;
}

// Presence info for a player
export interface PlayerPresence {
  odavaloUserId?: string;
  odavaloIsOnline?: boolean;
odavaloLastSeen?: string;
odavaloDeviceId?: string;
odavaloStatus?: 'active' | 'away' | 'disconnected';
odavaloJoinedAt?: string;
  odavaloUserId?: string;
  odavaloIsOnline?: boolean;
  odavaloLastSeen?: string;
  odavaloDeviceId?: string;
  odavaloStatus?: 'active' | 'away' | 'disconnected';
  playerId: string
  odavaloJoinedAt?: string
  odavaloUserId?: string
  odavaloIsOnline?: boolean
  odavaloLastSeen?: string
  odavaloDeviceId?: string
  odavaloStatus?: 'active' | 'away' | 'disconnected'
  odavaloPlayerId?: string
  odavaloPartyId?: string
  userId?: string;
  odavaloIsOnline?: boolean;
  odavaloLastSeen?: string;
  odavaloDeviceId?: string;
  odavaloStatus?: 'active' | 'away' | 'disconnected';
  odavaloJoinedAt?: string;
  odavaloPartyId?: string;
  odavaloPlayerId?: string;
  odavaloPlayerName?: string;
  isOnline: boolean;
  lastSeen: string;
  odavaloDeviceId?: string;
  status: 'active' | 'away' | 'disconnected';
}

// API response types
export interface GameActionResponse {
  success: boolean;
  newState?: GameState;
  event?: GameEvent;
  error?: string;
}
