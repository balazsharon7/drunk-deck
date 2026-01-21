'use client';

import { useState, useEffect } from 'react';
import { GameProvider, useGame } from '@/lib/game-context';
import type { GameType } from '@/lib/game-types';
import { WelcomeScreen } from '@/components/welcome-screen';
import { HomeScreen } from '@/components/home-screen';
import { AuthForm } from '@/components/auth-form';
import { ProfileScreen } from '@/components/profile-screen';
import { PartyLobby } from '@/components/party-lobby';
import { KingsCup } from '@/components/games/kings-cup';
import { RideTheBus } from '@/components/games/ride-the-bus';
import { Blackjack } from '@/components/games/blackjack';
import { Charades } from '@/components/games/charades';
import { Taboo } from '@/components/games/taboo';
import { RatingGame } from '@/components/games/rating-game';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

type AppView = 'welcome' | 'home' | 'auth' | 'profile' | 'party' | 'game';

function GameRouter() {
  const { currentGame, setCurrentGame, setPlayers, language, setLanguage } = useGame();
  const [view, setView] = useState<AppView>('welcome');
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string>('');
  const [isOnlineMode, setIsOnlineMode] = useState(false);
  const [isOnlineGame, setIsOnlineGame] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, language')
          .eq('id', user.id)
          .single();
        
        if (profile?.username) {
          setUsername(profile.username);
        }
        if (profile?.language) {
          setLanguage(profile.language as 'hu' | 'en');
        }
        // Ha mar be van jelentkezve, egybol a home-ra iranyitjuk
        setIsOnlineMode(true);
        setView('home');
      }
      setLoading(false);
    };
    
    checkUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, language')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.username) {
          setUsername(profile.username);
        }
        if (profile?.language) {
          setLanguage(profile.language as 'hu' | 'en');
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [supabase, setLanguage]);

  const handleContinueOffline = () => {
    setIsOnlineMode(false);
    setView('home');
  };

  const handleLoginSuccess = () => {
    setIsOnlineMode(true);
    setView('home');
  };

  const handleStartGame = (game: GameType) => {
    setCurrentGame(game);
    setIsOnlineGame(false);
    setView('game');
  };

  const handleGoOnline = () => {
    if (user) {
      setView('party');
    } else {
      setView('auth');
    }
  };

  const handleOpenProfile = () => {
    setView('profile');
  };

  const handleLogin = () => {
    setView('auth');
  };

  const handleAuthSuccess = () => {
    setIsOnlineMode(true);
    setView('home');
  };

  const handleAuthBack = () => {
    setView('welcome');
  };

  const handleProfileBack = () => {
    setView('home');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsOnlineMode(false);
    setView('welcome');
  };

  const handlePartyLeave = () => {
    setView('home');
  };

  const handlePartyStartGame = (gameType: GameType, partyIdParam: string, members: { user_id: string; profiles: { username: string } }[]) => {
    setCurrentGame(gameType);
    setIsOnlineGame(true);
    
    // Set players from party members
    const partyPlayers = members.map((m, index) => ({
      id: m.user_id,
      name: m.profiles?.username || `Player ${index + 1}`,
      sips: 0,
    }));
    setPlayers(partyPlayers);
    
    setView('game');
  };

  const handleBack = () => {
    setCurrentGame(null);
    if (isOnlineGame) {
      setView('party');
    } else {
      setView('home');
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Welcome screen - first time users
  if (view === 'welcome') {
    return (
      <WelcomeScreen
        onContinueOffline={handleContinueOffline}
        onLoginSuccess={handleLoginSuccess}
        language={language}
        setLanguage={setLanguage}
      />
    );
  }

  // Auth view
  if (view === 'auth') {
    return (
      <AuthForm
        onSuccess={handleAuthSuccess}
        onBack={handleAuthBack}
        language={language}
      />
    );
  }

  // Profile view
  if (view === 'profile' && user) {
    return (
      <ProfileScreen
        onBack={handleProfileBack}
        onLogout={handleLogout}
        language={language}
        setLanguage={setLanguage}
        userId={user.id}
      />
    );
  }

  // Party lobby view
  if (view === 'party' && user) {
    return (
      <PartyLobby
        userId={user.id}
        username={username || user.email?.split('@')[0] || 'Player'}
        onStartGame={handlePartyStartGame}
        onLeave={handlePartyLeave}
      />
    );
  }

  // Game views
  if (view === 'game' && currentGame) {
    if (currentGame === 'kings-cup') {
      return <KingsCup onBack={handleBack} />;
    }

    if (currentGame === 'ride-the-bus') {
      return <RideTheBus onBack={handleBack} />;
    }

    if (currentGame === 'blackjack') {
      return <Blackjack onBack={handleBack} />;
    }

    if (currentGame === 'charades') {
      return <Charades onBack={handleBack} />;
    }

    if (currentGame === 'taboo') {
      return <Taboo onBack={handleBack} />;
    }

    if (currentGame === 'rating-game') {
      return <RatingGame onBack={handleBack} />;
    }
  }

  // Home view
  return (
    <HomeScreen
      onStartGame={handleStartGame}
      onGoOnline={handleGoOnline}
      onOpenProfile={isOnlineMode ? handleOpenProfile : undefined}
      onLogin={!isOnlineMode ? handleLogin : undefined}
      isOnline={isOnlineMode}
      userId={user?.id}
    />
  );
}

export default function Page() {
  return (
    <GameProvider>
      <GameRouter />
    </GameProvider>
  );
}
