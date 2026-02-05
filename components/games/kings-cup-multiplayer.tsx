'use client';

import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useGame } from '@/lib/game-context';
import { t } from '@/lib/translations';
import { createDeck, shuffleDeck } from '@/lib/deck';
import { getKingsCupRule } from '@/lib/kings-cup-rules';
import type { Card } from '@/lib/game-types';
import { PlayingCard } from '@/components/playing-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Crown, ArrowLeft, RotateCcw, Wine, Wifi, WifiOff, Users, Send, MessageCircle } from 'lucide-react';

// ============================================
// TYPES
// ============================================

interface KingsCupState {
  partyId: string;
  deck: Card[];
  drawnCards: string[];
  currentPlayerIndex: number;
  kingsDrawn: number;
  phase: 'waiting' | 'playing' | 'finished';
  currentCard: Card | null;
  lastKingPlayer: string | null;
  version: number;
}

interface PlayerAction {
  type: 'DRAW_CARD' | 'NEXT_TURN' | 'NEW_GAME';
  playerId: string;
  cardIndex?: number;
  timestamp: number;
  eventId: string;
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

interface OnlinePlayer {
  odavaloPlayerId: string;
  odavaloPlayerName: string;
  playerId: string;
  playerName: string;
  odavaloIsOnline: boolean;
  isOnline: boolean;
  odavaloAvatar: string;
  avatar: string;
}

// ============================================
// MULTIPLAYER COMPONENT
// ============================================

interface KingsCupMultiplayerProps {
  partyId: string;
  playerId: string;
  playerName: string;
  isHost: boolean;
  initialPlayers: Array<{ id: string; name: string; avatar: string; isHost: boolean }>;
  onBack: () => void;
}

export function KingsCupMultiplayer({ 
  partyId, 
  playerId,
  playerName,
  isHost,
  initialPlayers,
  onBack 
}: KingsCupMultiplayerProps) {
  const supabase = createClient();
  const { language } = useGame();
  
  // Game state
  const [gameState, setGameState] = useState<KingsCupState | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showRule, setShowRule] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Multiplayer state
  const [players, setPlayers] = useState(initialPlayers);
  const [onlinePlayers, setOnlinePlayers] = useState<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const [pendingActions, setPendingActions] = useState<Map<string, PlayerAction>>(new Map());
  const [error, setError] = useState<string | null>(null);
  
  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  
  // Refs
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);

  // Current player info
  const currentPlayer = gameState ? players[gameState.currentPlayerIndex] : null;
  const isMyTurn = currentPlayer?.id === playerId;
  const rule = selectedCard ? getKingsCupRule(selectedCard.value) : null;
  const remainingCards = gameState?.deck.length || 0;
  const isGameOver = remainingCards === 0 || (gameState?.kingsDrawn || 0) >= 4;

  // Card positions in circle
  const cardPositions = useMemo(() => {
    const totalCards = gameState?.deck.length || 52;
    const radius = 145;
    
    return Array.from({ length: totalCards }).map((_, index) => {
      const angle = (index / Math.max(totalCards, 1)) * 2 * Math.PI - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const rotation = (angle * 180 / Math.PI) + 90;
      return { x, y, rotation };
    });
  }, [gameState?.deck.length]);

  // ============================================
  // REALTIME SETUP
  // ============================================

  useEffect(() => {
    const setupChannels = async () => {
      try {
        // Game channel for state sync
        const gameChannel = supabase
          .channel(`game:${partyId}`, {
            config: { broadcast: { self: true } }
          })
          .on('broadcast', { event: 'state_update' }, (payload) => {
            console.log('[v0] State update received:', payload);
            handleStateUpdate(payload.payload as KingsCupState);
          })
          .on('broadcast', { event: 'chat_message' }, (payload) => {
            console.log('[v0] Chat message received:', payload);
            handleChatMessage(payload.payload as ChatMessage);
          })
          .subscribe((status) => {
            console.log('[v0] Game channel status:', status);
            if (status === 'SUBSCRIBED') {
              setIsConnected(true);
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
              setIsConnected(false);
            }
          });

        channelRef.current = gameChannel;

        // Presence channel for player tracking
        const presenceChannel = supabase
          .channel(`presence:${partyId}`)
          .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState();
            const online = new Set<string>();
            Object.values(state).forEach((presences: unknown[]) => {
              presences.forEach((p: unknown) => {
                const presence = p as OnlinePlayer;
                online.add(presence.odavaloPlayerId || presence.playerId);
              });
            });
            setOnlinePlayers(online);
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              await presenceChannel.track({
                odavaloPlayerId: playerId,
                odavaloPlayerName: playerName,
                playerId: playerId,
                playerName: playerName,
                odavaloIsOnline: true,
                isOnline: true
              });
            }
          });

        presenceChannelRef.current = presenceChannel;

        // Initialize or load game state
        if (isHost) {
          await initializeGame();
        } else {
          await loadGameState();
        }

      } catch (err) {
        console.error('[v0] Channel setup error:', err);
        setError('Failed to connect to game');
      }
    };

    setupChannels();

    return () => {
      channelRef.current?.unsubscribe();
      presenceChannelRef.current?.unsubscribe();
    };
  }, [partyId, playerId, isHost]);

  // ============================================
  // GAME STATE MANAGEMENT
  // ============================================

  const initializeGame = async () => {
    const initialDeck = shuffleDeck(createDeck());
    const initialState: KingsCupState = {
      partyId,
      deck: initialDeck,
      drawnCards: [],
      currentPlayerIndex: 0,
      kingsDrawn: 0,
      phase: 'playing',
      currentCard: null,
      lastKingPlayer: null,
      version: 1
    };
    
    setGameState(initialState);
    
    // Broadcast initial state
    await channelRef.current?.send({
      type: 'broadcast',
      event: 'state_update',
      payload: initialState
    });

    // Save to database
    try {
      await supabase.from('game_states').upsert({
        party_id: partyId,
        game_type: 'kings-cup',
        state: initialState,
        version: 1,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      console.error('[v0] Failed to save initial state:', err);
    }
  };

  const loadGameState = async () => {
    try {
      const { data, error } = await supabase
        .from('game_states')
        .select('*')
        .eq('party_id', partyId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      
      if (data?.state) {
        setGameState(data.state as KingsCupState);
      }
    } catch (err) {
      console.error('[v0] Failed to load game state:', err);
      // Wait for host to broadcast state
    }
  };

  const handleStateUpdate = (newState: KingsCupState) => {
    const startTime = Date.now();
    setGameState(newState);
    setLatency(Date.now() - startTime);
    
    // Clear pending actions that have been applied
    setPendingActions(new Map());
  };

  const handleChatMessage = (message: ChatMessage) => {
    setChatMessages(prev => [...prev, message]);
    if (!showChat && message.playerId !== playerId) {
      setUnreadMessages(prev => prev + 1);
    }
  };

  // ============================================
  // PLAYER ACTIONS
  // ============================================

  const handleSelectCard = useCallback(async (cardIndex: number) => {
    if (!gameState || isAnimating || !isMyTurn || selectedCard) return;

    const eventId = `${playerId}-${Date.now()}`;
    const action: PlayerAction = {
      type: 'DRAW_CARD',
      playerId,
      cardIndex,
      timestamp: Date.now(),
      eventId
    };

    // Optimistic update
    setIsAnimating(true);
    setPendingActions(prev => new Map(prev).set(eventId, action));
    
    const card = gameState.deck[cardIndex];
    
    // Update local state optimistically
    const newDeck = [...gameState.deck];
    newDeck.splice(cardIndex, 1);
    
    let newKingsDrawn = gameState.kingsDrawn;
    let newLastKingPlayer = gameState.lastKingPlayer;
    
    if (card.value === 'K') {
      newKingsDrawn++;
      newLastKingPlayer = playerName;
    }
    
    const newState: KingsCupState = {
      ...gameState,
      deck: newDeck,
      drawnCards: [...gameState.drawnCards, card.id],
      currentCard: card,
      kingsDrawn: newKingsDrawn,
      lastKingPlayer: newLastKingPlayer,
      version: gameState.version + 1
    };

    setGameState(newState);
    setSelectedCard(card);
    
    setTimeout(() => {
      setShowRule(true);
      setIsAnimating(false);
    }, 300);

    // Broadcast state update
    try {
      await channelRef.current?.send({
        type: 'broadcast',
        event: 'state_update',
        payload: newState
      });
      
      // Save to database
      await supabase.from('game_states').upsert({
        party_id: partyId,
        game_type: 'kings-cup',
        state: newState,
        version: newState.version,
        updated_at: new Date().toISOString()
      });
      
      setPendingActions(prev => {
        const next = new Map(prev);
        next.delete(eventId);
        return next;
      });
    } catch (err) {
      console.error('[v0] Action failed:', err);
      setError('Failed to sync action');
      // Rollback
      await loadGameState();
    }
  }, [gameState, isAnimating, isMyTurn, selectedCard, playerId, playerName, partyId]);

  const handleNextPlayer = useCallback(async () => {
    if (!gameState) return;
    
    const nextIndex = (gameState.currentPlayerIndex + 1) % players.length;
    const newState: KingsCupState = {
      ...gameState,
      currentPlayerIndex: nextIndex,
      currentCard: null,
      version: gameState.version + 1
    };
    
    setGameState(newState);
    setSelectedCard(null);
    setShowRule(false);
    
    // Broadcast and save
    await channelRef.current?.send({
      type: 'broadcast',
      event: 'state_update',
      payload: newState
    });
    
    await supabase.from('game_states').upsert({
      party_id: partyId,
      game_type: 'kings-cup',
      state: newState,
      version: newState.version,
      updated_at: new Date().toISOString()
    });
  }, [gameState, players.length, partyId]);

  const handleNewGame = useCallback(async () => {
    await initializeGame();
    setSelectedCard(null);
    setShowRule(false);
  }, []);

  const sendChatMessage = useCallback(async () => {
    if (!chatInput.trim() || !channelRef.current) return;
    
    const message: ChatMessage = {
      id: `msg-${Date.now()}`,
      playerId,
      playerName,
      message: chatInput.trim(),
      timestamp: Date.now()
    };
    
    setChatInput('');
    
    await channelRef.current.send({
      type: 'broadcast',
      event: 'chat_message',
      payload: message
    });
  }, [chatInput, playerId, playerName]);

  // ============================================
  // RENDER
  // ============================================

  if (!gameState) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-3 border-gold border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gold">Connecting to game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col safe-area-top safe-area-bottom bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <Button variant="ghost" onClick={onBack} className="text-gold/70 hover:text-gold">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back', language)}
        </Button>
        
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
            isConnected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
          )}>
            {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            {latency}ms
          </div>
          
          {/* Online players */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gold/10 text-gold text-xs">
            <Users className="w-3 h-3" />
            {onlinePlayers.size}/{players.length}
          </div>
          
          {/* Card count */}
          <div className="text-sm text-gold/70">
            {remainingCards}/52
          </div>
          
          {/* Chat toggle */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => { setShowChat(!showChat); setUnreadMessages(0); }}
            className="relative text-gold/70 hover:text-gold"
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

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 px-4 py-2 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm text-center">
          {error}
        </div>
      )}

      {/* Pending actions indicator */}
      {pendingActions.size > 0 && (
        <div className="mx-4 mb-2 px-4 py-2 bg-gold/20 border border-gold/50 rounded-lg text-gold text-sm text-center">
          Syncing... ({pendingActions.size})
        </div>
      )}

      {/* Current player indicator */}
      <div className="text-center px-4">
        <p className="text-gold/60 text-sm mb-1">
          {language === 'hu' ? 'Soron kovetkezik' : 'Current turn'}
        </p>
        <h2 className={cn(
          "text-2xl font-bold",
          isMyTurn ? "text-gold animate-pulse" : "text-white"
        )}>
          {currentPlayer?.name}
          {isMyTurn && <span className="ml-2 text-gold">(Te!)</span>}
        </h2>
      </div>

      {/* Players strip */}
      <div className="flex justify-center gap-2 px-4 py-3 overflow-x-auto">
        {players.map((player, index) => (
          <div 
            key={player.id}
            className={cn(
              "flex flex-col items-center px-3 py-2 rounded-lg transition-all",
              index === gameState.currentPlayerIndex 
                ? "bg-gold/20 border border-gold/50" 
                : "bg-white/5",
              !onlinePlayers.has(player.id) && "opacity-50"
            )}
          >
            <span className="text-lg">{player.avatar}</span>
            <span className={cn(
              "text-xs truncate max-w-16",
              index === gameState.currentPlayerIndex ? "text-gold" : "text-white/70"
            )}>
              {player.name}
            </span>
            {!onlinePlayers.has(player.id) && (
              <span className="text-[10px] text-red-400">offline</span>
            )}
          </div>
        ))}
      </div>

      {/* Main game area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        {!isGameOver ? (
          <>
            {/* Card circle */}
            {!selectedCard && (
              <div className="relative" style={{ width: 340, height: 340 }}>
                {/* Center cup with king counter */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-gradient-to-br from-gold/30 to-gold/10 border-2 border-gold/50 flex flex-col items-center justify-center shadow-lg shadow-gold/20">
                  <Crown className="w-8 h-8 text-gold" />
                  <span className="text-2xl font-black text-gold">{gameState.kingsDrawn}/4</span>
                </div>
                
                {/* Cards in circle */}
                {gameState.deck.map((card, index) => {
                  const pos = cardPositions[index];
                  if (!pos) return null;
                  
                  return (
                    <div
                      key={card.id}
                      className={cn(
                        "absolute transition-all duration-200",
                        isMyTurn 
                          ? "cursor-pointer hover:scale-150 hover:z-50 active:scale-125" 
                          : "cursor-not-allowed opacity-70"
                      )}
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) rotate(${pos.rotation}deg)`,
                      }}
                      onClick={() => isMyTurn && handleSelectCard(index)}
                    >
                      <PlayingCard
                        faceDown
                        size="sm"
                        className={cn(
                          "shadow-lg",
                          isMyTurn && "hover:shadow-gold/30"
                        )}
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selected card display */}
            {selectedCard && (
              <div className="flex flex-col items-center gap-6">
                <PlayingCard
                  card={selectedCard}
                  size="xl"
                  isAnimating
                />
                
                {/* Rule display */}
                {showRule && rule && (
                  <div className="w-full max-w-sm slide-up">
                    <div className="ornate-border rounded-2xl p-6 bg-card/80 backdrop-blur-sm">
                      <h3 className="text-xl font-bold mb-2 text-center text-gold">
                        {language === 'hu' ? rule.titleHu : rule.title}
                      </h3>
                      <p className="text-white/70 text-center">
                        {language === 'hu' ? rule.descriptionHu : rule.description}
                      </p>
                      {rule.sips > 0 && (
                        <div className="mt-4 text-center">
                          <span className="inline-flex items-center gap-2 px-4 py-2 bg-gold/20 rounded-full text-gold font-bold">
                            <Wine className="w-4 h-4" />
                            {rule.sips} {t('sips', language)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hint text */}
            {!selectedCard && (
              <p className="text-gold/60 text-sm mt-4 text-center">
                {isMyTurn 
                  ? (language === 'hu' ? 'Koppints egy lapra!' : 'Tap a card!')
                  : (language === 'hu' ? `Várd meg ${currentPlayer?.name} lépését` : `Waiting for ${currentPlayer?.name}`)
                }
              </p>
            )}
          </>
        ) : (
          <div className="text-center">
            {gameState.kingsDrawn >= 4 && selectedCard && (
              <div className="mb-6">
                <PlayingCard card={selectedCard} size="xl" />
              </div>
            )}
            <Wine className="w-16 h-16 text-gold mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2 text-gold">{t('gameOver', language)}</h3>
            {gameState.kingsDrawn >= 4 && gameState.lastKingPlayer && (
              <p className="text-white/70 text-lg">
                {language === 'hu' 
                  ? `${gameState.lastKingPlayer} megissza a Kiraly poharat!` 
                  : `${gameState.lastKingPlayer} drinks the King's Cup!`}
              </p>
            )}
          </div>
        )}
      </main>

      {/* Chat panel */}
      {showChat && (
        <div className="absolute bottom-20 left-4 right-4 max-h-64 bg-card/95 backdrop-blur-sm border border-gold/30 rounded-xl overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {chatMessages.length === 0 ? (
              <p className="text-white/50 text-sm text-center">No messages yet</p>
            ) : (
              chatMessages.map(msg => (
                <div 
                  key={msg.id} 
                  className={cn(
                    "text-sm",
                    msg.playerId === playerId ? "text-right" : ""
                  )}
                >
                  <span className="text-gold/70">{msg.playerName}: </span>
                  <span className="text-white">{msg.message}</span>
                </div>
              ))
            )}
          </div>
          <div className="flex gap-2 p-3 border-t border-gold/20">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendChatMessage()}
              placeholder="Type a message..."
              className="flex-1 bg-white/10 border border-gold/30 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/50 focus:outline-none focus:border-gold/50"
            />
            <Button onClick={sendChatMessage} size="sm" className="bg-gold text-black hover:bg-gold/80">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Bottom actions */}
      <div className="p-4 flex gap-3">
        {isGameOver ? (
          isHost && (
            <Button 
              onClick={handleNewGame} 
              className="flex-1 h-14 gold-button font-bold text-lg" 
              size="lg"
            >
              <RotateCcw className="w-5 h-5 mr-2" />
              {t('newGame', language)}
            </Button>
          )
        ) : selectedCard && isMyTurn ? (
          <Button 
            onClick={handleNextPlayer} 
            className="flex-1 h-14 gold-button font-bold text-lg" 
            size="lg"
          >
            {t('nextPlayer', language)}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
