'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGame } from '@/lib/game-context';
import { createClient } from '@/lib/supabase/client';
import { GAMES, GameInfo } from '@/lib/game-catalog';
import type { GameType } from '@/lib/game-types';
import { 
  ArrowLeft, 
  Users, 
  Copy, 
  Check, 
  Crown, 
  UserPlus,
  Play,
  RefreshCw,
  Share2,
  Gamepad2,
  Sparkles,
  X,
  ChevronRight,
  QrCode,
  Wifi
} from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface PartyLobbyProps {
  userId: string;
  username: string;
  onStartGame: (gameType: GameType, partyId: string, members: any[]) => void;
  onLeave: () => void;
}

interface Party {
  id: string;
  code: string;
  name: string;
  host_id: string;
  game_type: string;
  status: string;
  max_players: number;
}

interface PartyMember {
  id: string;
  user_id: string;
  is_ready: boolean;
  profiles: {
    username: string;
    avatar_url?: string;
  };
}

// ---- Shared Sub-Components ----

function GoldDivider() {
  return (
    <div className="flex items-center gap-2 my-2">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent to-gold/25" />
      <span className="text-gold text-[10px] opacity-60">&#9670;</span>
      <div className="flex-1 h-px bg-gradient-to-l from-transparent to-gold/25" />
    </div>
  );
}

function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const colors = ['#8B0000', '#1a3a6b', '#1a4a1a', '#4a1a6b', '#4a3a00', '#2a4a1a'];
  const c = colors[(name?.charCodeAt(0) || 0) % colors.length];
  return (
    <div
      className="rounded-full border-2 border-gold/30 flex items-center justify-center font-extrabold text-white shrink-0"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.4,
        background: `linear-gradient(135deg, ${c}, ${c}88)`,
      }}
    >
      {name?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

function BackBtn({ onClick, label = 'Vissza' }: { onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-gold text-sm font-medium bg-transparent border-none cursor-pointer py-1"
    >
      <ArrowLeft className="w-4 h-4" />
      {label}
    </button>
  );
}

function GoldButton({
  children,
  onClick,
  disabled = false,
  variant = 'gold',
  className: extraClass,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'gold' | 'outline' | 'ghost' | 'danger' | 'success';
  className?: string;
}) {
  const base =
    'w-full py-4 px-5 rounded-2xl border-none cursor-pointer text-[15px] font-bold tracking-wide transition-all flex items-center justify-center gap-2';
  const variants: Record<string, string> = {
    gold: 'bg-gradient-to-br from-gold-light via-gold to-gold-dark text-black shadow-[0_4px_20px_rgba(212,175,55,0.25)]',
    outline: 'bg-transparent text-gold border-[1.5px] border-gold/30',
    ghost: 'bg-secondary text-white border border-border',
    danger: 'bg-destructive/10 text-destructive border border-destructive/30',
    success: 'bg-green-500/10 text-green-500 border border-green-500/30',
  };

  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(base, variants[variant], disabled && 'opacity-40 cursor-not-allowed', extraClass)}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-muted-foreground text-[11px] tracking-widest uppercase mb-2">
      {children}
    </div>
  );
}

// ---- Main Component ----

