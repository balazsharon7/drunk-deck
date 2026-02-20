// Multiplayer Game Types - Clean version

export type GameType = 'kings-cup' | 'ride-the-bus' | 'blackjack' | 'charades' | 'taboo' | 'rating-game';
export type GameStatus = 'waiting' | 'playing' | 'paused' | 'finished';
export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected' | 'error';

// Player in a game session
export interface PlayerInGame {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isOnline: boolean;
  isReady?: boolean;
  sips?: number;
  score?: number;
  userId?: string;       // Supabase user_id if logged in (null for guests)
  joinedAt?: string;
}

// Game settings
export interface GameSettings {
  language: 'hu' | 'en';
  difficulty?: 'easy' | 'medium' | 'hard';
  timeLimit?: number;
  maxPlayers?: number;
  customRules?: Record<string, unknown>;
}

// Base game state shared by all games
export interface BaseGameState {
  gameType: GameType;
  status: GameStatus;
  currentPlayerIndex: number;
  players: PlayerInGame[];
  settings: GameSettings;
  startedAt?: string;
  finishedAt?: string;
}

// Card type
export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: string;
  numericValue: number;
}

// Kings Cup rule
export interface KingsCupRule {
  card: string;
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  action?: string;
}

// Kings Cup state
export interface KingsCupState extends BaseGameState {
  gameType: 'kings-cup';
  deck: Card[];
  drawnCards: Card[];
  currentCard: Card | null;
  kingsDrawn: number;
  currentRule: KingsCupRule | null;
  thumbMaster: string | null;
  questionMaster: string | null;
  customRule: string | null;
}

// Union type for all game states (extend as more games go online)
export type GameState = KingsCupState;

// Game event types
export type GameEventType =
  | 'game_started'
  | 'game_ended'
  | 'player_joined'
  | 'player_left'
  | 'card_drawn'
  | 'turn_changed'
  | 'rule_activated'
  | 'chat_message'
  | 'drink_assigned';

// Game event
export interface GameEvent {
  id: string;
  partyId: string;
  eventType: GameEventType;
  playerId: string;
  playerName?: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

// Action for game mutations
export interface GameAction {
  type: string;
  playerId: string;
  payload?: Record<string, unknown>;
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

// Multiplayer hook return type
export interface UseMultiplayerReturn<T extends GameState> {
  gameState: T | null;
  players: PlayerInGame[];
  currentPlayer: PlayerInGame | null;
  isMyTurn: boolean;
  connectionStatus: ConnectionStatus;
  error: string | null;
  events: GameEvent[];
  dispatch: (action: GameAction) => Promise<void>;
  sendChatMessage: (message: string) => void;
  startGame: () => Promise<void>;
  endGame: () => Promise<void>;
  leaveGame: () => Promise<void>;
}

// Party info stored in DB
export interface PartyInfo {
  id: string;
  code: string;
  hostId: string;
  gameType: GameType;
  status: GameStatus;
  maxPlayers: number;
  createdAt: string;
  settings: GameSettings;
}
