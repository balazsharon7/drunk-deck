// Card suits and values
export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type CardValue = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

export interface Card {
  suit: Suit;
  value: CardValue;
  id: string;
}

export interface Player {
  id: string;
  name: string;
  sips: number;
  isActive: boolean;
}

export type GameType = 'kings-cup' | 'ride-the-bus' | 'blackjack';

export interface GameState {
  type: GameType;
  players: Player[];
  currentPlayerIndex: number;
  deck: Card[];
  drawnCards: Card[];
  isGameOver: boolean;
}

// Kings Cup specific
export interface KingsCupRule {
  card: CardValue;
  title: string;
  titleHu: string;
  description: string;
  descriptionHu: string;
  sips?: number;
}

// Ride the Bus specific
export type BusPhase = 'red-black' | 'higher-lower' | 'inside-outside' | 'suit' | 'pyramid' | 'bus-ride';

export interface RideTheBusState extends GameState {
  phase: BusPhase;
  pyramidLevel: number;
  pyramidCards: Card[][];
  playerCards: Card[];
  busRider: string | null;
  consecutiveWrong: number;
}

// Blackjack specific
export interface BlackjackHand {
  cards: Card[];
  value: number;
  isBusted: boolean;
  isBlackjack: boolean;
}

export interface BlackjackState extends GameState {
  dealerHand: BlackjackHand;
  playerHands: Map<string, BlackjackHand>;
  currentBets: Map<string, number>;
}

// Language support
export type Language = 'hu' | 'en';

export interface Translations {
  [key: string]: {
    hu: string;
    en: string;
  };
}