export function PartyLobby({ userId, username, onStartGame, onLeave }: PartyLobbyProps) {
  const { language } = useGame();
  const t = language === 'hu';

  const [view, setView] = useState<'menu' | 'create-setup' | 'create-invite' | 'create-lobby' | 'join' | 'guest-lobby'>('menu');
  const [partyName, setPartyName] = useState('');
  const [selectedGameId, setSelectedGameId] = useState<string>('kings-cup');
  const [currentParty, setCurrentParty] = useState<Party | null>(null);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [foundParty, setFoundParty] = useState<Party | null>(null);
  const [searching, setSearching] = useState(false);
  const [showGameSelector, setShowGameSelector] = useState(false);

  const supabase = createClient();
  const isHost = currentParty?.host_id === userId;
  const allReady = members.every(m => m.is_ready || m.user_id === currentParty?.host_id);
  const canStart = isHost && members.length >= 2 && allReady;

  const loadMembers = useCallback(async () => {
    if (!currentParty) return;
    const { data } = await supabase
      .from('party_members')
      .select('id, user_id, is_ready, profiles (username, avatar_url)')
      .eq('party_id', currentParty.id);
    if (data) setMembers(data as PartyMember[]);
  }, [currentParty, supabase]);

  // Realtime subscription
  useEffect(() => {
    if (!currentParty) return;
    const channel = supabase
      .channel(`party:${currentParty.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'party_members', filter: `party_id=eq.${currentParty.id}` }, () => loadMembers())
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'parties', filter: `id=eq.${currentParty.id}` }, (payload) => {
        const updated = payload.new as Party;
        setCurrentParty(updated);
        if (updated.status === 'playing') onStartGame(updated.game_type as GameType, updated.id, members);
      })
      .subscribe();
    loadMembers();
    return () => { supabase.removeChannel(channel); };
  }, [currentParty, supabase, onStartGame, members, loadMembers]);

  // ---- Handlers ----
  const handleCreateParty = async () => {
    if (!partyName.trim()) { setError(t ? 'Add meg a party nevet!' : 'Enter party name!'); return; }
    setLoading(true);
    setError('');
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: party, error: partyError } = await supabase
        .from('parties')
        .insert({ code, name: partyName, host_id: userId, game_type: selectedGameId, status: 'waiting', max_players: 10 })
        .select()
        .single();
      if (partyError) throw partyError;
      await supabase.from('party_members').insert({ party_id: party.id, user_id: userId, is_ready: true });
      setCurrentParty(party);
      setView('create-invite');
    } catch {
      setError(t ? 'Hiba a party letrehozasakor' : 'Error creating party');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchParty = async () => {
    if (joinCode.length !== 6) return;
    setSearching(true);
    setFoundParty(null);
    setError('');
    try {
      const { data: party } = await supabase
        .from('parties')
        .select()
        .eq('code', joinCode.toUpperCase())
        .eq('status', 'waiting')
        .single();
      if (!party) { setError(t ? 'Party nem talalhato!' : 'Party not found!'); return; }
      setFoundParty(party);
    } catch {
      setError(t ? 'Party nem talalhato!' : 'Party not found!');
    } finally {
      setSearching(false);
    }
  };

  const handleJoinParty = async () => {
    if (!foundParty) return;
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('party_members')
        .select()
        .eq('party_id', foundParty.id)
        .eq('user_id', userId)
        .single();
      if (!existing) {
        await supabase.from('party_members').insert({ party_id: foundParty.id, user_id: userId, is_ready: false });
      }
      setCurrentParty(foundParty);
      setView('guest-lobby');
    } catch {
      setError(t ? 'Hiba a csatlakozaskor' : 'Error joining');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReady = async () => {
    if (!currentParty || isHost) return;
    const next = !isReady;
    setIsReady(next);
    await supabase.from('party_members').update({ is_ready: next }).eq('party_id', currentParty.id).eq('user_id', userId);
  };

  const handleSelectGame = async (gameId: string) => {
    if (!currentParty || !isHost) return;
    await supabase.from('parties').update({ game_type: gameId }).eq('id', currentParty.id);
    setCurrentParty({ ...currentParty, game_type: gameId });
    setSelectedGameId(gameId);
    setShowGameSelector(false);
  };

  const handleStartGame = async () => {
    if (!currentParty || !canStart) return;
    await supabase.from('parties').update({ status: 'playing' }).eq('id', currentParty.id);
  };

  const handleLeaveParty = async () => {
    if (!currentParty) return;
    await supabase.from('party_members').delete().eq('party_id', currentParty.id).eq('user_id', userId);
    if (isHost) await supabase.from('parties').delete().eq('id', currentParty.id);
    setCurrentParty(null);
    setMembers([]);
    setIsReady(false);
    setView('menu');
  };

  const copyCode = async () => {
    if (!currentParty) return;
    try {
      await navigator.clipboard.writeText(currentParty.code);
    } catch { /* fallback */ }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareParty = async () => {
    if (!currentParty) return;
    const shareData = {
      title: 'Drunk Deck Party',
      text: t ? `Csatlakozz: "${currentParty.name}" - Kod: ${currentParty.code}` : `Join "${currentParty.name}" - Code: ${currentParty.code}`,
      url: `${window.location.origin}?party=${currentParty.code}`,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch { copyCode(); }
    } else {
      copyCode();
    }
  };

  // ==========================
  // MENU VIEW
  // ==========================
  if (view === 'menu') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="p-4 pb-5 border-b border-gold/10">
          <div className="flex justify-between items-center">
            <BackBtn onClick={onLeave} />
            <div className="flex items-center gap-2">
              <Avatar name={username} size={32} />
              <span className="text-white text-sm font-semibold">{username}</span>
            </div>
          </div>
          <div className="mt-5">
            <h2 className="text-white text-2xl font-extrabold m-0">Lobby</h2>
            <p className="text-muted-foreground text-sm mt-1 m-0">{t ? 'Jatssz barataiddal online' : 'Play with friends online'}</p>
          </div>
        </div>

        <div className="flex-1 p-6 flex flex-col gap-4">
          {/* Create party card */}
          <button
            onClick={() => setView('create-setup')}
            className="relative overflow-hidden rounded-2xl border-[1.5px] border-gold/30 bg-gradient-to-br from-secondary to-border/50 p-6 text-left cursor-pointer transition-all hover:border-gold/50 active:scale-[0.98]"
          >
            <div className="absolute -top-5 -right-5 text-[80px] opacity-[0.06] leading-none pointer-events-none">
              <Sparkles className="w-20 h-20" />
            </div>
            <div className="text-4xl mb-3"><Sparkles className="w-9 h-9 text-gold" /></div>
            <div className="text-gold text-lg font-extrabold mb-1">{t ? 'Parti letrehozasa' : 'Create Party'}</div>
            <div className="text-muted-foreground text-sm leading-relaxed">
              {t
                ? 'Hivj meg baratokat linkkel vagy 6 jegyu koddal. Te valasztod a jatekot.'
                : 'Invite friends with a link or 6-digit code. You choose the game.'}
            </div>
          </button>

          {/* Join party card */}
          <button
            onClick={() => setView('join')}
            className="relative overflow-hidden rounded-2xl border-[1.5px] border-border bg-secondary p-6 text-left cursor-pointer transition-all hover:border-gold/30 active:scale-[0.98]"
          >
            <div className="absolute -top-5 -right-5 text-[80px] opacity-[0.04] leading-none pointer-events-none">
              <UserPlus className="w-20 h-20" />
            </div>
            <div className="text-4xl mb-3"><UserPlus className="w-9 h-9 text-gold/70" /></div>
            <div className="text-white text-lg font-extrabold mb-1">{t ? 'Csatlakozas' : 'Join Party'}</div>
            <div className="text-muted-foreground text-sm leading-relaxed">
              {t
                ? 'Add meg a 6 jegyu kodot amit a parti gazdajatol kaptal.'
                : 'Enter the 6-digit code you got from the party host.'}
            </div>
          </button>
        </div>
      </div>
    );
  }

  // ==========================
  // CREATE - STEP 1: SETUP
  // ==========================
  if (view === 'create-setup') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="p-4 pb-5 border-b border-gold/10">
          <BackBtn onClick={() => setView('menu')} />
          <h2 className="mt-4 mb-1 text-white text-[22px] font-extrabold">{t ? 'Parti letrehozasa' : 'Create Party'}</h2>
          <p className="m-0 text-muted-foreground text-sm">{t ? 'Valaszd ki a jatekot es add meg a nevet' : 'Choose the game and set a name'}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Party name */}
          <div className="mb-6">
            <SectionLabel>{t ? 'Parti neve' : 'Party name'}</SectionLabel>
            <input
              value={partyName}
              onChange={e => setPartyName(e.target.value)}
              placeholder={t ? 'Pl: Penteki buli' : 'E.g: Friday Night'}
              maxLength={30}
              className="w-full py-3.5 px-4 bg-secondary border-[1.5px] border-border rounded-xl text-white text-base font-normal outline-none focus:border-gold/50 transition-colors"
            />
          </div>

          {/* Game select */}
          <div className="mb-6">
            <SectionLabel>{t ? 'Jatek valasztasa' : 'Choose game'}</SectionLabel>
            <div className="flex flex-col gap-2.5">
              {GAMES.map(g => {
                const selected = selectedGameId === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => setSelectedGameId(g.id)}
                    className={cn(
                      'flex items-center gap-3.5 p-4 rounded-2xl border-[1.5px] cursor-pointer transition-all text-left',
                      selected
                        ? 'bg-gold/10 border-gold/50'
                        : 'bg-secondary border-border hover:border-gold/20'
                    )}
                  >
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/50 shrink-0">
                      <Image src={g.icon} alt={g.name} width={56} height={56} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-[15px] font-bold">{t ? g.name : g.nameEn}</div>
                      <div className="text-muted-foreground text-xs mt-0.5 truncate">
                        {t ? g.description : g.descriptionEn} &middot; {g.minPlayers}-{g.maxPlayers} {t ? 'fo' : 'players'}
                      </div>
                    </div>
                    {selected && <Check className="w-5 h-5 text-gold shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm mb-4">
              {error}
            </div>
          )}
        </div>

        <div className="p-6 pt-0">
          <GoldButton onClick={handleCreateParty} disabled={!partyName.trim() || loading}>
            {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : (t ? 'Tovabb - Meghivo letrehozasa' : 'Next - Create Invite')}
          </GoldButton>
        </div>
      </div>
    );
  }

  // ==========================
  // CREATE - STEP 2: INVITE
  // ==========================
  if (view === 'create-invite' && currentParty) {
    const selGame = GAMES.find(g => g.id === currentParty.game_type);
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="p-4 pb-5 border-b border-gold/10">
          <BackBtn onClick={() => setView('create-setup')} label={t ? 'Szerkesztes' : 'Edit'} />
          <h2 className="mt-4 mb-1 text-white text-[22px] font-extrabold">{t ? 'Meghivo' : 'Invite'}</h2>
          <p className="m-0 text-muted-foreground text-sm">{t ? 'Hivd meg a barataidat' : 'Invite your friends'}</p>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {/* Party info */}
          <div className="bg-secondary rounded-2xl p-5 border border-gold/15">
            <div className="flex gap-3.5 items-center mb-4">
              {selGame && (
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-black/50 shrink-0">
                  <Image src={selGame.icon} alt={selGame.name} width={48} height={48} className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <div className="text-white text-base font-bold">{currentParty.name}</div>
                <div className="text-muted-foreground text-sm">{selGame ? (t ? selGame.name : selGame.nameEn) : ''}</div>
              </div>
            </div>
            <GoldDivider />
          </div>

          {/* Code display */}
          <div className="bg-gradient-to-br from-background to-secondary rounded-2xl p-6 border-2 border-gold/20 text-center">
            <SectionLabel>{t ? 'Csatlakozasi kod' : 'Join code'}</SectionLabel>
            <div className="text-gold text-[42px] font-black tracking-[12px] my-4 tabular-nums">
              {currentParty.code}
            </div>
            <div className="flex gap-2.5">
              <button
                onClick={copyCode}
                className={cn(
                  'flex-1 py-3 rounded-xl text-sm font-semibold cursor-pointer transition-all flex items-center justify-center gap-2 border',
                  copied
                    ? 'bg-green-500/10 border-green-500/30 text-green-500'
                    : 'bg-secondary border-border text-white hover:border-gold/30'
                )}
              >
                {copied ? <><Check className="w-4 h-4" /> {t ? 'Masolva!' : 'Copied!'}</> : <><Copy className="w-4 h-4" /> {t ? 'Kod masolasa' : 'Copy code'}</>}
              </button>
              <button
                onClick={shareParty}
                className="flex-1 py-3 bg-secondary border border-border rounded-xl text-white text-sm font-semibold cursor-pointer hover:border-gold/30 transition-all flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" /> {t ? 'Link kuldese' : 'Share link'}
              </button>
            </div>
          </div>

          {/* QR placeholder */}
          <div className="bg-secondary rounded-2xl p-5 text-center border border-border">
            <SectionLabel>{t ? 'QR kod beolvasassal' : 'Scan QR code'}</SectionLabel>
            <div className="w-[120px] h-[120px] bg-white mx-auto rounded-xl flex items-center justify-center mt-3">
              <QrCode className="w-16 h-16 text-black/60" />
            </div>
            <div className="text-muted-foreground text-xs mt-3">
              {t ? 'Mutasd a kepernyor a baratodnak' : 'Show this screen to your friend'}
            </div>
          </div>
        </div>

        <div className="p-6 pt-0">
          <GoldButton onClick={() => setView('create-lobby')}>
            {t ? 'Lobby megnyitasa' : 'Open Lobby'}
          </GoldButton>
        </div>
      </div>
    );
  }

  // ==========================
  // CREATE - STEP 3: HOST LOBBY
  // ==========================
  if ((view === 'create-lobby') && currentParty) {
    const selGame = GAMES.find(g => g.id === currentParty.game_type);
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gold/10">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Wifi className="w-3.5 h-3.5 text-green-500" />
              <span className="text-green-500 text-xs font-semibold">Live</span>
            </div>
            <button
              onClick={copyCode}
              className={cn(
                'py-1.5 px-3 rounded-lg text-xs font-mono cursor-pointer border transition-all',
                copied ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-secondary border-border text-muted-foreground hover:text-gold'
              )}
            >
              {currentParty.code}
            </button>
          </div>
          <h2 className="mt-4 mb-0 text-white text-xl font-extrabold">{currentParty.name}</h2>
        </div>

        {/* Game selector (horizontal scroll) */}
        <div className="px-4 py-4 border-b border-secondary">
          <SectionLabel>{t ? 'Kivalasztott jatek (te valasztod)' : 'Selected game (you choose)'}</SectionLabel>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {GAMES.map(g => {
              const active = currentParty.game_type === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => handleSelectGame(g.id)}
                  className={cn(
                    'shrink-0 flex items-center gap-2 py-2.5 px-4 rounded-3xl border-[1.5px] cursor-pointer text-sm font-semibold transition-all',
                    active
                      ? 'bg-gold/15 border-gold/60 text-white'
                      : 'bg-secondary border-border text-muted-foreground hover:border-gold/30'
                  )}
                >
                  <div className="w-6 h-6 rounded overflow-hidden shrink-0">
                    <Image src={g.icon} alt={g.name} width={24} height={24} className="w-full h-full object-cover" />
                  </div>
                  {t ? g.name : g.nameEn}
                </button>
              );
            })}
          </div>
        </div>

        {/* Members */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex justify-between items-center mb-3">
            <SectionLabel>
              {t ? 'Jatekosok' : 'Players'} ({members.length}/{currentParty.max_players})
            </SectionLabel>
          </div>

          <div className="flex flex-col gap-2">
            {members.map(m => {
              const isMemberHost = m.user_id === currentParty.host_id;
              const memberReady = m.is_ready || isMemberHost;
              const isMe = m.user_id === userId;
              return (
                <div
                  key={m.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border transition-all',
                    isMemberHost ? 'bg-gold/5 border-gold/20' : 'bg-secondary border-border',
                    isMe && !isMemberHost && 'border-gold/20'
                  )}
                >
                  <Avatar name={m.profiles?.username || '?'} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white text-sm font-semibold truncate">{m.profiles?.username || 'Unknown'}</span>
                      {isMemberHost && (
                        <span className="bg-gold/15 text-gold text-[10px] px-1.5 py-0.5 rounded font-bold">HOST</span>
                      )}
                      {isMe && !isMemberHost && (
                        <span className="bg-gold/10 text-gold/60 text-[10px] px-1.5 py-0.5 rounded">Te</span>
                      )}
                    </div>
                    <div className={cn('text-xs mt-0.5', memberReady ? 'text-green-400' : 'text-muted-foreground')}>
                      {isMemberHost ? (t ? 'Gazda' : 'Host') : memberReady ? (t ? 'Kesz' : 'Ready') : (t ? 'Var...' : 'Waiting...')}
                    </div>
                  </div>
                  {isMemberHost && <Crown className="w-5 h-5 text-gold shrink-0" />}
                  {memberReady && !isMemberHost && <Check className="w-5 h-5 text-green-400 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom actions */}
        <div className="p-4 pb-8 flex flex-col gap-2.5 bg-gradient-to-t from-background via-background to-transparent">
          <div className="text-center text-muted-foreground text-xs mb-1">
            {members.filter(m => m.is_ready || m.user_id === currentParty.host_id).length}/{members.length} {t ? 'jatekos kesz' : 'players ready'}
          </div>
          <GoldButton onClick={handleStartGame} disabled={!canStart}>
            <Play className="w-5 h-5" /> {t ? 'Jatek inditasa!' : 'Start Game!'}
          </GoldButton>
          <GoldButton onClick={handleLeaveParty} variant="danger">
            {t ? 'Parti feloszlatasa' : 'Dissolve Party'}
          </GoldButton>
        </div>
      </div>
    );
  }

  // ==========================
  // JOIN PARTY
  // ==========================
  if (view === 'join') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="p-4 pb-6 border-b border-gold/10">
          <BackBtn onClick={() => { setView('menu'); setJoinCode(''); setFoundParty(null); setError(''); }} />
          <h2 className="mt-4 mb-1 text-white text-[22px] font-extrabold">{t ? 'Csatlakozas' : 'Join Party'}</h2>
          <p className="m-0 text-muted-foreground text-sm">{t ? 'Add meg a 6 jegyu kodot' : 'Enter the 6-digit code'}</p>
        </div>

        <div className="flex-1 p-6 flex flex-col gap-5">
          {/* Code input */}
          <div className="text-center">
            <SectionLabel>{t ? 'Kod beirasa' : 'Enter code'}</SectionLabel>
            <input
              value={joinCode}
              onChange={e => {
                setJoinCode(e.target.value.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6));
                setFoundParty(null);
                setError('');
              }}
              placeholder="ABC123"
              maxLength={6}
              autoFocus
              className="w-full py-4 px-4 bg-secondary border-[1.5px] border-border rounded-xl text-gold text-[28px] font-black tracking-[8px] text-center uppercase outline-none focus:border-gold/50 transition-colors mt-4"
            />

            {/* Code boxes visualization */}
            <div className="flex gap-2 mt-3 justify-center">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    'w-10 h-12 rounded-xl border-[1.5px] flex items-center justify-center text-gold text-xl font-extrabold transition-all',
                    joinCode[i] ? 'bg-border border-gold/40' : 'bg-secondary border-border'
                  )}
                >
                  {joinCode[i] || ''}
                </div>
              ))}
            </div>
          </div>

          <GoldButton onClick={handleSearchParty} disabled={joinCode.length !== 6 || searching}>
            {searching ? <><RefreshCw className="w-4 h-4 animate-spin" /> {t ? 'Kereses...' : 'Searching...'}</> : (t ? 'Parti keresese' : 'Search Party')}
          </GoldButton>

          {error && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
              {error}
            </div>
          )}

          {/* Found party */}
          {foundParty && (
            <div className="bg-secondary rounded-2xl p-5 border-[1.5px] border-green-500/30 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="text-green-500 text-xs font-bold mb-3 tracking-wider flex items-center gap-1.5">
                <Check className="w-4 h-4" /> {t ? 'PARTI MEGTALALVA' : 'PARTY FOUND'}
              </div>
              <div className="flex gap-3.5 items-center mb-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/50 shrink-0">
                  {(() => {
                    const g = GAMES.find(gm => gm.id === foundParty.game_type);
                    return g ? <Image src={g.icon} alt={g.name} width={56} height={56} className="w-full h-full object-cover" /> : null;
                  })()}
                </div>
                <div>
                  <div className="text-white text-lg font-extrabold">{foundParty.name}</div>
                  <div className="text-muted-foreground text-sm">
                    {GAMES.find(gm => gm.id === foundParty.game_type)?.[t ? 'name' : 'nameEn'] || foundParty.game_type}
                  </div>
                </div>
              </div>
              <GoldButton onClick={handleJoinParty} variant="success" disabled={loading}>
                {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> {t ? 'Csatlakozas...' : 'Joining...'}</> : (t ? 'Belepes a partiba!' : 'Join Party!')}
              </GoldButton>
            </div>
          )}

          <GoldDivider />
        </div>
      </div>
    );
  }

  // ==========================
  // GUEST LOBBY (joined as non-host)
  // ==========================
  if (view === 'guest-lobby' && currentParty) {
    const selGame = GAMES.find(g => g.id === currentParty.game_type);
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="p-4 border-b border-gold/10">
          <div className="flex items-center gap-2">
            <Wifi className="w-3.5 h-3.5 text-green-500" />
            <span className="text-green-500 text-xs font-semibold">{t ? 'Csatlakozva' : 'Connected'}</span>
          </div>
          <h2 className="mt-3 mb-1 text-white text-xl font-extrabold">{currentParty.name}</h2>
          <div className="text-muted-foreground text-sm flex gap-2 items-center">
            {selGame && (
              <div className="w-5 h-5 rounded overflow-hidden shrink-0">
                <Image src={selGame.icon} alt={selGame.name} width={20} height={20} className="w-full h-full object-cover" />
              </div>
            )}
            <span>{selGame ? (t ? selGame.name : selGame.nameEn) : ''}</span>
            <span>&middot;</span>
            <span>{t ? 'Kod:' : 'Code:'} {currentParty.code}</span>
          </div>
        </div>

        {/* Members */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <SectionLabel>{t ? 'Jatekosok' : 'Players'} ({members.length})</SectionLabel>
          <div className="flex flex-col gap-2 mt-2">
            {members.map(m => {
              const isMemberHost = m.user_id === currentParty.host_id;
              const memberReady = m.is_ready || isMemberHost;
              const isMe = m.user_id === userId;
              return (
                <div
                  key={m.id}
                  className={cn(
                    'flex items-center gap-3 p-3.5 rounded-xl border transition-all',
                    isMe ? 'bg-gold/5 border-gold/20' : 'bg-secondary border-border'
                  )}
                >
                  <Avatar name={m.profiles?.username || '?'} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-white text-sm font-semibold truncate">{m.profiles?.username || 'Unknown'}</span>
                      {isMemberHost && <span className="bg-gold/15 text-gold text-[10px] px-1.5 py-0.5 rounded font-bold">HOST</span>}
                      {isMe && <span className="bg-gold/10 text-gold/60 text-[10px] px-1.5 py-0.5 rounded">Te</span>}
                    </div>
                    <div className={cn('text-xs mt-0.5', memberReady ? 'text-green-400' : 'text-muted-foreground')}>
                      {memberReady ? (t ? 'Kesz' : 'Ready') : (t ? 'Nem kesz' : 'Not ready')}
                    </div>
                  </div>
                  {isMemberHost && <Crown className="w-5 h-5 text-gold shrink-0" />}
                </div>
              );
            })}
          </div>

          {/* Waiting message */}
          <div className="mt-5 p-4 bg-secondary rounded-xl text-center border border-border">
            <RefreshCw className="w-6 h-6 text-muted-foreground mx-auto mb-2 animate-spin" style={{ animationDuration: '3s' }} />
            <div className="text-muted-foreground text-sm">{t ? 'Vard meg a host inditasat' : 'Waiting for host to start'}</div>
          </div>
        </div>

        <div className="p-4 pb-8 flex flex-col gap-2.5">
          <GoldButton onClick={handleToggleReady} variant={isReady ? 'success' : 'gold'}>
            {isReady ? <><Check className="w-5 h-5" /> {t ? 'Kesz vagyok!' : "I'm Ready!"}</> : (t ? 'Kesz vagyok' : 'Ready')}
          </GoldButton>
          <GoldButton onClick={handleLeaveParty} variant="danger">
            {t ? 'Kilepes a partibol' : 'Leave Party'}
          </GoldButton>
        </div>
      </div>
    );
  }

  return null;
}
