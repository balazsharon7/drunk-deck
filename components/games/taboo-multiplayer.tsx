'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useGame } from '@/lib/game-context';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ArrowLeft, RotateCcw, Check, X, Play, Timer, Trophy,
  Star, Users, BookOpen, AlertTriangle, Wifi, WifiOff,
  MessageCircle, Send,
} from 'lucide-react';

// ── WORD DATA ──

interface WordSet {
  easy: string;
  medium: string;
  hard: string;
}

const WORD_SETS: WordSet[] = [
  { easy: 'Kutya', medium: 'Allatorvos', hard: 'Huseg' },
  { easy: 'Macska', medium: 'Macskakarpas', hard: 'Fuggetlenseg' },
  { easy: 'Haz', medium: 'Epiteszet', hard: 'Otthon' },
  { easy: 'Auto', medium: 'Forgalom', hard: 'Szabadsag' },
  { easy: 'Viz', medium: 'Ocean', hard: 'Elet' },
  { easy: 'Tuz', medium: 'Tuzolto', hard: 'Szenvedely' },
  { easy: 'Nap', medium: 'Naprendszer', hard: 'Energia' },
  { easy: 'Hold', medium: 'Urhajos', hard: 'Romantika' },
  { easy: 'Fa', medium: 'Erdo', hard: 'Novekedes' },
  { easy: 'Virag', medium: 'Kertesz', hard: 'Szepseg' },
  { easy: 'Kenyer', medium: 'Pekseg', hard: 'Hagyomany' },
  { easy: 'Tej', medium: 'Teheneszt', hard: 'Taplk' },
  { easy: 'Alma', medium: 'Gyumolcsos', hard: 'Egeszseg' },
  { easy: 'Szek', medium: 'Butor', hard: 'Kenyelem' },
  { easy: 'Konyv', medium: 'Konyvtar', hard: 'Tudas' },
  { easy: 'Toll', medium: 'Iro', hard: 'Kreativitas' },
  { easy: 'Ora', medium: 'Idozona', hard: 'Mulandosag' },
  { easy: 'Penz', medium: 'Bank', hard: 'Biztonsag' },
  { easy: 'Sziv', medium: 'Kardiologus', hard: 'Szerelem' },
  { easy: 'Szem', medium: 'Szemuveg', hard: 'Megfigyeles' },
  { easy: 'Kez', medium: 'Kezmuves', hard: 'Alkotas' },
  { easy: 'Lab', medium: 'Maraton', hard: 'Kitartas' },
  { easy: 'Fej', medium: 'Gondolkodas', hard: 'Ertelem' },
  { easy: 'Haj', medium: 'Fodrasz', hard: 'Identitas' },
  { easy: 'Szaj', medium: 'Beszed', hard: 'Kommunikacio' },
  { easy: 'Ful', medium: 'Zenesz', hard: 'Hallgatas' },
  { easy: 'Orr', medium: 'Parfum', hard: 'Oszton' },
  { easy: 'Fog', medium: 'Fogorvos', hard: 'Mosoly' },
  { easy: 'Eso', medium: 'Idojaras', hard: 'Melankolia' },
  { easy: 'Ho', medium: 'Sieles', hard: 'Tisztasag' },
  { easy: 'Szel', medium: 'Szeleromu', hard: 'Valtozas' },
  { easy: 'Felho', medium: 'Repulogep', hard: 'Almodozas' },
  { easy: 'Csillag', medium: 'Csillagasz', hard: 'Remeny' },
  { easy: 'Hegy', medium: 'Hegymaiszo', hard: 'Kihivas' },
  { easy: 'Tenger', medium: 'Hajozas', hard: 'Vegtelen' },
  { easy: 'Folyo', medium: 'Halaszat', hard: 'Folyamatossag' },
  { easy: 'Madar', medium: 'Ornitologia', hard: 'Szabadsag' },
  { easy: 'Hal', medium: 'Akvarium', hard: 'Csend' },
  { easy: 'Lo', medium: 'Lovaglas', hard: 'Nemesseg' },
  { easy: 'Tehen', medium: 'Tejgazdasag', hard: 'Turelem' },
  { easy: 'Polip', medium: 'Tengerfenk', hard: 'Intelligencia' },
  { easy: 'Kigyo', medium: 'Meregzsak', hard: 'Megujulas' },
  { easy: 'Elefant', medium: 'Szafari', hard: 'Emlkezet' },
  { easy: 'Oroszlan', medium: 'Szavanna', hard: 'Batorsag' },
  { easy: 'Pingvin', medium: 'Antarktisz', hard: 'Kitartas' },
];

