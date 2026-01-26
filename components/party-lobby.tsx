'use client';

import { useState, useEffect } from 'react';
import { useGame } from '@/lib/game-context';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { GAMES } from '@/lib/game-catalog';
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
  Link as LinkIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';

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

export function PartyLobby({ userId, username, onStartGame, onLeave }: PartyLobbyProps) {
  const { language } = useGame();
  const [view, setView] = useState<'menu' | 'create' | 'join' | 'lobby'>('menu');
  const [partyCode, setPartyCode] = useState('');
  const [partyName, setPartyName] = useState('');
  const [selectedGame, setSelectedGame] = useState<GameType>('kings-cup');
  const [currentParty, setCurrentParty] = useState<Party | null>(null);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();
  const isHost = currentParty?.host_id === userId;
  const allReady = members.every(m => m.is_ready || m.user_id === currentParty?.host_id);
  const canStart = isHost && members.length >= 2 && allReady;

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

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentParty, supabase, onStartGame, members]);

  const loadMembers = async () => {
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
  };

  const handleCreateParty = async () => {
    if (!partyName.trim()) {
      setError(language === 'hu' ? 'Add meg a party nevét!' : 'Enter party name!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Generate unique party code
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data: party, error: partyError } = await supabase
        .from('parties')
        .insert({
          code,
          name: partyName,
          host_id: userId,
          game_type: selectedGame,
          status: 'waiting',
          max_players: 10
        })
        .select()
        .single();

      if (partyError) throw partyError;

      // Join the party
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
      await loadMembers();
    } catch (err) {
      console.error('Error creating party:', err);
      setError(language === 'hu' ? 'Hiba a party létrehozásakor' : 'Error creating party');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinParty = async () => {
    if (!partyCode.trim()) {
      setError(language === 'hu' ? 'Add meg a party kódot!' : 'Enter party code!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Find party by code
      const { data: party, error: partyError } = await supabase
        .from('parties')
        .select()
        .eq('code', partyCode.toUpperCase())
        .eq('status', 'waiting')
        .single();

      if (partyError || !party) {
        setError(language === 'hu' ? 'Party nem található!' : 'Party not found!');
        return;
      }

      // Check if already member
      const { data: existingMember } = await supabase
        .from('party_members')
        .select()
        .eq('party_id', party.id)
        .eq('user_id', userId)
        .single();

      if (!existingMember) {
        // Join the party
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
      await loadMembers();
    } catch (err) {
      console.error('Error joining party:', err);
      setError(language === 'hu' ? 'Hiba a csatlakozáskor' : 'Error joining party');
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

  const copyPartyCode = () => {
    if (currentParty) {
      navigator.clipboard.writeText(currentParty.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Menu view
  if (view === 'menu') {
    return (
      <div className="min-h-screen bg-background flex flex-col safe-area-top safe-area-bottom">
        <header className="flex items-center justify-between p-4 border-b border-border/30">
          <Button variant="ghost" onClick={onLeave} className="text-muted-foreground gap-1">
            <ArrowLeft className="w-4 h-4" />
            {language === 'hu' ? 'Vissza' : 'Back'}
          </Button>
          <h1 className="text-lg font-bold text-amber-400">Online Party</h1>
          <div className="w-16" />
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-md space-y-4">
            <div className="text-center mb-8">
              <Users className="w-16 h-16 text-amber-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-white mb-2">
                {language === 'hu' ? 'Játssz barátaiddal!' : 'Play with friends!'}
              </h2>
              <p className="text-muted-foreground">
                {language === 'hu' 
                  ? 'Hozz létre partyt vagy csatlakozz egy meglévőhöz'
                  : 'Create a party or join an existing one'}
              </p>
            </div>

            <Button
              onClick={() => setView('create')}
              className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-lg gap-2"
            >
              <Users className="w-5 h-5" />
              {language === 'hu' ? 'Party létrehozása' : 'Create Party'}
            </Button>

            <Button
              onClick={() => setView('join')}
              variant="outline"
              className="w-full h-14 bg-transparent border-amber-500/30 text-amber-400 hover:bg-amber-500/10 font-bold text-lg gap-2"
            >
              <UserPlus className="w-5 h-5" />
              {language === 'hu' ? 'Csatlakozás partyhoz' : 'Join Party'}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Create party view
  if (view === 'create') {
    const gameOptions = GAMES.filter(g => !g.isOnlineOnly || g.isOnlineOnly);

    return (
      <div className="min-h-screen bg-background flex flex-col safe-area-top safe-area-bottom">
        <header className="flex items-center justify-between p-4 border-b border-border/30">
          <Button variant="ghost" onClick={() => setView('menu')} className="text-muted-foreground gap-1">
            <ArrowLeft className="w-4 h-4" />
            {language === 'hu' ? 'Vissza' : 'Back'}
          </Button>
          <h1 className="text-lg font-bold text-amber-400">
            {language === 'hu' ? 'Party létrehozása' : 'Create Party'}
          </h1>
          <div className="w-16" />
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-md mx-auto space-y-6">
            <div>
              <Label htmlFor="partyName" className="mb-2">
                {language === 'hu' ? 'Party neve' : 'Party name'}
              </Label>
              <Input
                id="partyName"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                placeholder={language === 'hu' ? 'Pl: Pénteki buli' : 'E.g: Friday Night'}
                className="bg-card/50 border-border/50 focus:border-amber-500/50"
              />
            </div>

            <div>
              <Label className="mb-2">
                {language === 'hu' ? 'Válassz játékot' : 'Select game'}
              </Label>
              <div className="grid grid-cols-2 gap-3">
                {gameOptions.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => setSelectedGame(game.id as GameType)}
                    className={cn(
                      'p-4 rounded-xl border-2 transition-all text-left',
                      selectedGame === game.id
                        ? 'bg-amber-500/20 border-amber-500'
                        : 'bg-card/50 border-border/30 hover:border-amber-500/50'
                    )}
                  >
                    <p className="font-bold text-white mb-1">
                      {language === 'hu' ? game.name : game.nameEn}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {game.minPlayers}-{game.maxPlayers} {language === 'hu' ? 'játékos' : 'players'}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <Button
              onClick={handleCreateParty}
              disabled={loading || !partyName.trim()}
              className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-lg"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {language === 'hu' ? 'Party létrehozása' : 'Create Party'}
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
      <div className="min-h-screen bg-background flex flex-col safe-area-top safe-area-bottom">
        <header className="flex items-center justify-between p-4 border-b border-border/30">
          <Button variant="ghost" onClick={() => setView('menu')} className="text-muted-foreground gap-1">
            <ArrowLeft className="w-4 h-4" />
            {language === 'hu' ? 'Vissza' : 'Back'}
          </Button>
          <h1 className="text-lg font-bold text-amber-400">
            {language === 'hu' ? 'Csatlakozás' : 'Join Party'}
          </h1>
          <div className="w-16" />
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <LinkIcon className="w-16 h-16 text-amber-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-white mb-2">
                {language === 'hu' ? 'Add meg a party kódot' : 'Enter party code'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {language === 'hu'
                  ? 'Kérd el a kódot a party gazdájától'
                  : 'Get the code from the party host'}
              </p>
            </div>

            <div>
              <Input
                value={partyCode}
                onChange={(e) => setPartyCode(e.target.value.toUpperCase())}
                placeholder="ABC123"
                maxLength={6}
                className="text-center text-2xl font-bold tracking-wider bg-card/50 border-border/50 focus:border-amber-500/50 h-16"
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm text-center">
                {error}
              </div>
            )}

            <Button
              onClick={handleJoinParty}
              disabled={loading || partyCode.length !== 6}
              className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-lg"
            >
              {loading ? (
                <RefreshCw className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {language === 'hu' ? 'Csatlakozás' : 'Join'}
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
      <div className="min-h-screen bg-background flex flex-col safe-area-top safe-area-bottom">
        <header className="flex items-center justify-between p-4 border-b border-border/30">
          <Button variant="ghost" onClick={handleLeaveParty} className="text-muted-foreground gap-1">
            <ArrowLeft className="w-4 h-4" />
            {language === 'hu' ? 'Kilépés' : 'Leave'}
          </Button>
          <h1 className="text-lg font-bold text-amber-400">{currentParty.name}</h1>
          <div className="w-16" />
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-md mx-auto space-y-6">
            {/* Party code */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30">
              <p className="text-sm text-muted-foreground text-center mb-2">
                {language === 'hu' ? 'Party kód' : 'Party code'}
              </p>
              <div className="flex items-center justify-center gap-3">
                <p className="text-3xl font-bold text-amber-400 tracking-wider">
                  {currentParty.code}
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={copyPartyCode}
                  className="text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </Button>
              </div>
            </div>

            {/* Selected game */}
            {selectedGameInfo && (
              <div className="p-4 rounded-xl bg-card/50 border border-border/30">
                <p className="text-sm text-muted-foreground mb-2">
                  {language === 'hu' ? 'Kiválasztott játék' : 'Selected game'}
                </p>
                <p className="font-bold text-white">
                  {language === 'hu' ? selectedGameInfo.name : selectedGameInfo.nameEn}
                </p>
              </div>
            )}

            {/* Members list */}
            <div>
              <Label className="mb-3">
                {language === 'hu' ? 'Játékosok' : 'Players'} ({members.length}/{currentParty.max_players})
              </Label>
              <div className="space-y-2">
                {members.map((member) => {
                  const isMemberHost = member.user_id === currentParty.host_id;
                  const memberReady = member.is_ready || isMemberHost;

                  return (
                    <div
                      key={member.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl border',
                        memberReady
                          ? 'bg-green-500/10 border-green-500/30'
                          : 'bg-card/50 border-border/30'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center text-white font-bold">
                          {member.profiles?.username?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-white">
                              {member.profiles?.username || 'Unknown'}
                            </p>
                            {isMemberHost && (
                              <Crown className="w-4 h-4 text-amber-400" />
                            )}
                          </div>
                          {!isMemberHost && (
                            <p className="text-xs text-muted-foreground">
                              {memberReady
                                ? (language === 'hu' ? 'Kész' : 'Ready')
                                : (language === 'hu' ? 'Nem kész' : 'Not ready')}
                            </p>
                          )}
                        </div>
                      </div>
                      {memberReady && !isMemberHost && (
                        <Check className="w-5 h-5 text-green-400" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ready/Start button */}
            {!isHost && (
              <Button
                onClick={handleToggleReady}
                variant={isReady ? 'outline' : 'default'}
                className={cn(
                  'w-full h-14 font-bold text-lg',
                  isReady
                    ? 'bg-transparent border-green-500/50 text-green-400 hover:bg-green-500/10'
                    : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black'
                )}
              >
                {isReady
                  ? (language === 'hu' ? '✓ Kész vagyok' : '✓ Ready')
                  : (language === 'hu' ? 'Kész vagyok' : 'Ready')}
              </Button>
            )}

            {isHost && (
              <div className="space-y-3">
                {!allReady && (
                  <p className="text-sm text-center text-muted-foreground">
                    {language === 'hu'
                      ? 'Várj, amíg mindenki készen áll...'
                      : 'Waiting for everyone to be ready...'}
                  </p>
                )}
                <Button
                  onClick={handleStartGame}
                  disabled={!canStart}
                  className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-lg gap-2 disabled:opacity-50"
                >
                  <Play className="w-5 h-5" />
                  {language === 'hu' ? 'Játék indítása' : 'Start Game'}
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return null;
}