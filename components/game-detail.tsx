'use client';

import { useGame } from '@/lib/game-context';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { GameInfo } from '@/lib/game-catalog';
import { ArrowLeft, Users, Clock, Zap, Star, Plus, X, Shuffle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface GameDetailProps {
  game: GameInfo;
  onBack: () => void;
  onStartGame: () => void;
}

export function GameDetail({ game, onBack, onStartGame }: GameDetailProps) {
  const { players, addPlayer, removePlayer, updatePlayerName, shufflePlayerNames, language } = useGame();

  const handleAddPlayer = () => {
    if (players.length < game.maxPlayers) {
      addPlayer();
    }
  };

  const handleRemovePlayer = (id: string) => {
    if (players.length > game.minPlayers) {
      removePlayer(id);
    }
  };

  const canStart = players.length >= game.minPlayers && players.length <= game.maxPlayers;

  return (
    <div className="min-h-screen bg-background flex flex-col safe-area-top safe-area-bottom texture-overlay">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <button 
          onClick={onBack} 
          className="flex items-center gap-2 text-gold hover:text-gold-light transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="text-sm font-medium">{language === 'hu' ? 'Vissza' : 'Back'}</span>
        </button>
        <h1 className="text-lg font-bold text-golden">
          {language === 'hu' ? game.name : game.nameEn}
        </h1>
        <div className="w-16" />
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-md mx-auto space-y-5">
          {/* Game icon and badges */}
          <div className="text-center">
            <div className="game-card-frame w-28 h-28 mx-auto mb-4 p-4 flex items-center justify-center">
              {game.icon ? (
                <div className="relative w-16 h-16">
                  <Image
                    src={game.icon}
                    alt={game.name}
                    fill
                    className="object-contain"
                  />
                </div>
              ) : (
                <span className="text-5xl">{"🎮"}</span>
              )}
            </div>
            
            <div className="flex gap-2 justify-center flex-wrap">
              {game.isNew && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 font-semibold">
                  {language === 'hu' ? 'Új' : 'New'}
                </Badge>
              )}
              {game.isPopular && (
                <Badge className="bg-gold/20 text-gold border-gold/30 font-semibold">
                  {language === 'hu' ? 'Népszerű' : 'Popular'}
                </Badge>
              )}
              {game.isPremium && (
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 font-semibold">
                  Premium
                </Badge>
              )}
              {game.isOnlineOnly && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 font-semibold">
                  Online
                </Badge>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="game-card-frame p-4">
            <p className="text-muted-foreground leading-relaxed text-center">
              {language === 'hu' ? game.description : game.descriptionEn}
            </p>
          </div>

          {/* Game info */}
          <div className="grid grid-cols-3 gap-3">
            <div className="game-card-frame p-3 text-center">
              <Users className="w-5 h-5 text-gold mx-auto mb-1" />
              <p className="text-xs text-muted-foreground mb-1">
                {language === 'hu' ? 'Játékosok' : 'Players'}
              </p>
              <p className="text-sm font-bold text-foreground">
                {game.minPlayers}-{game.maxPlayers}
              </p>
            </div>
            <div className="game-card-frame p-3 text-center">
              <Clock className="w-5 h-5 text-gold mx-auto mb-1" />
              <p className="text-xs text-muted-foreground mb-1">
                {language === 'hu' ? 'Időtartam' : 'Duration'}
              </p>
              <p className="text-sm font-bold text-foreground">{game.duration}</p>
            </div>
            <div className="game-card-frame p-3 text-center">
              <Zap className="w-5 h-5 text-gold mx-auto mb-1" />
              <p className="text-xs text-muted-foreground mb-1">
                {language === 'hu' ? 'Nehézség' : 'Difficulty'}
              </p>
              <div className="flex gap-1 justify-center">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-2 h-4 rounded-sm',
                      i < game.difficulty ? 'bg-gold' : 'bg-muted'
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Rules */}
          <div className="game-card-frame p-4 border-gold/50">
            <h3 className="font-bold text-gold mb-2 flex items-center gap-2">
              <Star className="w-4 h-4" />
              {language === 'hu' ? 'Szabályok' : 'Rules'}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {language === 'hu' ? game.rules : game.rulesEn}
            </p>
          </div>

          {/* Players setup */}
          <div className="game-card-frame p-4">
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-semibold text-gold">
                {language === 'hu' ? 'Játékosok' : 'Players'} ({players.length}/{game.maxPlayers})
              </Label>
              <button
                onClick={shufflePlayerNames}
                className="flex items-center gap-1 text-gold hover:text-gold-light transition-colors text-sm font-medium"
              >
                <Shuffle className="w-4 h-4" />
                {language === 'hu' ? 'Keverés' : 'Shuffle'}
              </button>
            </div>

            <div className="space-y-2 mb-4">
              {players.map((player, index) => (
                <div key={player.id} className="flex items-center gap-2">
                  <div className="flex-1">
                    <Input
                      value={player.name}
                      onChange={(e) => updatePlayerName(player.id, e.target.value)}
                      className="bg-background/50 border-gold/30 focus:border-gold"
                      placeholder={`${language === 'hu' ? 'Játékos' : 'Player'} ${index + 1}`}
                    />
                  </div>
                  {players.length > game.minPlayers && (
                    <button
                      onClick={() => handleRemovePlayer(player.id)}
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {players.length < game.maxPlayers && (
              <button
                onClick={handleAddPlayer}
                className="w-full h-11 btn-gold-outline rounded-lg flex items-center justify-center gap-2 text-sm"
              >
                <Plus className="w-4 h-4" />
                {language === 'hu' ? 'Játékos hozzáadása' : 'Add Player'}
              </button>
            )}

            {!canStart && (
              <p className="text-sm text-muted-foreground mt-3 text-center">
                {language === 'hu'
                  ? `Minimum ${game.minPlayers} játékos szükséges`
                  : `Minimum ${game.minPlayers} players required`}
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Footer - Start button */}
      <div className="p-4 safe-area-bottom">
        <button
          onClick={onStartGame}
          disabled={!canStart}
          className={cn(
            "w-full h-14 btn-gold rounded-xl flex items-center justify-center gap-3 text-lg font-bold",
            !canStart && "opacity-50 cursor-not-allowed"
          )}
        >
          <Play className="w-5 h-5 fill-current" />
          {language === 'hu' ? 'Játék indítása' : 'Start Game'}
        </button>
      </div>
    </div>
  );
}
