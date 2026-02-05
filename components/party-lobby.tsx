'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGame } from '@/lib/game-context';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  ChevronRight
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

// Ornate corner SVG component
function OrnateCorner({ className }: { className?: string }) {
  return (
    <svg className={className} width="32" height="32" viewBox="0 0 32 32" fill="none">
      <path d="M0 32V0H32C32 0 24 0 24 8C24 16 16 16 16 24C16 32 0 32 0 32Z" fill="currentColor" fillOpacity="0.3"/>
      <path d="M0 32V0H32" stroke="currentColor" strokeWidth="2" fill="none"/>
      <circle cx="8" cy="8" r="3" fill="#DC2626"/>
      <path d="M8 5L9.5 8L8 11L6.5 8L8 5Z" fill="currentColor"/>
    </svg>
  );
}

export function PartyLobby({ userId, username, onStartGame, onLeave }: PartyLobbyProps) {
  const { language } = useGame();
  const [view, setView] = useState<'menu' | 'create' | 'join' | 'lobby'>('menu');
  const [partyCode, setPartyCode] = useState('');
  const [partyName, setPartyName] = useState('');
  const [currentParty, setCurrentParty] = useState<Party | null>(null);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showGameSelector, setShowGameSelector] = useState(false);

  const supabase = createClient();
  const isHost = currentParty?.host_id === userId;
  const allReady = members.every(m => m.is_ready || m.user_id === currentParty?.host_id);
  const canStart = isHost && members.length >= 2 && allReady;

  const loadMembers = useCallback(async () => {
    if (!currentParty) return;

    const { data, error } = await supabase
      .from('party_members')
      .select(`
        id,
        user_id,
        is_ready,
        profiles (
          username,
          avatar_url
        )
      `)
      .eq('party_id', currentParty.id);

    if (error) {
      console.error('Error loading members:', error);
      return;
    }

    setMembers(data as PartyMember[]);
  }, [currentParty, supabase]);

  // Subscribe to party changes
  useEffect(() => {
    if (!currentParty) return;

    const channel = supabase
      .channel(`party:${currentParty.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'party_members',
          filter: `party_id=eq.${currentParty.id}`
        },
        () => {
          loadMembers();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'parties',
          filter: `id=eq.${currentParty.id}`
        },
        (payload) => {
          const updatedParty = payload.new as Party;
          setCurrentParty(updatedParty);
          
          if (updatedParty.status === 'playing') {
            onStartGame(updatedParty.game_type as GameType, updatedParty.id, members);
          }
        }
      )
      .subscribe();

    loadMembers();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentParty, supabase, onStartGame, members, loadMembers]);

  const handleCreateParty = async () => {
    if (!partyName.trim()) {
      setError(language === 'hu' ? 'Add meg a party nevet!' : 'Enter party name!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data: party, error: partyError } = await supabase
        .from('parties')
        .insert({
          code,
          name: partyName,
          host_id: userId,
          game_type: 'kings-cup',
          status: 'waiting',
          max_players: 10
        })
        .select()
        .single();

      if (partyError) throw partyError;

      const { error: memberError } = await supabase
        .from('party_members')
        .insert({
          party_id: party.id,
          user_id: userId,
          is_ready: true
        });

      if (memberError) throw memberError;

      setCurrentParty(party);
      setView('lobby');
    } catch (err) {
      console.error('Error creating party:', err);
      setError(language === 'hu' ? 'Hiba a party letrehozasakor' : 'Error creating party');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinParty = async () => {
    if (!partyCode.trim()) {
      setError(language === 'hu' ? 'Add meg a party kodot!' : 'Enter party code!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: party, error: partyError } = await supabase
        .from('parties')
        .select()
        .eq('code', partyCode.toUpperCase())
        .eq('status', 'waiting')
        .single();

      if (partyError || !party) {
        setError(language === 'hu' ? 'Party nem talalhato!' : 'Party not found!');
        return;
      }

      const { data: existingMember } = await supabase
        .from('party_members')
        .select()
        .eq('party_id', party.id)
        .eq('user_id', userId)
        .single();

      if (!existingMember) {
        const { error: memberError } = await supabase
          .from('party_members')
          .insert({
            party_id: party.id,
            user_id: userId,
            is_ready: false
          });

        if (memberError) throw memberError;
      }

      setCurrentParty(party);
      setView('lobby');
    } catch (err) {
      console.error('Error joining party:', err);
      setError(language === 'hu' ? 'Hiba a csatlakozaskor' : 'Error joining party');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReady = async () => {
    if (!currentParty || isHost) return;

    const newReadyState = !isReady;
    setIsReady(newReadyState);

    await supabase
      .from('party_members')
      .update({ is_ready: newReadyState })
      .eq('party_id', currentParty.id)
      .eq('user_id', userId);
  };

  const handleSelectGame = async (gameId: string) => {
    if (!currentParty || !isHost) return;

    await supabase
      .from('parties')
      .update({ game_type: gameId })
      .eq('id', currentParty.id);

    setCurrentParty({ ...currentParty, game_type: gameId });
    setShowGameSelector(false);
  };

  const handleStartGame = async () => {
    if (!currentParty || !canStart) return;

    await supabase
      .from('parties')
      .update({ status: 'playing' })
      .eq('id', currentParty.id);
  };

  const handleLeaveParty = async () => {
    if (!currentParty) return;

    await supabase
      .from('party_members')
      .delete()
      .eq('party_id', currentParty.id)
      .eq('user_id', userId);

    if (isHost) {
      await supabase
        .from('parties')
        .delete()
        .eq('id', currentParty.id);
    }

    setCurrentParty(null);
    setMembers([]);
    setIsReady(false);
    setView('menu');
  };

  const copyPartyCode = async () => {
    if (currentParty) {
      await navigator.clipboard.writeText(currentParty.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareParty = async () => {
    if (!currentParty) return;
    
    const shareData = {
      title: 'Drunk Deck Party',
      text: language === 'hu' 
        ? `Csatlakozz a "${currentParty.name}" partyhoz! Kod: ${currentParty.code}`
        : `Join "${currentParty.name}" party! Code: ${currentParty.code}`,
      url: `${window.location.origin}?party=${currentParty.code}`
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        copyPartyCode();
      }
    } else {
      copyPartyCode();
    }
  };

  // Menu view
  if (view === 'menu') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="relative flex items-center justify-center p-4 border-b border-gold/20">
          <Button 
            variant="ghost" 
            onClick={onLeave} 
            className="absolute left-4 text-gold/70 hover:text-gold hover:bg-gold/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-gold">Online Party</h1>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          {/* Logo/Icon */}
          <div className="relative mb-8">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-gold/30 to-gold/10 flex items-center justify-center border-2 border-gold/40">
              <Users className="w-14 h-14 text-gold" />
            </div>
            <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center border-2 border-gold/40">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>

          <h2 className="text-2xl font-bold text-white mb-2 text-center">
            {language === 'hu' ? 'Jatssz barataiddal!' : 'Play with friends!'}
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-xs">
            {language === 'hu' 
              ? 'Hozz letre partyt es hivd meg a barátaidat, vagy csatlakozz egy meglevohoz'
              : 'Create a party and invite friends, or join an existing one'}
          </p>

          <div className="w-full max-w-sm space-y-4">
            {/* Create Party Button */}
            <button
              onClick={() => setView('create')}
              className="w-full group relative overflow-hidden rounded-2xl border-2 border-gold/40 bg-gradient-to-br from-gold/20 to-gold/5 p-5 transition-all hover:border-gold/60 hover:from-gold/30 hover:to-gold/10"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center">
                  <Users className="w-7 h-7 text-black" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-lg text-white">
                    {language === 'hu' ? 'Party letrehozasa' : 'Create Party'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'hu' ? 'Te leszel a gazda' : 'You\'ll be the host'}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-gold/60 group-hover:text-gold transition-colors" />
              </div>
            </button>

            {/* Join Party Button */}
            <button
              onClick={() => setView('join')}
              className="w-full group relative overflow-hidden rounded-2xl border-2 border-border/40 bg-card/30 p-5 transition-all hover:border-gold/40 hover:bg-card/50"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-900/50 to-amber-950/50 border border-gold/30 flex items-center justify-center">
                  <UserPlus className="w-7 h-7 text-gold" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-bold text-lg text-white">
                    {language === 'hu' ? 'Csatlakozas' : 'Join Party'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {language === 'hu' ? 'Add meg a party kodot' : 'Enter the party code'}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-gold transition-colors" />
              </div>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Create party view
  if (view === 'create') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="relative flex items-center justify-center p-4 border-b border-gold/20">
          <Button 
            variant="ghost" 
            onClick={() => setView('menu')} 
            className="absolute left-4 text-gold/70 hover:text-gold hover:bg-gold/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-gold">
            {language === 'hu' ? 'Uj Party' : 'New Party'}
          </h1>
        </header>

        <main className="flex-1 px-6 py-8">
          <div className="max-w-sm mx-auto space-y-6">
            {/* Party Name Input */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-gold/80">
                {language === 'hu' ? 'Party neve' : 'Party name'}
              </label>
              <div className="relative">
                <Input
                  value={partyName}
                  onChange={(e) => setPartyName(e.target.value)}
                  placeholder={language === 'hu' ? 'Pl: Penteki buli' : 'E.g: Friday Night'}
                  className="h-14 bg-card/50 border-2 border-border/50 focus:border-gold/50 rounded-xl text-lg px-4"
                  maxLength={30}
                />
              </div>
            </div>

            {/* Info Card */}
            <div className="p-4 rounded-xl bg-gold/10 border border-gold/30">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-gold mt-0.5" />
                <div>
                  <p className="text-sm text-gold font-medium mb-1">
                    {language === 'hu' ? 'Tipp' : 'Tip'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {language === 'hu' 
                      ? 'A jatekot a lobbyban fogod tudni kivalasztani miutan letrehoztad a partyt'
                      : 'You can select the game in the lobby after creating the party'}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <Button
              onClick={handleCreateParty}
              disabled={loading || !partyName.trim()}
              className="w-full h-14 bg-gradient-to-r from-gold to-gold-dark hover:from-gold-dark hover:to-gold text-black font-bold text-lg rounded-xl disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Users className="w-5 h-5 mr-2" />
                  {language === 'hu' ? 'Party letrehozasa' : 'Create Party'}
                </>
              )}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Join party view
  if (view === 'join') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="relative flex items-center justify-center p-4 border-b border-gold/20">
          <Button 
            variant="ghost" 
            onClick={() => setView('menu')} 
            className="absolute left-4 text-gold/70 hover:text-gold hover:bg-gold/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-gold">
            {language === 'hu' ? 'Csatlakozas' : 'Join Party'}
          </h1>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-6 py-8">
          <div className="w-full max-w-sm space-y-6">
            {/* Icon */}
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border-2 border-gold/30 flex items-center justify-center">
                <UserPlus className="w-10 h-10 text-gold" />
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-xl font-bold text-white mb-2">
                {language === 'hu' ? 'Add meg a party kodot' : 'Enter party code'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {language === 'hu'
                  ? 'Kerd el a kodot a party gazdajatol'
                  : 'Get the code from the party host'}
              </p>
            </div>

            <div className="space-y-2">
              <Input
                value={partyCode}
                onChange={(e) => setPartyCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="text-center text-3xl font-bold tracking-[0.5em] bg-card/50 border-2 border-border/50 focus:border-gold/50 h-20 rounded-xl uppercase"
              />
              <p className="text-xs text-center text-muted-foreground">
                {language === 'hu' ? '6 karakteres kod' : '6-character code'}
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <Button
              onClick={handleJoinParty}
              disabled={loading || partyCode.length !== 6}
              className="w-full h-14 bg-gradient-to-r from-gold to-gold-dark hover:from-gold-dark hover:to-gold text-black font-bold text-lg rounded-xl disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {language === 'hu' ? 'Csatlakozas' : 'Join'}
                </>
              )}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Lobby view
  if (view === 'lobby' && currentParty) {
    const selectedGameInfo = GAMES.find(g => g.id === currentParty.game_type);

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="relative flex items-center justify-center p-4 border-b border-gold/20">
          <Button 
            variant="ghost" 
            onClick={handleLeaveParty} 
            className="absolute left-4 text-red-400 hover:text-red-300 hover:bg-red-500/10"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="ml-1 text-sm">{language === 'hu' ? 'Kilepes' : 'Leave'}</span>
          </Button>
          <h1 className="text-xl font-bold text-gold">{currentParty.name}</h1>
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6 pb-32">
          <div className="max-w-md mx-auto space-y-5">
            {/* Party Code Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gold/20 via-gold/10 to-transparent border-2 border-gold/40 p-5">
              <OrnateCorner className="absolute top-0 left-0 text-gold" />
              <OrnateCorner className="absolute top-0 right-0 text-gold rotate-90" />
              <OrnateCorner className="absolute bottom-0 right-0 text-gold rotate-180" />
              <OrnateCorner className="absolute bottom-0 left-0 text-gold -rotate-90" />
              
              <p className="text-sm text-gold/70 text-center mb-2">
                {language === 'hu' ? 'Party kod' : 'Party code'}
              </p>
              <div className="flex items-center justify-center gap-4">
                <p className="text-4xl font-bold text-gold tracking-[0.3em]">
                  {currentParty.code}
                </p>
              </div>
              <div className="flex justify-center gap-3 mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyPartyCode}
                  className="text-gold/70 hover:text-gold hover:bg-gold/10 gap-2"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? (language === 'hu' ? 'Masolva!' : 'Copied!') : (language === 'hu' ? 'Masolas' : 'Copy')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={shareParty}
                  className="text-gold/70 hover:text-gold hover:bg-gold/10 gap-2"
                >
                  <Share2 className="w-4 h-4" />
                  {language === 'hu' ? 'Megosztas' : 'Share'}
                </Button>
              </div>
            </div>

            {/* Game Selector */}
            <button
              onClick={() => isHost && setShowGameSelector(true)}
              disabled={!isHost}
              className={cn(
                'w-full rounded-2xl border-2 p-4 transition-all text-left',
                isHost 
                  ? 'border-gold/30 bg-card/50 hover:border-gold/50 cursor-pointer' 
                  : 'border-border/30 bg-card/30 cursor-default'
              )}
            >
              <div className="flex items-center gap-4">
                {selectedGameInfo && (
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/50">
                    <Image
                      src={selectedGameInfo.icon}
                      alt={selectedGameInfo.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-xs text-muted-foreground mb-1">
                    {language === 'hu' ? 'Kivalasztott jatek' : 'Selected game'}
                  </p>
                  <p className="font-bold text-white text-lg">
                    {selectedGameInfo 
                      ? (language === 'hu' ? selectedGameInfo.name : selectedGameInfo.nameEn)
                      : (language === 'hu' ? 'Valassz jatekot' : 'Select a game')
                    }
                  </p>
                </div>
                {isHost && (
                  <div className="flex items-center gap-1 text-gold">
                    <Gamepad2 className="w-5 h-5" />
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            </button>

            {/* Members List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-medium text-white">
                  {language === 'hu' ? 'Jatekosok' : 'Players'} ({members.length}/{currentParty.max_players})
                </p>
                <p className="text-sm text-muted-foreground">
                  {allReady 
                    ? (language === 'hu' ? 'Mindenki kesz!' : 'Everyone ready!')
                    : (language === 'hu' ? 'Varakozas...' : 'Waiting...')
                  }
                </p>
              </div>
              
              <div className="space-y-2">
                {members.map((member) => {
                  const isMemberHost = member.user_id === currentParty.host_id;
                  const memberReady = member.is_ready || isMemberHost;
                  const isMe = member.user_id === userId;

                  return (
                    <div
                      key={member.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl border-2 transition-all',
                        isMe ? 'bg-gold/10 border-gold/30' : 'bg-card/30 border-border/30',
                        memberReady && !isMe && 'border-green-500/30 bg-green-500/5'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          'w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold',
                          isMemberHost 
                            ? 'bg-gradient-to-br from-gold to-gold-dark text-black'
                            : 'bg-gradient-to-br from-amber-900/50 to-amber-950/50 border border-gold/30 text-gold'
                        )}>
                          {member.profiles?.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className={cn(
                              'font-semibold',
                              isMe ? 'text-gold' : 'text-white'
                            )}>
                              {member.profiles?.username || 'Unknown'}
                              {isMe && <span className="text-gold/60 ml-1">({language === 'hu' ? 'Te' : 'You'})</span>}
                            </p>
                            {isMemberHost && (
                              <Crown className="w-4 h-4 text-gold" />
                            )}
                          </div>
                          {!isMemberHost && (
                            <p className={cn(
                              'text-xs',
                              memberReady ? 'text-green-400' : 'text-muted-foreground'
                            )}>
                              {memberReady
                                ? (language === 'hu' ? 'Kesz' : 'Ready')
                                : (language === 'hu' ? 'Nem kesz' : 'Not ready')}
                            </p>
                          )}
                          {isMemberHost && (
                            <p className="text-xs text-gold/60">
                              {language === 'hu' ? 'Gazda' : 'Host'}
                            </p>
                          )}
                        </div>
                      </div>
                      {memberReady && !isMemberHost && (
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Check className="w-5 h-5 text-green-400" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>

        {/* Fixed Bottom Action */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent pt-8">
          <div className="max-w-md mx-auto">
            {!isHost && (
              <Button
                onClick={handleToggleReady}
                className={cn(
                  'w-full h-14 font-bold text-lg rounded-xl transition-all',
                  isReady
                    ? 'bg-green-500/20 border-2 border-green-500/50 text-green-400 hover:bg-green-500/30'
                    : 'bg-gradient-to-r from-gold to-gold-dark hover:from-gold-dark hover:to-gold text-black'
                )}
              >
                {isReady ? (
                  <>
                    <Check className="w-5 h-5 mr-2" />
                    {language === 'hu' ? 'Kesz vagyok!' : 'I\'m Ready!'}
                  </>
                ) : (
                  language === 'hu' ? 'Kesz vagyok' : 'Ready'
                )}
              </Button>
            )}

            {isHost && (
              <div className="space-y-3">
                {!allReady && members.length >= 2 && (
                  <p className="text-sm text-center text-muted-foreground">
                    {language === 'hu'
                      ? 'Varj, amig mindenki keszen all...'
                      : 'Waiting for everyone to be ready...'}
                  </p>
                )}
                {members.length < 2 && (
                  <p className="text-sm text-center text-muted-foreground">
                    {language === 'hu'
                      ? 'Legalabb 2 jatekos szukseges'
                      : 'At least 2 players required'}
                  </p>
                )}
                <Button
                  onClick={handleStartGame}
                  disabled={!canStart}
                  className="w-full h-14 bg-gradient-to-r from-gold to-gold-dark hover:from-gold-dark hover:to-gold text-black font-bold text-lg rounded-xl disabled:opacity-40 disabled:cursor-not-allowed gap-2"
                >
                  <Play className="w-5 h-5" />
                  {language === 'hu' ? 'Jatek inditasa' : 'Start Game'}
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Game Selector Modal */}
        {showGameSelector && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-end justify-center">
            <div className="w-full max-w-lg bg-card rounded-t-3xl max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
              <div className="flex items-center justify-between p-4 border-b border-border/30">
                <h3 className="text-lg font-bold text-gold">
                  {language === 'hu' ? 'Valassz jatekot' : 'Select Game'}
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowGameSelector(false)}
                  className="text-muted-foreground hover:text-white"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
              <div className="overflow-y-auto p-4 space-y-3 max-h-[70vh]">
                {GAMES.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handleSelectGame(game.id)}
                    className={cn(
                      'w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left',
                      currentParty.game_type === game.id
                        ? 'bg-gold/20 border-gold'
                        : 'bg-card/50 border-border/30 hover:border-gold/50'
                    )}
                  >
                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/50 flex-shrink-0">
                      <Image
                        src={game.icon}
                        alt={game.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-white">
                        {language === 'hu' ? game.name : game.nameEn}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        {language === 'hu' ? game.description : game.descriptionEn}
                      </p>
                      <p className="text-xs text-gold/60 mt-1">
                        {game.minPlayers}-{game.maxPlayers} {language === 'hu' ? 'jatekos' : 'players'}
                      </p>
                    </div>
                    {currentParty.game_type === game.id && (
                      <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center flex-shrink-0">
                        <Check className="w-5 h-5 text-black" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