// ── TYPES ──

interface OnlinePlayer {
  id: string;
  name: string;
  avatar: string;
  isHost: boolean;
  isOnline?: boolean;
}

interface TabooGameState {
  partyId: string;
  gameType: string;
  phase: 'rules' | 'select-card' | 'playing' | 'select-guesser' | 'results';
  players: OnlinePlayer[];
  currentDescriberIndex: number;
  currentCard: WordSet | null;
  selectedWord: { word: string; points: number } | null;
  usedCardIndices: number[];
  scores: Record<string, number>;
  timeLeft: number;
  roundTime: number;
  cardsCompleted: number;
  isTimerRunning: boolean;
  version: number;
}

interface ChatMessage {
  id: string;
  playerId: string;
  playerName: string;
  message: string;
  timestamp: number;
}

// ── COMPONENT ──

interface TabooMultiplayerProps {
  partyId: string;
  playerId: string;
  playerName: string;
  isHost: boolean;
  initialPlayers: OnlinePlayer[];
  onBack: () => void;
}

export function TabooMultiplayer({
  partyId,
  playerId,
  playerName,
  isHost,
  initialPlayers,
  onBack,
}: TabooMultiplayerProps) {
  const supabase = createClient();
  const { language } = useGame();
  const hu = language === 'hu';

  // Game state
  const [gameState, setGameState] = useState<TabooGameState | null>(null);
  const [localTimeLeft, setLocalTimeLeft] = useState(60);

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
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Derived
  const isDescriber = gameState ? players[gameState.currentDescriberIndex]?.id === playerId : false;
  const currentDescriber = gameState ? players[gameState.currentDescriberIndex] : null;

  // ── LOCAL TIMER ──
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!gameState?.isTimerRunning || localTimeLeft <= 0) return;

    timerRef.current = setInterval(() => {
      setLocalTimeLeft(prev => {
        if (prev <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [gameState?.isTimerRunning, localTimeLeft]);

  // Sync localTimeLeft when gameState changes
  useEffect(() => {
    if (gameState?.timeLeft !== undefined) {
      setLocalTimeLeft(gameState.timeLeft);
    }
  }, [gameState?.timeLeft]);

  // ── REALTIME SETUP ──

  useEffect(() => {
    const channel = supabase.channel(`taboo:${partyId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: playerId },
      },
    });

    channel.on('broadcast', { event: 'state_update' }, ({ payload }) => {
      if (payload) {
        setGameState(payload as TabooGameState);
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

  const drawNewCard = (usedIndices: number[]): { card: WordSet; newUsedIndices: number[] } => {
    const available = WORD_SETS.map((_, i) => i).filter(i => !usedIndices.includes(i));
    if (available.length === 0) {
      return drawNewCard([]); // reset
    }
    const idx = available[Math.floor(Math.random() * available.length)];
    return { card: WORD_SETS[idx], newUsedIndices: [...usedIndices, idx] };
  };

  const initializeGame = async (channel?: RealtimeChannel) => {
    const { card, newUsedIndices } = drawNewCard([]);
    const scores: Record<string, number> = {};
    initialPlayers.forEach(p => { scores[p.id] = 0; });

    const initial: TabooGameState = {
      partyId,
      gameType: 'taboo',
      phase: 'rules',
      players: initialPlayers,
      currentDescriberIndex: 0,
      currentCard: card,
      selectedWord: null,
      usedCardIndices: newUsedIndices,
      scores,
      timeLeft: 60,
      roundTime: 60,
      cardsCompleted: 0,
      isTimerRunning: false,
      version: 1,
    };
    setGameState(initial);
    setLocalTimeLeft(60);

    try {
      await supabase.from('game_states').upsert({
        party_id: partyId, game_type: 'taboo', state: initial,
        version: 1, host_id: playerId, status: 'playing',
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
        .from('game_states').select('state').eq('party_id', partyId).maybeSingle();
      if (data?.state) {
        const state = data.state as TabooGameState;
        setGameState(state);
        if (state.players) setPlayers(state.players);
      }
    } catch {}
  };

  const broadcastAndSave = async (newState: TabooGameState) => {
    try {
      await supabase.from('game_states').update({
        state: newState, version: newState.version, updated_at: new Date().toISOString(),
      }).eq('party_id', partyId);
    } catch {}

    if (channelRef.current) {
      await channelRef.current.send({ type: 'broadcast', event: 'state_update', payload: newState });
    }
  };

  // ── GAME ACTIONS ──

  const handleStartGame = useCallback(async () => {
    if (!gameState) return;
    const { card, newUsedIndices } = drawNewCard(gameState.usedCardIndices);
    const newState: TabooGameState = {
      ...gameState,
      phase: 'select-card',
      currentCard: card,
      usedCardIndices: newUsedIndices,
      timeLeft: gameState.roundTime,
      cardsCompleted: 0,
      isTimerRunning: false,
      version: gameState.version + 1,
    };
    setGameState(newState);
    setLocalTimeLeft(newState.roundTime);
    await broadcastAndSave(newState);
  }, [gameState]);

  const handleSelectWord = useCallback(async (word: string, points: number) => {
    if (!gameState) return;
    const newState: TabooGameState = {
      ...gameState,
      phase: 'playing',
      selectedWord: { word, points },
      isTimerRunning: true,
      timeLeft: localTimeLeft > 0 ? localTimeLeft : gameState.roundTime,
      version: gameState.version + 1,
    };
    setGameState(newState);
    await broadcastAndSave(newState);
  }, [gameState, localTimeLeft]);

  const handleSkipCard = useCallback(async () => {
    if (!gameState) return;
    const { card, newUsedIndices } = drawNewCard(gameState.usedCardIndices);
    const newState: TabooGameState = {
      ...gameState,
      currentCard: card,
      usedCardIndices: newUsedIndices,
      version: gameState.version + 1,
    };
    setGameState(newState);
    await broadcastAndSave(newState);
  }, [gameState]);

  const handleCorrect = useCallback(async () => {
    if (!gameState) return;
    const newState: TabooGameState = {
      ...gameState,
      phase: 'select-guesser',
      isTimerRunning: false,
      timeLeft: localTimeLeft,
      version: gameState.version + 1,
    };
    setGameState(newState);
    await broadcastAndSave(newState);
  }, [gameState, localTimeLeft]);

  const handleSelectGuesser = useCallback(async (guesserIndex: number) => {
    if (!gameState || !gameState.selectedWord) return;
    const describer = players[gameState.currentDescriberIndex];
    const guesser = players[guesserIndex];
    const pts = gameState.selectedWord.points;

    const newScores = { ...gameState.scores };
    newScores[describer.id] = (newScores[describer.id] || 0) + pts;
    newScores[guesser.id] = (newScores[guesser.id] || 0) + pts;

    const { card, newUsedIndices } = drawNewCard(gameState.usedCardIndices);
    const newState: TabooGameState = {
      ...gameState,
      phase: 'select-card',
      currentDescriberIndex: guesserIndex,
      scores: newScores,
      selectedWord: null,
      currentCard: card,
      usedCardIndices: newUsedIndices,
      cardsCompleted: gameState.cardsCompleted + 1,
      isTimerRunning: false,
      timeLeft: gameState.roundTime,
      version: gameState.version + 1,
    };
    setGameState(newState);
    setLocalTimeLeft(newState.roundTime);
    await broadcastAndSave(newState);
  }, [gameState, players]);

  const handlePass = useCallback(async () => {
    if (!gameState) return;
    const { card, newUsedIndices } = drawNewCard(gameState.usedCardIndices);
    const newState: TabooGameState = {
      ...gameState,
      phase: 'select-card',
      currentCard: card,
      usedCardIndices: newUsedIndices,
      selectedWord: null,
      isTimerRunning: false,
      version: gameState.version + 1,
    };
    setGameState(newState);
    await broadcastAndSave(newState);
  }, [gameState]);

  const handleEndGame = useCallback(async () => {
    if (!gameState) return;
    const newState: TabooGameState = {
      ...gameState,
      phase: 'results',
      isTimerRunning: false,
      version: gameState.version + 1,
    };
    setGameState(newState);
    await broadcastAndSave(newState);
  }, [gameState]);

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
          <p className="text-amber-400">{hu ? 'Csatlakozas...' : 'Connecting...'}</p>
        </div>
      </div>
    );
  }

  // Header component used in all phases
  const Header = ({ title, backAction }: { title: string; backAction?: () => void }) => (
    <header className="flex items-center justify-between p-4">
      <Button variant="ghost" onClick={backAction || onBack} className="text-amber-400/70 hover:text-amber-400">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {hu ? 'Vissza' : 'Back'}
      </Button>
      <h1 className="text-lg font-bold text-amber-400">{title}</h1>
      <div className="flex items-center gap-2">
        <div className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
          isConnected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
        )}>
          {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
        </div>
        <Button variant="ghost" size="sm"
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
  );

  const ChatPanel = () => showChat ? (
    <div className="absolute bottom-20 left-4 right-4 max-h-64 bg-zinc-900/95 backdrop-blur-sm border border-amber-500/30 rounded-xl overflow-hidden flex flex-col z-50">
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {chatMessages.length === 0 ? (
          <p className="text-white/50 text-sm text-center">{hu ? 'Nincs uzenet' : 'No messages'}</p>
        ) : chatMessages.map(msg => (
          <div key={msg.id} className={cn("text-sm", msg.playerId === playerId ? "text-right" : "text-left")}>
            <span className="text-amber-400/70 text-xs">{msg.playerName}: </span>
            <span className="text-white/90">{msg.message}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-2 p-2 border-t border-amber-500/20">
        <input
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
          placeholder={hu ? 'Uzenet...' : 'Message...'}
          className="flex-1 bg-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none"
        />
        <Button size="sm" onClick={sendChatMessage} className="bg-amber-500 hover:bg-amber-600 text-black">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  ) : null;

  // ── RULES PHASE ──
  if (gameState.phase === 'rules') {
    return (
      <div className="min-h-screen bg-background flex flex-col relative">
        <Header title={hu ? 'Barlangnyelv' : 'Cave Language'} />
        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="w-full max-w-md mx-auto">
            <div className="p-6 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-6 h-6 text-amber-400" />
                <h2 className="text-xl font-bold text-amber-400">{hu ? 'Jatekszabalyok' : 'Rules'}</h2>
              </div>
              <p className="text-amber-100/80 mb-4 leading-relaxed">
                {hu
                  ? 'A jatekban a feladvanyszavakat korulrassal kell a tobbi jatekos tudomasara hozni, de csak egyszotaguszavakat hasznalhattok!'
                  : 'Describe words using only one-syllable words! Others have to guess what you mean.'}
              </p>
              <div className="p-4 rounded-xl bg-zinc-800/50 mb-4">
                <p className="text-sm text-amber-400 mb-2 font-semibold">{hu ? 'Pelda:' : 'Example:'}</p>
                <p className="text-amber-100/70 italic">
                  {hu ? '"El mely viz, van nyolc lab es nagy fej" - Mi lehet ez?' : '"Lives deep wet, has eight legs and big head" - What is it?'}
                </p>
                <p className="text-green-400 mt-2 font-medium">{hu ? 'Valasz: Polip' : 'Answer: Octopus'}</p>
              </div>
            </div>
            <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="text-lg font-bold text-red-400">{hu ? 'Tilos!' : 'Forbidden!'}</h3>
              </div>
              <ul className="space-y-2 text-sm text-red-100/80">
                <li className="flex items-start gap-2"><X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />{hu ? 'Kimondani a szot' : 'Saying the word'}</li>
                <li className="flex items-start gap-2"><X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />{hu ? 'Mutogatni' : 'Gesturing'}</li>
                <li className="flex items-start gap-2"><X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />{hu ? 'Hangutanzo szavak' : 'Onomatopoeia'}</li>
                <li className="flex items-start gap-2"><X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />{hu ? 'Betuzni' : 'Spelling it out'}</li>
              </ul>
            </div>
            <div className="p-5 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 mb-8">
              <h3 className="text-lg font-bold text-white mb-3">{hu ? 'Pontrendszer' : 'Scoring'}</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10">
                  <div className="flex items-center gap-2"><Star className="w-4 h-4 text-green-400 fill-green-400" /><span className="text-green-400">{hu ? 'Konnyu' : 'Easy'}</span></div>
                  <span className="text-green-400 font-bold">1 {hu ? 'pont' : 'pt'}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10">
                  <div className="flex items-center gap-2"><Star className="w-4 h-4 text-amber-400 fill-amber-400" /><Star className="w-4 h-4 text-amber-400 fill-amber-400" /><span className="text-amber-400">{hu ? 'Kozepes' : 'Medium'}</span></div>
                  <span className="text-amber-400 font-bold">2 {hu ? 'pont' : 'pts'}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/10">
                  <div className="flex items-center gap-2"><Star className="w-4 h-4 text-red-400 fill-red-400" /><Star className="w-4 h-4 text-red-400 fill-red-400" /><Star className="w-4 h-4 text-red-400 fill-red-400" /><span className="text-red-400">{hu ? 'Nehez' : 'Hard'}</span></div>
                  <span className="text-red-400 font-bold">3 {hu ? 'pont' : 'pts'}</span>
                </div>
              </div>
            </div>
            {isHost && (
              <Button onClick={handleStartGame} className="w-full h-14 text-lg font-bold bg-amber-500 hover:bg-amber-600 text-black rounded-full">
                <Play className="w-5 h-5 mr-2" /> {hu ? 'Jatek inditasa' : 'Start Game'}
              </Button>
            )}
            {!isHost && (
              <p className="text-center text-amber-400/50">{hu ? 'Varakozas a gazda inditasara...' : 'Waiting for host to start...'}</p>
            )}
          </div>
        </main>
        <ChatPanel />
      </div>
    );
  }

  // ── CARD SELECT (only describer sees words) ──
  if (gameState.phase === 'select-card') {
    return (
      <div className="min-h-screen bg-background flex flex-col relative">
        <Header title={hu ? 'Barlangnyelv' : 'Cave Language'} />
        <div className="text-center px-4 pb-2">
          <p className="text-amber-400/60 text-sm">{hu ? 'Leiro' : 'Describer'}</p>
          <h2 className="text-2xl font-bold text-amber-400">{currentDescriber?.name}</h2>
        </div>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
          {isDescriber ? (
            <div className="w-full max-w-sm">
              <p className="text-center text-white/70 mb-4 text-sm">
                {hu ? 'Valassz egy szot - utana indul az ido!' : 'Pick a word - timer starts after!'}
              </p>
              {gameState.currentCard && (
                <div className="space-y-3 mb-6">
                  {[
                    { word: gameState.currentCard.easy, points: 1, color: 'green', label: hu ? 'Konnyu' : 'Easy' },
                    { word: gameState.currentCard.medium, points: 2, color: 'amber', label: hu ? 'Kozepes' : 'Medium' },
                    { word: gameState.currentCard.hard, points: 3, color: 'red', label: hu ? 'Nehez' : 'Hard' },
                  ].map(({ word, points, color, label }) => (
                    <button
                      key={word}
                      onClick={() => handleSelectWord(word, points)}
                      className={cn(
                        "w-full p-4 rounded-xl border text-left transition-all hover:scale-[1.02]",
                        `bg-${color}-500/10 border-${color}-500/30 hover:border-${color}-500/60`
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className={`text-xs text-${color}-400`}>{label}</span>
                          <p className="text-lg font-bold text-white">{word}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: points }).map((_, i) => (
                            <Star key={i} className={`w-4 h-4 text-${color}-400 fill-${color}-400`} />
                          ))}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <Button onClick={handleSkipCard} variant="outline" className="w-full text-amber-400 border-amber-500/30">
                {hu ? 'Masik kartya' : 'Next Card'}
              </Button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-white/70 text-lg">
                {hu ? `${currentDescriber?.name} valaszt szot...` : `${currentDescriber?.name} is picking a word...`}
              </p>
              <p className="text-amber-400/50 text-sm mt-2">
                {hu ? 'Keszulj a kitalalasra!' : 'Get ready to guess!'}
              </p>
            </div>
          )}
        </main>
        <ChatPanel />
      </div>
    );
  }

  // ── PLAYING (timer running) ──
  if (gameState.phase === 'playing') {
    return (
      <div className="min-h-screen bg-background flex flex-col relative">
        <header className="flex items-center justify-between p-4">
          <div className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-full text-lg font-bold",
            localTimeLeft <= 10 ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-amber-500/20 text-amber-400"
          )}>
            <Timer className="w-5 h-5" />
            {localTimeLeft}s
          </div>
          <div className="text-center">
            <p className="text-xs text-amber-400/60">{hu ? 'Leiro' : 'Describer'}</p>
            <p className="text-sm font-bold text-amber-400">{currentDescriber?.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs",
              isConnected ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
            )}>
              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            </div>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
          {isDescriber ? (
            <>
              {/* Describer sees the word */}
              <div className="p-8 rounded-2xl bg-amber-500/10 border-2 border-amber-500/40 text-center w-full max-w-sm">
                <p className="text-xs text-amber-400/50 mb-2">{hu ? 'Ird le EGY szotagos szavakkal' : 'Describe with ONE syllable words'}</p>
                <h2 className="text-3xl font-bold text-white">{gameState.selectedWord?.word}</h2>
                <p className="text-amber-400 text-sm mt-2">+{gameState.selectedWord?.points} {hu ? 'pont' : 'pts'}</p>
              </div>
              <div className="flex gap-3 w-full max-w-sm">
                <Button onClick={handleCorrect} className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white font-bold">
                  <Check className="w-5 h-5 mr-2" /> {hu ? 'Kitalalta!' : 'Guessed it!'}
                </Button>
                <Button onClick={handlePass} variant="outline" className="flex-1 h-14 text-amber-400 border-amber-500/30">
                  {hu ? 'Passz' : 'Pass'}
                </Button>
              </div>
              <Button onClick={handleEndGame} variant="ghost" className="text-red-400">
                {hu ? 'Jatek vege' : 'End Game'}
              </Button>
            </>
          ) : (
            <>
              {/* Guessers see hints */}
              <div className="p-8 rounded-2xl bg-amber-500/5 border border-amber-500/20 text-center w-full max-w-sm">
                <p className="text-amber-400 text-lg font-bold mb-2">{hu ? 'Talalj ki!' : 'Guess!'}</p>
                <p className="text-white/60">
                  {hu
                    ? `${currentDescriber?.name} egyszotagos szavakkal ir le valamit...`
                    : `${currentDescriber?.name} is describing something with one-syllable words...`}
                </p>
              </div>
              {/* Scoreboard */}
              <div className="bg-white/5 rounded-xl p-4 w-full max-w-sm border border-amber-500/10">
                <p className="text-xs text-amber-400/50 mb-2">{hu ? 'Allasok' : 'Scores'}</p>
                {players.map(p => (
                  <div key={p.id} className="flex items-center justify-between py-1">
                    <span className="text-white/70 text-sm">{p.name}</span>
                    <span className="text-amber-400 font-bold text-sm">{gameState.scores[p.id] || 0}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
        <ChatPanel />
      </div>
    );
  }

  // ── SELECT GUESSER ──
  if (gameState.phase === 'select-guesser') {
    return (
      <div className="min-h-screen bg-background flex flex-col relative">
        <Header title={hu ? 'Ki talalta ki?' : 'Who guessed it?'} />
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
          <div className="w-full max-w-md">
            <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-center">
              <p className="text-sm text-green-400 mb-1">{hu ? 'Kitalalt szo' : 'Guessed word'}</p>
              <h2 className="text-2xl font-bold text-white">{gameState.selectedWord?.word}</h2>
              <p className="text-green-400 text-sm mt-1">+{gameState.selectedWord?.points} {hu ? 'pont mindkettotoknek' : 'pts for both'}</p>
            </div>

            {isDescriber ? (
              <>
                <p className="text-center text-white/70 mb-4">{hu ? 'Ki talalta ki?' : 'Who guessed it?'}</p>
                <div className="space-y-3">
                  {players.map((player, index) => {
                    if (index === gameState.currentDescriberIndex) return null;
                    return (
                      <button
                        key={player.id}
                        onClick={() => handleSelectGuesser(index)}
                        className="w-full p-4 rounded-xl bg-white/5 border border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/10 transition-all flex items-center justify-between"
                      >
                        <span className="font-semibold text-lg text-white">{player.name}</span>
                        <span className="text-amber-400 text-sm">{gameState.scores[player.id] || 0} {hu ? 'pont' : 'pts'}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={handlePass}
                  className="w-full mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
                >
                  {hu ? 'Senki nem talalta ki' : 'Nobody guessed it'}
                </button>
              </>
            ) : (
              <p className="text-center text-amber-400/50">
                {hu ? `${currentDescriber?.name} valasztja ki a kitalalot...` : `${currentDescriber?.name} is selecting the guesser...`}
              </p>
            )}
          </div>
        </main>
        <ChatPanel />
      </div>
    );
  }

  // ── RESULTS ──
  if (gameState.phase === 'results') {
    const sortedPlayers = [...players].sort((a, b) => (gameState.scores[b.id] || 0) - (gameState.scores[a.id] || 0));
    return (
      <div className="min-h-screen bg-background flex flex-col relative">
        <Header title={hu ? 'Eredmenyek' : 'Results'} />
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
          <Trophy className="w-16 h-16 text-amber-400 mb-4" />
          <h3 className="text-2xl font-bold text-amber-400 mb-2">{hu ? 'Jatek vege!' : 'Game Over!'}</h3>
          <p className="text-white/50 mb-6">{gameState.cardsCompleted} {hu ? 'kartya kitalahva' : 'cards guessed'}</p>

          <div className="bg-white/5 rounded-2xl p-4 w-full max-w-sm border border-amber-500/20 mb-6">
            {sortedPlayers.map((p, i) => (
              <div key={p.id} className={cn(
                "flex items-center justify-between py-3",
                i === 0 && "text-amber-400"
              )}>
                <div className="flex items-center gap-3">
                  <span className={cn("text-lg font-bold", i === 0 ? "text-amber-400" : "text-white/50")}>
                    {i + 1}.
                  </span>
                  <span className={cn("font-semibold", i === 0 ? "text-amber-400" : "text-white/80")}>
                    {p.name}
                  </span>
                  {i === 0 && <Trophy className="w-4 h-4 text-amber-400" />}
                </div>
                <span className={cn("font-bold", i === 0 ? "text-amber-400" : "text-white/60")}>
                  {gameState.scores[p.id] || 0} {hu ? 'pont' : 'pts'}
                </span>
              </div>
            ))}
          </div>

          {isHost && (
            <Button onClick={handleNewGame} className="bg-amber-500 hover:bg-amber-600 text-black font-bold">
              <RotateCcw className="w-4 h-4 mr-2" /> {hu ? 'Uj jatek' : 'New Game'}
            </Button>
          )}
        </main>
        <ChatPanel />
      </div>
    );
  }

  return null;
}
