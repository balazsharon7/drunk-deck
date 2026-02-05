'use client';

// Main multiplayer hook for real-time game synchronization
// Uses Supabase Realtime for state sync and presence

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type {
  GameState,
  GameAction,
  PlayerInGame,
  ConnectionStatus,
  UseMultiplayerReturn,
  GameEvent,
  PlayerPresence
} from './types';
import { generateEventId } from './game-logic';

interface UseMultiplayerOptions {
  partyId: string;
  playerId: string;
  playerName: string;
  isHost: boolean;
  onGameEvent?: (event: GameEvent) => void;
  onPlayerJoin?: (player: PlayerInGame) => void;
  onPlayerLeave?: (playerId: string) => void;
}

export function useMultiplayer<T extends GameState>(
  options: UseMultiplayerOptions
): UseMultiplayerReturn<T> {
  const { partyId, playerId, playerName, isHost, onGameEvent, onPlayerJoin, onPlayerLeave } = options;
  
  const [gameState, setGameState] = useState<T | null>(null);
  const [players, setPlayers] = useState<PlayerInGame[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());
  const pendingActionsRef = useRef<Map<string, GameAction>>(new Map());
  
  // Current player info
  const currentPlayer = players.find(p => p.id === playerId) || null;
  const isMyTurn = gameState ? gameState.players[gameState.currentPlayerIndex]?.id === playerId : false;

  // Initialize channels and subscriptions
  useEffect(() => {
    const supabase = supabaseRef.current;
    
    const setupChannels = async () => {
      try {
        // 1. Subscribe to game state changes
        const gameChannel = supabase
          .channel(`game:${partyId}`)
          .on('broadcast', { event: 'state_update' }, (payload) => {
            console.log('[v0] Received state update:', payload);
            const newState = payload.payload as T;
            setGameState(newState);
          })
          .on('broadcast', { event: 'game_event' }, (payload) => {
            console.log('[v0] Received game event:', payload);
            const event = payload.payload as GameEvent;
            onGameEvent?.(event);
          })
          .subscribe((status) => {
            console.log('[v0] Game channel status:', status);
            if (status === 'SUBSCRIBED') {
              setConnectionStatus('connected');
            } else if (status === 'CLOSED') {
              setConnectionStatus('disconnected');
            }
          });
        
        channelRef.current = gameChannel;
        
        // 2. Subscribe to presence for player tracking
        const presenceChannel = supabase
          .channel(`presence:${partyId}`)
          .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState();
            console.log('[v0] Presence sync:', state);
            updatePlayersFromPresence(state);
          })
          .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            console.log('[v0] Player joined:', key, newPresences);
            newPresences.forEach((presence: PlayerPresence) => {
              onPlayerJoin?.({
                id: presence.odavaloPlayerId || presence.playerId || key,
                name: presence.odavaloPlayerName || playerName,
                avatar: '🎮',
                isHost: false,
                isOnline: true
              });
            });
          })
          .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            console.log('[v0] Player left:', key, leftPresences);
            leftPresences.forEach((presence: PlayerPresence) => {
              onPlayerLeave?.(presence.odavaloPlayerId || presence.playerId || key);
            });
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              // Track our own presence
              await presenceChannel.track({
                odavaloPlayerId: playerId,
                odavaloPlayerName: playerName,
                odavaloIsHost: isHost,
                odavaloJoinedAt: new Date().toISOString(),
                playerId: playerId,
                playerName: playerName,
                isHost: isHost,
                joinedAt: new Date().toISOString()
              });
            }
          });
        
        presenceChannelRef.current = presenceChannel;
        
        // 3. Load initial game state from database
        await loadInitialState();
        
      } catch (err) {
        console.error('[v0] Error setting up channels:', err);
        setError(err instanceof Error ? err.message : 'Failed to connect');
        setConnectionStatus('error');
      }
    };
    
    setupChannels();
    
    // Cleanup on unmount
    return () => {
      channelRef.current?.unsubscribe();
      presenceChannelRef.current?.unsubscribe();
    };
  }, [partyId, playerId, playerName, isHost]);

  // Load initial state from database
  const loadInitialState = async () => {
    const supabase = supabaseRef.current;
    
    try {
      const { data, error } = await supabase
        .from('game_states')
        .select('*')
        .eq('party_id', partyId)
        .single();
      
      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        throw error;
      }
      
      if (data) {
        setGameState(data.state as T);
        setPlayers(data.state.players || []);
      }
    } catch (err) {
      console.error('[v0] Error loading initial state:', err);
      // Don't set error - game might not have started yet
    }
  };

  // Update players list from presence state
  const updatePlayersFromPresence = (presenceState: Record<string, PlayerPresence[]>) => {
    const onlinePlayers: PlayerInGame[] = [];
    
    Object.values(presenceState).forEach((presences) => {
      presences.forEach((presence) => {
        onlinePlayers.push({
          id: presence.odavaloPlayerId || presence.playerId || '',
          name: presence.odavaloPlayerName || '',
          avatar: '🎮',
          isHost: presence.odavaloIsHost || false,
          isOnline: true
        });
      });
    });
    
    // Merge with existing players (keep offline players too)
    setPlayers(currentPlayers => {
      const merged = [...currentPlayers];
      
      onlinePlayers.forEach(onlinePlayer => {
        const existingIndex = merged.findIndex(p => p.id === onlinePlayer.id);
        if (existingIndex >= 0) {
          merged[existingIndex] = { ...merged[existingIndex], isOnline: true };
        } else {
          merged.push(onlinePlayer);
        }
      });
      
      // Mark players not in presence as offline
      merged.forEach(player => {
        if (!onlinePlayers.find(p => p.id === player.id)) {
          player.isOnline = false;
        }
      });
      
      return merged;
    });
  };

  // Dispatch a game action (optimistic update + server validation)
  const dispatch = useCallback(async (action: GameAction) => {
    const actionId = generateEventId();
    
    try {
      // Add to pending actions for rollback if needed
      pendingActionsRef.current.set(actionId, action);
      
      // Send action to server for validation
      const response = await fetch('/api/game/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyId,
          action,
          actionId,
          playerId
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Action failed');
      }
      
      const result = await response.json();
      
      // Remove from pending
      pendingActionsRef.current.delete(actionId);
      
      // Broadcast the new state to all players
      if (result.newState && channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'state_update',
          payload: result.newState
        });
      }
      
    } catch (err) {
      console.error('[v0] Action dispatch error:', err);
      pendingActionsRef.current.delete(actionId);
      setError(err instanceof Error ? err.message : 'Action failed');
      
      // Reload state to recover from optimistic update
      await loadInitialState();
    }
  }, [partyId, playerId]);

  // Send a chat message
  const sendChatMessage = useCallback((message: string) => {
    if (!channelRef.current) return;
    
    channelRef.current.send({
      type: 'broadcast',
      event: 'game_event',
      payload: {
        id: generateEventId(),
        partyId,
        eventType: 'chat_message',
        playerId,
        payload: { message, playerName },
        timestamp: new Date().toISOString(),
        sequence: Date.now()
      }
    });
  }, [partyId, playerId, playerName]);

  // Start the game (host only)
  const startGame = useCallback(async () => {
    if (!isHost) {
      setError('Only host can start the game');
      return;
    }
    
    try {
      const response = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partyId,
          playerId,
          players
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to start game');
      }
      
      const { gameState: newState } = await response.json();
      setGameState(newState);
      
      // Broadcast start to all players
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'state_update',
          payload: newState
        });
        
        await channelRef.current.send({
          type: 'broadcast',
          event: 'game_event',
          payload: {
            id: generateEventId(),
            partyId,
            eventType: 'game_started',
            playerId,
            payload: {},
            timestamp: new Date().toISOString(),
            sequence: Date.now()
          }
        });
      }
      
    } catch (err) {
      console.error('[v0] Start game error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start game');
    }
  }, [isHost, partyId, playerId, players]);

  // End the game (host only)
  const endGame = useCallback(async () => {
    await dispatch({ type: 'END_GAME', playerId });
  }, [dispatch, playerId]);

  // Leave the game
  const leaveGame = useCallback(async () => {
    // Untrack presence
    await presenceChannelRef.current?.untrack();
    
    // Unsubscribe from channels
    await channelRef.current?.unsubscribe();
    await presenceChannelRef.current?.unsubscribe();
    
    setConnectionStatus('disconnected');
  }, []);

  return {
    gameState,
    players,
    currentPlayer,
    isMyTurn,
    connectionStatus,
    error,
    dispatch,
    sendChatMessage,
    startGame,
    endGame,
    leaveGame
  };
}

// Hook for local-only games (no server sync)
export function useLocalGame<T extends GameState>(
  initialState: T
) {
  const [gameState, setGameState] = useState<T>(initialState);
  
  const dispatch = useCallback((action: GameAction) => {
    setGameState(current => {
      // Apply action locally - this would use the game-logic functions
      // For now, return current state (implement per game type)
      return current;
    });
  }, []);
  
  return {
    gameState,
    setGameState,
    dispatch
  };
}
