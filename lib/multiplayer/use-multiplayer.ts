'use client';

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
} from './types';
import { generateEventId } from './game-logic';

interface UseMultiplayerOptions {
  partyId: string;
  playerId: string;
  playerName: string;
  isHost: boolean;
}

export function useMultiplayer<T extends GameState>(
  options: UseMultiplayerOptions
): UseMultiplayerReturn<T> {
  const { partyId, playerId, playerName, isHost } = options;

  const [gameState, setGameState] = useState<T | null>(null);
  const [players, setPlayers] = useState<PlayerInGame[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<GameEvent[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabaseRef = useRef(createClient());

  const currentPlayer = players.find(p => p.id === playerId) || null;
  const isMyTurn = gameState
    ? gameState.players[gameState.currentPlayerIndex]?.id === playerId
    : false;

  // Setup realtime channel
  useEffect(() => {
    const supabase = supabaseRef.current;

    // Single channel for both broadcast + presence
    const channel = supabase.channel(`party:${partyId}`, {
      config: { presence: { key: playerId } },
    });

    // Listen for state updates
    channel.on('broadcast', { event: 'state_update' }, ({ payload }) => {
      if (payload) {
        setGameState(payload as T);
        if (payload.players) {
          setPlayers(payload.players);
        }
      }
    });

    // Listen for game events (chat, notifications)
    channel.on('broadcast', { event: 'game_event' }, ({ payload }) => {
      if (payload) {
        const evt = payload as GameEvent;
        setEvents(prev => [...prev.slice(-49), evt]); // keep last 50
      }
    });

    // Presence sync
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const onlinePlayers: PlayerInGame[] = [];

      Object.values(state).forEach((presences) => {
        (presences as Record<string, unknown>[]).forEach((p) => {
          onlinePlayers.push({
            id: p.playerId as string,
            name: p.playerName as string,
            avatar: (p.avatar as string) || '',
            isHost: (p.isHost as boolean) || false,
            isOnline: true,
            isReady: (p.isReady as boolean) || false,
            userId: p.userId as string | undefined,
          });
        });
      });

      setPlayers(onlinePlayers);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        setConnectionStatus('connected');
        // Track our presence
        await channel.track({
          playerId,
          playerName,
          isHost,
          avatar: '',
          isReady: false,
          joinedAt: new Date().toISOString(),
        });
      } else if (status === 'CHANNEL_ERROR') {
        setConnectionStatus('error');
      } else if (status === 'CLOSED') {
        setConnectionStatus('disconnected');
      }
    });

    channelRef.current = channel;

    // Load initial game state from DB if it exists
    supabase
      .from('game_states')
      .select('state')
      .eq('party_id', partyId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.state) {
          setGameState(data.state as T);
          if ((data.state as T).players) {
            setPlayers((data.state as T).players);
          }
        }
      });

    return () => {
      channel.unsubscribe();
    };
  }, [partyId, playerId, playerName, isHost]);

  // Update readiness in presence
  const setReady = useCallback(async (ready: boolean) => {
    if (channelRef.current) {
      await channelRef.current.track({
        playerId,
        playerName,
        isHost,
        avatar: '',
        isReady: ready,
        joinedAt: new Date().toISOString(),
      });
    }
  }, [playerId, playerName, isHost]);

  // Dispatch game action to server, then broadcast result
  const dispatch = useCallback(async (action: GameAction) => {
    try {
      setError(null);
      const response = await fetch('/api/game/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partyId, action, playerId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Action failed');
      }

      // Broadcast the new state to all players
      if (result.newState && channelRef.current) {
        setGameState(result.newState as T);
        await channelRef.current.send({
          type: 'broadcast',
          event: 'state_update',
          payload: result.newState,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Action failed';
      setError(msg);
    }
  }, [partyId, playerId]);

  // Send chat message via broadcast
  const sendChatMessage = useCallback((message: string) => {
    if (!channelRef.current) return;

    const evt: GameEvent = {
      id: generateEventId(),
      partyId,
      eventType: 'chat_message',
      playerId,
      playerName,
      payload: { message },
      timestamp: new Date().toISOString(),
    };

    channelRef.current.send({
      type: 'broadcast',
      event: 'game_event',
      payload: evt,
    });

    // Add locally too
    setEvents(prev => [...prev.slice(-49), evt]);
  }, [partyId, playerId, playerName]);

  // Start game (host only)
  const startGame = useCallback(async () => {
    if (!isHost) {
      setError('Only the host can start the game');
      return;
    }

    try {
      setError(null);
      const response = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partyId, playerId, players }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to start');
      }

      const newState = result.gameState as T;
      setGameState(newState);

      // Broadcast to all players
      if (channelRef.current) {
        await channelRef.current.send({
          type: 'broadcast',
          event: 'state_update',
          payload: newState,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start';
      setError(msg);
    }
  }, [isHost, partyId, playerId, players]);

  // End game
  const endGame = useCallback(async () => {
    await dispatch({ type: 'END_GAME', playerId });
  }, [dispatch, playerId]);

  // Leave game
  const leaveGame = useCallback(async () => {
    await channelRef.current?.untrack();
    await channelRef.current?.unsubscribe();
    setConnectionStatus('disconnected');
  }, []);

  return {
    gameState,
    players,
    currentPlayer,
    isMyTurn,
    connectionStatus,
    error,
    events,
    dispatch,
    sendChatMessage,
    startGame,
    endGame,
    leaveGame,
  };
}
