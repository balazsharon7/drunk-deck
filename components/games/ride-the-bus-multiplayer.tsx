'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useGame } from '@/lib/game-context';
import { createDeck, shuffleDeck, drawCard, getCardColor } from '@/lib/deck';
import type { Card } from '@/lib/game-types';
import { PlayingCard } from '@/components/playing-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Bus, ArrowLeft, RotateCcw, Wine, Wifi, WifiOff, Users,
  ArrowUp, ArrowDown, Circle, Trophy, Check, X,
  MessageCircle, Send,
} from 'lucide-react';

// ── TYPES ──

interface OnlinePlayer {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isOnline?: boolean;
}

interface PlayerCards {
  playerId: string;
  cards: Card[];
  totalSips: number;
}

type GamePhase =
  | 'red-black'
  | 'higher-lower'
  | 'inside-outside'
  | 'suit-guess'
  | 'bus-ride'
  | 'game-over';

interface BusGameState {
  partyId: string;
  gameType: string;
  deck: Card[];
  phase: GamePhase;
  currentPlayerIndex: number;
  currentRound: number;          // 1-4
  players: OnlinePlayer[];
  playerCards: PlayerCards[];     // each player's drawn cards
  drawnCard: Card | null;        // currently revealed card
  lastGuessCorrect: boolean | null;
  busRider: string | null;       // who rides the bus
  busPyramid: Card[];            // 10 cards for bus ride
  busRevealed: boolean[];
  busProgress: number;
  busCurrentCard: Card | null;
  busTotalSips: number;
  version: number;
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

// ── HELPERS ──

function getBusCardValue(card: Card): number {
  if (card.value === 'A') return 1;
  if (card.value === 'J') return 11;
  if (card.value === 'Q') return 12;
  if (card.value === 'K') return 13;
  return parseInt(card.value, 10);
}

// ── COMPONENT ──

interface RideTheBusMultiplayerProps {
  partyId: string;
  playerId: string;
  playerName: string;
  isHost: boolean;
  initialPlayers: OnlinePlayer[];
  onBack: () => void;
}

export function RideTheBusMultiplayer({
  partyId,
  playerId,
  playerName,
  isHost,
  initialPlayers,
  onBack,
}: RideTheBusMultiplayerProps) {
  const supabase = createClient();
  const { language } = useGame();
  const t = language === 'hu';

  // Game state
  const [gameState, setGameState] = useState<BusGameState | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Multiplayer
  const [players, setPlayers] = useState<OnlinePlayer[]>(initialPlayers);
  const [onlinePlayers, setOnlinePlayers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const channelRef = useRef<RealtimeChannel | null>(null);

  // Derived
  const currentPlayer = gameState ? players[gameState.currentPlayerIndex] : null;
  const isMyTurn = currentPlayer?.id === playerId;
  const myCards = gameState?.playerCards.find(pc => pc.playerId === playerId);

  // ── REALTIME SETUP ──

  useEffect(() => {
    const channel = supabase.channel(`bus:${partyId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: playerId },
      },
    });

    channel.on('broadcast', { event: 'state_update' }, ({ payload }) => {
      if (payload) {
        setGameState(payload as BusGameState);
        if (payload.players) setPlayers(payload.players);
      }
    });

    channel.on('broadcast', { event: 'chat_message' }, ({ payload }) => {
      if (payload) {
        const msg = payload as ChatMessage;
        setChatMessages(prev => [...prev.slice(-99), msg]);
        if (!showChat && msg.playerId !== playerId) {
          setUnreadMessages(prev => prev + 1);
        }
      }
    });

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const online = new Set<string>();
      Object.values(state).forEach((presences) => {
        (presences as Record<string, unknown>[]).forEach((p) => {
          if (p.playerId) online.add(p.playerId as string);
        });
      });
      setOnlinePlayers(online);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setIsConnected(true);
        await channel.track({ playerId, playerName, isHost, joinedAt: new Date().toISOString() });
      } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
        setIsConnected(false);
      }
    });

    channelRef.current = channel;

    if (isHost) {
      initializeGame(channel);
    } else {
      loadGameState();
    }

    return () => { channel.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyId, playerId, isHost]);

  // ── STATE MANAGEMENT ──

  const initializeGame = async (channel?: RealtimeChannel) => {
    const deck = shuffleDeck(createDeck());
    const initial: BusGameState = {
      partyId,
      gameType: 'ride-the-bus',
      deck,
      phase: 'red-black',
      currentPlayerIndex: 0,
      currentRound: 1,
      players: initialPlayers,
      playerCards: initialPlayers.map(p => ({ playerId: p.id, cards: [], totalSips: 0 })),
      drawnCard: null,
      lastGuessCorrect: null,
      busRider: null,
      busPyramid: [],
      busRevealed: [],
      busProgress: 0,
      busCurrentCard: null,
      busTotalSips: 0,
      version: 1,
    };
    setGameState(initial);

    try {
      await supabase.from('game_states').upsert({
        party_id: partyId,
        game_type: 'ride-the-bus',
        state: initial,
        version: 1,
        host_id: playerId,
        status: 'playing',
        updated_at: new Date().toISOString(),
      });
    } catch {}

    const ch = channel || channelRef.current;
    if (ch) {
      await ch.send({ type: 'broadcast', event: 'state_update', payload: initial });
    }
  };

  const loadGameState = async () => {
    try {
      const { data } = await supabase
        .from('game_states')
        .select('state')
        .eq('party_id', partyId)
        .maybeSingle();
      if (data?.state) {
        const state = data.state as BusGameState;
        setGameState(state);
        if (state.players) setPlayers(state.players);
      }
    } catch {}
  };

  const broadcastAndSave = async (newState: BusGameState) => {
    try {
      await supabase.from('game_states').update({
        state: newState,
        version: newState.version,
        updated_at: new Date().toISOString(),
      }).eq('party_id', partyId);
    } catch {}

    if (channelRef.current) {
      await channelRef.current.send({
        type: 'broadcast',
        event: 'state_update',
        payload: newState,
      });
    }
  };

  // ── GAME ACTIONS ──

  const handleGuess = useCallback(async (guess: string) => {
    if (!gameState || isAnimating || !isMyTurn) return;
    setIsAnimating(true);

    const { card, remainingDeck } = drawCard(gameState.deck);
    if (!card) { setIsAnimating(false); return; }

    const playerCard = gameState.playerCards.find(pc => pc.playerId === playerId);
    const myCurrentCards = playerCard?.cards || [];
    let isCorrect = false;

    switch (gameState.phase) {
      case 'red-black':
        isCorrect = getCardColor(card) === guess;
        break;
      case 'higher-lower':
        if (myCurrentCards.length > 0) {
          const prev = getBusCardValue(myCurrentCards[myCurrentCards.length - 1]);
          const curr = getBusCardValue(card);
          isCorrect = guess === 'higher' ? curr >= prev : curr <= prev;
        }
        break;
      case 'inside-outside':
        if (myCurrentCards.length >= 2) {
          const v1 = getBusCardValue(myCurrentCards[0]);
          const v2 = getBusCardValue(myCurrentCards[1]);
          const min = Math.min(v1, v2);
          const max = Math.max(v1, v2);
          const curr = getBusCardValue(card);
          isCorrect = guess === 'inside' ? (curr > min && curr < max) : (curr <= min || curr >= max);
        }
        break;
      case 'suit-guess':
        const suits = new Set(myCurrentCards.map(c => c.suit));
        isCorrect = guess === 'yes' ? suits.has(card.suit) : !suits.has(card.suit);
        break;
    }

    // Update player cards
    const newPlayerCards = gameState.playerCards.map(pc => {
      if (pc.playerId === playerId) {
        return {
          ...pc,
          cards: [...pc.cards, card],
          totalSips: isCorrect ? pc.totalSips : pc.totalSips + 1,
        };
      }
      return pc;
    });

    // Show result
    const resultState: BusGameState = {
      ...gameState,
      deck: remainingDeck,
      drawnCard: card,
      lastGuessCorrect: isCorrect,
      playerCards: newPlayerCards,
      version: gameState.version + 1,
    };
    setGameState(resultState);
    await broadcastAndSave(resultState);

    // After delay, advance to next player or phase
    setTimeout(async () => {
      let nextPlayerIndex = gameState.currentPlayerIndex;
      let nextRound = gameState.currentRound;
      let nextPhase = gameState.phase;

      if (nextPlayerIndex < players.length - 1) {
        nextPlayerIndex++;
      } else {
        nextPlayerIndex = 0;
        if (nextRound < 4) {
          nextRound++;
          const phases: GamePhase[] = ['red-black', 'higher-lower', 'inside-outside', 'suit-guess'];
          nextPhase = phases[nextRound - 1];
        } else {
          // Move to bus ride - find rider with most cards
          let maxCards = 0;
          let rider = players[0]?.name || '';
          newPlayerCards.forEach(pc => {
            if (pc.cards.length > maxCards) {
              maxCards = pc.cards.length;
              rider = players.find(p => p.id === pc.playerId)?.name || rider;
            }
          });

          // Build bus pyramid (10 cards)
          let busDeck = remainingDeck;
          const busCards: Card[] = [];
          for (let i = 0; i < 10; i++) {
            const { card: bc, remainingDeck: rd } = drawCard(busDeck);
            if (bc) { busCards.push(bc); busDeck = rd; }
          }

          const busState: BusGameState = {
            ...gameState,
            deck: busDeck,
            phase: 'bus-ride',
            currentPlayerIndex: 0,
            currentRound: nextRound,
            playerCards: newPlayerCards,
            drawnCard: null,
            lastGuessCorrect: null,
            busRider: rider,
            busPyramid: busCards,
            busRevealed: busCards.map((_, i) => i === 0),
            busProgress: 1,
            busCurrentCard: busCards[0] || null,
            busTotalSips: 0,
            version: resultState.version + 1,
          };
          setGameState(busState);
          setIsAnimating(false);
          await broadcastAndSave(busState);
          return;
        }
      }

      const advancedState: BusGameState = {
        ...gameState,
        deck: remainingDeck,
        phase: nextPhase,
        currentPlayerIndex: nextPlayerIndex,
        currentRound: nextRound,
        playerCards: newPlayerCards,
        drawnCard: null,
        lastGuessCorrect: null,
        version: resultState.version + 1,
      };
      setGameState(advancedState);
      setIsAnimating(false);
      await broadcastAndSave(advancedState);
    }, 2000);
  }, [gameState, isAnimating, isMyTurn, playerId, players]);

  const handleBusGuess = useCallback(async (guess: 'higher' | 'lower') => {
    if (!gameState || !gameState.busCurrentCard || gameState.busProgress >= 10) return;

    const nextCard = gameState.busPyramid[gameState.busProgress];
    if (!nextCard) return;

    const prevVal = getBusCardValue(gameState.busCurrentCard);
    const currVal = getBusCardValue(nextCard);

    let isCorrect = false;
    if (currVal === prevVal) {
      isCorrect = true; // same = everyone drinks but continue
    } else {
      isCorrect = guess === 'higher' ? currVal > prevVal : currVal < prevVal;
    }

    const newRevealed = [...gameState.busRevealed];
    newRevealed[gameState.busProgress] = true;

    if (isCorrect) {
      const newProgress = gameState.busProgress + 1;
      const newState: BusGameState = {
        ...gameState,
        busRevealed: newRevealed,
        busProgress: newProgress,
        busCurrentCard: nextCard,
        lastGuessCorrect: true,
        drawnCard: nextCard,
        phase: newProgress >= 10 ? 'game-over' : 'bus-ride',
        version: gameState.version + 1,
      };
      setGameState(newState);
      await broadcastAndSave(newState);
    } else {
      // Wrong - restart from beginning, add sip
      const resetRevealed = gameState.busPyramid.map((_, i) => i === 0);
      const newState: BusGameState = {
        ...gameState,
        busRevealed: newRevealed, // show wrong card briefly
        lastGuessCorrect: false,
        drawnCard: nextCard,
        busTotalSips: gameState.busTotalSips + 1,
        version: gameState.version + 1,
      };
      setGameState(newState);
      await broadcastAndSave(newState);

      // After delay reset to beginning
      setTimeout(async () => {
        const resetState: BusGameState = {
          ...newState,
          busRevealed: resetRevealed,
          busProgress: 1,
          busCurrentCard: gameState.busPyramid[0],
          lastGuessCorrect: null,
          drawnCard: null,
          version: newState.version + 1,
        };
        setGameState(resetState);
        await broadcastAndSave(resetState);
      }, 2000);
    }
  }, [gameState, partyId]);

  const handleNewGame = useCallback(async () => {
    await initializeGame();
  }, []);

  const sendChatMessage = useCallback(async () => {
    if (!chatInput.trim() || !channelRef.current) return;
    const msg: ChatMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      playerId, playerName, message: chatInput.trim(), timestamp: Date.now(),
    };
    setChatMessages(prev => [...prev.slice(-99), msg]);
    setChatInput('');
    await channelRef.current.send({ type: 'broadcast', event: 'chat_message', payload: msg });
  }, [chatInput, playerId, playerName]);

  // ── RENDER ──

  if (!gameState) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-3 border-amber-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-amber-400">{t ? 'Csatlakozas...' : 'Connecting...'}</p>
        </div>
      </div>
    );
  }

  const phaseTitle = () => {
    switch (gameState.phase) {
      case 'red-black': return t ? 'Piros vagy Fekete?' : 'Red or Black?';
      case 'higher-lower': return t ? 'Magasabb vagy Alacsonyabb?' : 'Higher or Lower?';
      case 'inside-outside': return t ? 'Kozte vagy Kivul?' : 'Inside or Outside?';
      case 'suit-guess': return t ? 'Van mar ilyen szin?' : 'Do you have this suit?';
      case 'bus-ride': return t ? `${gameState.busRider} buszozik!` : `${gameState.busRider} rides the bus!`;
      case 'game-over': return t ? 'Jatek vege!' : 'Game Over!';
    }
  };

  const isCardPhase = ['red-black', 'higher-lower', 'inside-outside', 'suit-guess'].includes(gameState.phase);
  const isBusRider = gameState.busRider && players.find(p => p.name === gameState.busRider)?.id === playerId;

  return (
    <div className="min-h-screen flex flex-col safe-area-top safe-area-bottom bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <Button variant="ghost" onClick={onBack} className="text-amber-400/70 hover:text-amber-400">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t ? 'Vissza' : 'Back'}
        </Button>
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
            isConnected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          )}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 text-xs">
            <Users className="w-3 h-3" />
            {onlinePlayers.size}/{players.length}
          </div>
          {isCardPhase && (
            <div className="text-sm text-amber-400/70">
              {t ? 'Kor' : 'Round'} {gameState.currentRound}/4
            </div>
          )}
          <Button
            variant="ghost" size="sm"
            onClick={() => { setShowChat(!showChat); setUnreadMessages(0); }}
            className="relative text-amber-400/70 hover:text-amber-400"
          >
            <MessageCircle className="w-5 h-5" />
            {unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadMessages}
              </span>
            )}
          </Button>
        </div>
      </header>

      {/* Phase title */}
      <div className="text-center px-4 pb-2">
        <h3 className="text-xl font-bold text-amber-400">{phaseTitle()}</h3>
        {isCardPhase && (
          <>
            <p className="text-amber-400/60 text-sm mt-1">
              {t ? 'Soron kovetkezik' : 'Current turn'}
            </p>
            <h2 className={cn("text-2xl font-bold", isMyTurn ? "text-amber-300 animate-pulse" : "text-white")}>
              {currentPlayer?.name}
              {isMyTurn && <span className="ml-2 text-amber-400">{'(Te!)'}</span>}
            </h2>
          </>
        )}
      </div>

      {/* Player strip */}
      <div className="flex justify-center gap-2 px-4 py-2 overflow-x-auto">
        {players.map((player, index) => {
          const pc = gameState.playerCards.find(c => c.playerId === player.id);
          return (
            <div
              key={player.id}
              className={cn(
                "flex flex-col items-center px-3 py-2 rounded-lg transition-all",
                isCardPhase && index === gameState.currentPlayerIndex
                  ? "bg-amber-500/20 border border-amber-500/50"
                  : "bg-white/5",
                !onlinePlayers.has(player.id) && "opacity-50"
              )}
            >
              <span className="text-lg">{player.avatar}</span>
              <span className={cn(
                "text-xs truncate max-w-16",
                isCardPhase && index === gameState.currentPlayerIndex ? "text-amber-400" : "text-white/70"
              )}>
                {player.name}
              </span>
              <span className="text-[10px] text-amber-400/50">{pc?.cards.length || 0} lap</span>
            </div>
          );
        })}
      </div>

      {/* Main game area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 gap-4">
        {/* Card collection phases */}
        {isCardPhase && (
          <>
            {/* Show drawn card result */}
            {gameState.drawnCard && (
              <div className="flex flex-col items-center gap-3">
                <PlayingCard card={gameState.drawnCard} size="xl" isAnimating />
                {gameState.lastGuessCorrect !== null && (
                  <div className={cn(
                    "px-4 py-2 rounded-full font-bold text-sm",
                    gameState.lastGuessCorrect
                      ? "bg-green-500/20 text-green-400"
                      : "bg-red-500/20 text-red-400"
                  )}>
                    {gameState.lastGuessCorrect
                      ? (t ? 'Helyes!' : 'Correct!')
                      : (t ? 'Rossz! Igyel 1 kortyot!' : 'Wrong! Drink 1 sip!')}
                  </div>
                )}
              </div>
            )}

            {/* My cards */}
            {myCards && myCards.cards.length > 0 && !gameState.drawnCard && (
              <div className="bg-white/5 rounded-2xl p-4 border border-amber-500/20 w-full max-w-sm">
                <p className="text-sm text-center text-amber-400/70 mb-2">
                  {t ? 'A te lapjaid' : 'Your cards'}
                </p>
                <div className="flex gap-1 justify-center flex-wrap">
                  {myCards.cards.map((c, i) => (
                    <PlayingCard key={i} card={c} size="sm" />
                  ))}
                </div>
              </div>
            )}

            {/* Guess buttons */}
            {isMyTurn && !gameState.drawnCard && !isAnimating && (
              <div className="w-full max-w-sm space-y-3">
                {gameState.phase === 'red-black' && (
                  <div className="flex gap-3">
                    <Button onClick={() => handleGuess('red')} className="flex-1 h-14 bg-red-600 hover:bg-red-700 text-white font-bold text-lg">
                      {t ? 'Piros' : 'Red'}
                    </Button>
                    <Button onClick={() => handleGuess('black')} className="flex-1 h-14 bg-zinc-800 hover:bg-zinc-900 text-white font-bold text-lg border border-zinc-600">
                      {t ? 'Fekete' : 'Black'}
                    </Button>
                  </div>
                )}
                {gameState.phase === 'higher-lower' && (
                  <div className="flex gap-3">
                    <Button onClick={() => handleGuess('higher')} className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white font-bold">
                      <ArrowUp className="w-5 h-5 mr-1" /> {t ? 'Magasabb' : 'Higher'}
                    </Button>
                    <Button onClick={() => handleGuess('lower')} className="flex-1 h-14 bg-orange-600 hover:bg-orange-700 text-white font-bold">
                      <ArrowDown className="w-5 h-5 mr-1" /> {t ? 'Alacsonyabb' : 'Lower'}
                    </Button>
                  </div>
                )}
                {gameState.phase === 'inside-outside' && (
                  <div className="flex gap-3">
                    <Button onClick={() => handleGuess('inside')} className="flex-1 h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold">
                      {t ? 'Kozte' : 'Inside'}
                    </Button>
                    <Button onClick={() => handleGuess('outside')} className="flex-1 h-14 bg-purple-600 hover:bg-purple-700 text-white font-bold">
                      {t ? 'Kivul' : 'Outside'}
                    </Button>
                  </div>
                )}
                {gameState.phase === 'suit-guess' && (
                  <div className="flex gap-3">
                    <Button onClick={() => handleGuess('yes')} className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white font-bold">
                      <Check className="w-5 h-5 mr-1" /> {t ? 'Igen' : 'Yes'}
                    </Button>
                    <Button onClick={() => handleGuess('no')} className="flex-1 h-14 bg-red-600 hover:bg-red-700 text-white font-bold">
                      <X className="w-5 h-5 mr-1" /> {t ? 'Nem' : 'No'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Waiting message */}
            {!isMyTurn && !gameState.drawnCard && (
              <p className="text-amber-400/60 text-sm text-center">
                {t ? `Vard meg ${currentPlayer?.name} lepeset...` : `Waiting for ${currentPlayer?.name}...`}
              </p>
            )}
          </>
        )}

        {/* Bus ride phase */}
        {gameState.phase === 'bus-ride' && (
          <div className="flex flex-col items-center gap-4">
            {/* Bus pyramid display */}
            <div className="flex flex-col items-center gap-2">
              {[
                gameState.busPyramid.slice(9, 10),
                gameState.busPyramid.slice(7, 9),
                gameState.busPyramid.slice(4, 7),
                gameState.busPyramid.slice(0, 4),
              ].map((row, rowIdx) => {
                const rowStarts = [9, 7, 4, 0];
                const startIdx = rowStarts[rowIdx];
                return (
                  <div key={rowIdx} className="flex items-center gap-2 justify-center">
                    {row.map((card, i) => {
                      const cardIdx = startIdx + i;
                      const isRevealed = gameState.busRevealed[cardIdx];
                      const isCurrent = cardIdx === gameState.busProgress - 1;
                      const isNext = cardIdx === gameState.busProgress;
                      return (
                        <div
                          key={i}
                          className={cn(
                            "transition-all duration-300",
                            isCurrent && "ring-2 ring-green-500 rounded-lg scale-105",
                            isNext && "ring-2 ring-amber-400 rounded-lg animate-pulse"
                          )}
                        >
                          <PlayingCard card={isRevealed ? card : undefined} faceDown={!isRevealed} size="md" />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Progress */}
            <div className="flex gap-1">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className={cn(
                  'w-2.5 h-2.5 rounded-full transition-all',
                  i < gameState.busProgress ? 'bg-green-500' : i === gameState.busProgress ? 'bg-amber-400 animate-pulse' : 'bg-white/10'
                )} />
              ))}
            </div>

            {gameState.busTotalSips > 0 && (
              <div className="flex items-center gap-2 bg-red-500/20 px-4 py-2 rounded-full">
                <Wine className="w-4 h-4 text-red-400" />
                <span className="font-bold text-red-400">{gameState.busTotalSips} {t ? 'kortytol' : 'sips'}</span>
              </div>
            )}

            {/* Result feedback */}
            {gameState.lastGuessCorrect !== null && (
              <div className={cn(
                "px-4 py-2 rounded-full font-bold text-sm",
                gameState.lastGuessCorrect ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
              )}>
                {gameState.lastGuessCorrect ? (t ? 'Helyes! Tovabb!' : 'Correct!') : (t ? 'Rossz! Ujrakezdes!' : 'Wrong! Restart!')}
              </div>
            )}

            {/* Bus rider buttons */}
            {isBusRider && gameState.lastGuessCorrect === null && (
              <div className="flex gap-3 w-full max-w-sm">
                <Button onClick={() => handleBusGuess('higher')} className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white font-bold">
                  <ArrowUp className="w-5 h-5 mr-1" /> {t ? 'Magasabb' : 'Higher'}
                </Button>
                <Button onClick={() => handleBusGuess('lower')} className="flex-1 h-14 bg-orange-600 hover:bg-orange-700 text-white font-bold">
                  <ArrowDown className="w-5 h-5 mr-1" /> {t ? 'Alacsonyabb' : 'Lower'}
                </Button>
              </div>
            )}

            {!isBusRider && (
              <p className="text-amber-400/60 text-sm text-center">
                {t ? `${gameState.busRider} buszozik - szurkoljatok!` : `${gameState.busRider} is riding the bus - cheer them on!`}
              </p>
            )}
          </div>
        )}

        {/* Game over */}
        {gameState.phase === 'game-over' && (
          <div className="text-center space-y-4">
            <Trophy className="w-16 h-16 text-amber-400 mx-auto" />
            <h3 className="text-2xl font-bold text-amber-400">{t ? 'Jatek vege!' : 'Game Over!'}</h3>
            {gameState.busRider && (
              <p className="text-white/70">
                {t ? `${gameState.busRider} ${gameState.busTotalSips > 0 ? `ivott ${gameState.busTotalSips} kortyot a buszon` : 'vegigcsinalta a buszt!'}` : `${gameState.busRider} ${gameState.busTotalSips > 0 ? `drank ${gameState.busTotalSips} sips` : 'completed the bus!'}`}
              </p>
            )}
            {/* Scoreboard */}
            <div className="bg-white/5 rounded-2xl p-4 w-full max-w-sm mx-auto border border-amber-500/20">
              <p className="text-sm text-amber-400/70 mb-3">{t ? 'Osszesites' : 'Summary'}</p>
              {gameState.playerCards
                .sort((a, b) => a.totalSips - b.totalSips)
                .map((pc, i) => {
                  const p = players.find(pl => pl.id === pc.playerId);
                  return (
                    <div key={pc.playerId} className="flex items-center justify-between py-2">
                      <span className="text-white/80">{i + 1}. {p?.name || '?'}</span>
                      <span className="text-amber-400 font-bold">{pc.totalSips} {t ? 'kortytol' : 'sips'}</span>
                    </div>
                  );
                })}
            </div>
            {isHost && (
              <Button onClick={handleNewGame} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
                <RotateCcw className="w-4 h-4 mr-2" /> {t ? 'Uj jatek' : 'New Game'}
              </Button>
            )}
          </div>
        )}
      </main>

      {/* Footer actions */}
      <div className="px-4 pb-4">
        {isCardPhase && gameState.drawnCard && isMyTurn && (
          <p className="text-center text-amber-400/40 text-xs">
            {t ? 'A kovetkezo jatekos automatikusan jon...' : 'Next player automatically follows...'}
          </p>
        )}
      </div>

      {/* Chat panel */}
      {showChat && (
        <div className="absolute bottom-20 left-4 right-4 max-h-64 bg-zinc-900/95 backdrop-blur-sm border border-amber-500/30 rounded-xl overflow-hidden flex flex-col z-50">
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chatMessages.length === 0 ? (
              <p className="text-white/50 text-sm text-center">{t ? 'Nincs uzenet meg' : 'No messages yet'}</p>
            ) : (
              chatMessages.map(msg => (
                <div key={msg.id} className={cn("text-sm", msg.playerId === playerId ? "text-right" : "text-left")}>
                  <span className="text-amber-400/70 text-xs">{msg.playerName}: </span>
                  <span className="text-white/90">{msg.message}</span>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2 p-2 border-t border-amber-500/20">
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
              placeholder={t ? 'Uzenet...' : 'Message...'}
              className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none"
            />
            <Button size="sm" onClick={sendChatMessage} className="bg-amber-500 hover:bg-amber-600 text-black">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
