'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useGame } from '@/lib/game-context';
import { t } from '@/lib/translations';
import type { GameType } from '@/lib/game-types';
import { PlayerSetup } from './player-setup';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { User, Wifi, WifiOff, Users, ChevronRight, ArrowLeft, ChevronLeft, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HomeScreenProps {
  onStartGame: (game: GameType) => void;
  onGoOnline: () => void;
  onOpenProfile?: () => void;
  onLogin?: () => void;
  isOnline?: boolean;
  userId?: string;
}

interface Profile {
  username: string;
  avatar_url: string | null;
}

type GameInfo = {
  type: GameType;
  titleKey: 'kingsCup' | 'rideTheBus' | 'blackjack' | 'charades' | 'taboo' | 'ratingGame';
  descKey: 'kingsCupDesc' | 'rideTheBusDesc' | 'blackjackDesc' | 'charadesDesc' | 'tabooDesc' | 'ratingGameDesc';
  rulesKey: 'kingsCupRules' | 'rideTheBusRules' | 'blackjackRules' | 'charadesRules' | 'tabooRules' | 'ratingGameRules';
  icon: string;
};

const GAMES: GameInfo[] = [
  { type: 'kings-cup', titleKey: 'kingsCup', descKey: 'kingsCupDesc', rulesKey: 'kingsCupRules', icon: '/icons/kings-cup.png' },
  { type: 'ride-the-bus', titleKey: 'rideTheBus', descKey: 'rideTheBusDesc', rulesKey: 'rideTheBusRules', icon: '/icons/ride-the-bus.png' },
  { type: 'blackjack', titleKey: 'blackjack', descKey: 'blackjackDesc', rulesKey: 'blackjackRules', icon: '/icons/blackjack.png' },
  { type: 'charades', titleKey: 'charades', descKey: 'charadesDesc', rulesKey: 'charadesRules', icon: '/icons/charades.jpg' },
  { type: 'taboo', titleKey: 'taboo', descKey: 'tabooDesc', rulesKey: 'tabooRules', icon: '/icons/barlangnyelv.png' },
  { type: 'rating-game', titleKey: 'ratingGame', descKey: 'ratingGameDesc', rulesKey: 'ratingGameRules', icon: '/icons/rating-game.jpg' },
];

export function HomeScreen({ onStartGame, onGoOnline, onOpenProfile, onLogin, isOnline = false, userId }: HomeScreenProps) {
  const { language } = useGame();
  const [selectedGameIndex, setSelectedGameIndex] = useState(0);
  const [showPlayerSetup, setShowPlayerSetup] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (isOnline && userId) {
      async function loadProfile() {
        const { data } = await supabase
          .from("profiles")
          .select("username, avatar_url")
          .eq("id", userId)
          .single();
        if (data) {
          setProfile(data);
        }
      }
      loadProfile();
    }
  }, [isOnline, userId, supabase]);

  const selectedGame = GAMES[selectedGameIndex];

  const handlePrevGame = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSelectedGameIndex((prev) => (prev === 0 ? GAMES.length - 1 : prev - 1));
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleNextGame = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setSelectedGameIndex((prev) => (prev === GAMES.length - 1 ? 0 : prev + 1));
    setTimeout(() => setIsAnimating(false), 300);
  };

  const handleSelectGame = () => {
    setShowPlayerSetup(true);
  };

  const handleStartGame = () => {
    onStartGame(selectedGame.type);
  };

  const handleBack = () => {
    setShowPlayerSetup(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-card/30 backdrop-blur-sm sticky top-0 z-20">
        {showPlayerSetup ? (
          <Button variant="ghost" size="sm" onClick={handleBack} className="text-muted-foreground gap-1">
            <ArrowLeft className="w-4 h-4" />
            {t('back', language)}
          </Button>
        ) : !isOnline && onLogin ? (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLogin}
            className="h-8 px-3 text-sm bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-full"
          >
            <User className="w-4 h-4 mr-1.5" />
            {language === 'hu' ? 'Bejelentkezés' : 'Login'}
          </Button>
        ) : (
          <div className="w-20" />
        )}
        
        {/* Mode Indicator */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
          isOnline 
            ? "bg-green-500/10 text-green-400 border border-green-500/20" 
            : "bg-zinc-800/50 text-zinc-500 border border-zinc-700/30"
        }`}>
          {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
          {isOnline ? 'Online' : 'Offline'}
        </div>

        {/* Profile Button */}
        {isOnline && onOpenProfile ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onOpenProfile}
            className="h-9 w-9 p-0 rounded-full"
          >
            <div className="w-8 h-8 rounded-full bg-card border-2 border-amber-500/30 overflow-hidden flex items-center justify-center">
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url || "/placeholder.svg"}
                  alt="Avatar"
                  width={32}
                  height={32}
                  className="object-cover w-full h-full"
                />
              ) : (
                <User className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </Button>
        ) : (
          <div className="w-9" />
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 px-4 pb-6 overflow-y-auto flex flex-col">
        {!showPlayerSetup ? (
          <>
            {/* Logo - circular */}
            <div className="text-center pt-6 pb-2">
              <div className="relative w-24 h-24 mx-auto rounded-full overflow-hidden border-2 border-amber-500/30 shadow-lg shadow-amber-500/20">
                <Image
                  src="/logo.png"
                  alt="Drunk Deck Logo"
                  fill
                  className="object-cover scale-125"
                  priority
                />
              </div>
            </div>

            {/* Online Party Button - only if online */}
            {isOnline && (
              <div className="max-w-md mx-auto w-full mb-4 mt-2">
                <button
                  onClick={onGoOnline}
                  className="w-full group relative overflow-hidden rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-600/5 p-3 border border-amber-500/20 hover:border-amber-500/40 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                        <Users className="w-5 h-5 text-amber-400" />
                      </div>
                      <div className="text-left">
                        <h3 className="text-sm font-bold text-amber-400">
                          {language === 'hu' ? 'Online Party' : 'Online Party'}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {language === 'hu' 
                            ? 'Hozz létre vagy csatlakozz' 
                            : 'Create or join a party'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-amber-400/60 group-hover:text-amber-400 transition-colors" />
                  </div>
                </button>
              </div>
            )}

            {/* Game Carousel */}
            <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-4">
                {language === 'hu' ? 'Válassz játékot' : 'Select a game'}
              </p>

              {/* Carousel Container */}
              <div className="relative w-full flex items-center justify-center">
                {/* Prev Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePrevGame}
                  className="absolute left-0 z-10 h-12 w-12 rounded-full bg-card/80 border border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/40"
                >
                  <ChevronLeft className="w-6 h-6 text-amber-400" />
                </Button>

                {/* Game Card */}
                <div 
                  className={cn(
                    "flex flex-col items-center transition-all duration-300",
                    isAnimating && "opacity-50 scale-95"
                  )}
                >
                  {/* Game Icon - Large Circular */}
                  <div className="relative w-44 h-44 rounded-full overflow-hidden border-4 border-amber-500/40 shadow-2xl shadow-amber-500/20 mb-4">
                    <Image
                      src={selectedGame.icon || "/placeholder.svg"}
                      alt={t(selectedGame.titleKey, language)}
                      fill
                      className="object-cover scale-110"
                    />
                  </div>

                  {/* Game Title */}
                  <h2 className="text-2xl font-bold text-amber-400 mb-1">
                    {t(selectedGame.titleKey, language)}
                  </h2>

                  {/* Game Description */}
                  <p className="text-sm text-muted-foreground text-center max-w-xs mb-4">
                    {t(selectedGame.descKey, language)}
                  </p>

                  {/* Rules Button */}
                  <button
                    onClick={() => setShowRules(!showRules)}
                    className="flex items-center gap-1.5 text-xs text-amber-500/70 hover:text-amber-400 transition-colors mb-4"
                  >
                    <BookOpen className="w-4 h-4" />
                    {language === 'hu' ? 'Játékszabály' : 'How to play'}
                  </button>

                  {/* Rules Panel */}
                  {showRules && (
                    <div className="w-full max-w-xs mb-4 p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                      <p className="text-sm text-amber-100/80 leading-relaxed">
                        {t(selectedGame.rulesKey, language)}
                      </p>
                    </div>
                  )}

                  {/* Dots Indicator */}
                  <div className="flex gap-2 mb-6">
                    {GAMES.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => {
                          if (!isAnimating) {
                            setIsAnimating(true);
                            setSelectedGameIndex(index);
                            setShowRules(false);
                            setTimeout(() => setIsAnimating(false), 300);
                          }
                        }}
                        className={cn(
                          "w-2.5 h-2.5 rounded-full transition-all",
                          index === selectedGameIndex 
                            ? "bg-amber-500 w-6" 
                            : "bg-zinc-600 hover:bg-zinc-500"
                        )}
                      />
                    ))}
                  </div>

                  {/* Play Button */}
                  <Button
                    onClick={handleSelectGame}
                    className="h-14 px-10 text-lg font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black rounded-full shadow-lg shadow-amber-500/30"
                  >
                    {language === 'hu' ? 'Játék' : 'Play'}
                  </Button>
                </div>

                {/* Next Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNextGame}
                  className="absolute right-0 z-10 h-12 w-12 rounded-full bg-card/80 border border-amber-500/20 hover:bg-amber-500/10 hover:border-amber-500/40"
                >
                  <ChevronRight className="w-6 h-6 text-amber-400" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="max-w-md mx-auto w-full">
            <div className="text-center mb-6 pt-4">
              <div className="relative w-20 h-20 mx-auto mb-3 rounded-full overflow-hidden border-2 border-amber-500/30">
                <Image
                  src={selectedGame.icon || "/placeholder.svg"}
                  alt={t(selectedGame.titleKey, language)}
                  fill
                  className="object-cover scale-110"
                />
              </div>
              <h2 className="text-2xl font-bold mb-1 text-golden">
                {t(selectedGame.titleKey, language)}
              </h2>
              <p className="text-muted-foreground text-sm">
                {language === 'hu' ? 'Add meg a játékosokat' : 'Set up players'}
              </p>
            </div>
            <PlayerSetup onStartGame={handleStartGame} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-3 text-muted-foreground/40 text-xs border-t border-border/20">
        {language === 'hu' ? 'Felelősségteljesen igyál!' : 'Drink responsibly!'}
      </footer>
    </div>
  );
}
