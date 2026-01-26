'use client';

import { useGame } from '@/lib/game-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { GameInfo } from '@/lib/game-catalog';
import { ArrowLeft, Users, Clock, Zap, Star, Plus, X, Shuffle } from 'lucide-react';
import { cn } from '@/lib/utils';

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
    <div className="min-h-screen bg-background flex flex-col safe-area-top safe-area-bottom">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-border/30">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground gap-1">
          <ArrowLeft className="w-4 h-4" />
          {language === 'hu' ? 'Vissza' : 'Back'}
        </Button>
        <h1 className="text-lg font-bold text-amber-400">
          {language === 'hu' ? game.name : game.nameEn}
        </h1>
        <div className="w-16" />
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-md mx-auto space-y-6">
          {/* Game icon and badges */}
          <div className="text-center">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
              <span className="text-5xl">🎮</span>
            </div>
            
            <div className="flex gap-2 justify-center flex-wrap mb-4">
              {game.isNew && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  {language === 'hu' ? 'Új' : 'New'}
                </Badge>
              )}
              {game.isPopular && (
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                  {language === 'hu' ? 'Népszerű' : 'Popular'}
                </Badge>
              )}
              {game.isPremium && (
                <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                  Premium
                </Badge>
              )}
              {game.isOnlineOnly && (
                <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                  Online
                </Badge>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="p-4 rounded-xl bg-card/50 border border-border/30">
            <p className="text-muted-foreground leading-relaxed">
              {language === 'hu' ? game.description : game.descriptionEn}
            </p>
          </div>

          {/* Game info */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-card/50 border border-border/30 text-center">
              <Users className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground mb-1">
                {language === 'hu' ? 'Játékosok' : 'Players'}
              </p>
              <p className="text-sm font-bold text-white">
                {game.minPlayers}-{game.maxPlayers}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-card/50 border border-border/30 text-center">
              <Clock className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground mb-1">
                {language === 'hu' ? 'Időtartam' : 'Duration'}
              </p>
              <p className="text-sm font-bold text-white">{game.duration}</p>
            </div>
            <div className="p-3 rounded-xl bg-card/50 border border-border/30 text-center">
              <Zap className="w-5 h-5 text-amber-400 mx-auto mb-1" />
              <p className="text-xs text-muted-foreground mb-1">
                {language === 'hu' ? 'Nehézség' : 'Difficulty'}
              </p>
              <div className="flex gap-0.5 justify-center">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      'w-1.5 h-3 rounded-full',
                      i < game.difficulty ? 'bg-amber-400' : 'bg-muted'
                    )}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Rules */}
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <h3 className="font-bold text-amber-400 mb-2 flex items-center gap-2">
              <Star className="w-4 h-4" />
              {language === 'hu' ? 'Szabályok' : 'Rules'}
            </h3>
            <p className="text-sm text-amber-100/70 leading-relaxed">
              {language === 'hu' ? game.rules : game.rulesEn}
            </p>
          </div>

          {/* Players setup */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">
                {language === 'hu' ? 'Játékosok' : 'Players'} ({players.length}/{game.maxPlayers})
              </Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={shufflePlayerNames}
                className="text-amber-400 hover:text-amber-300 gap-1"
              >
                <Shuffle className="w-4 h-4" />
                {language === 'hu' ? 'Keverés' : 'Shuffle'}
              </Button>
            </div>

            <div className="space-y-2 mb-3">
              {players.map((player, index) => (
                <div key={player.id} className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Input
                      value={player.name}
                      onChange={(e) => updatePlayerName(player.id, e.target.value)}
                      className="pr-10 bg-card/50 border-border/50 focus:border-amber-500/50"
                      placeholder={`${language === 'hu' ? 'Játékos' : 'Player'} ${index + 1}`}
                    />
                  </div>
                  {players.length > game.minPlayers && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemovePlayer(player.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {players.length < game.maxPlayers && (
              <Button
                variant="outline"
                onClick={handleAddPlayer}
                className="w-full bg-transparent border-amber-500/30 text-amber-400 hover:bg-amber-500/10 gap-2"
              >
                <Plus className="w-4 h-4" />
                {language === 'hu' ? 'Játékos hozzáadása' : 'Add Player'}
              </Button>
            )}

            {!canStart && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                {language === 'hu'
                  ? `Minimum ${game.minPlayers} játékos szükséges`
                  : `Minimum ${game.minPlayers} players required`}
              </p>
            )}
          </div>
        </div>
      </main>

      {/* Footer - Start button */}
      <div className="p-4 border-t border-border/30">
        <Button
          onClick={onStartGame}
          disabled={!canStart}
          className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {language === 'hu' ? 'Játék indítása' : 'Start Game'}
        </Button>
      </div>
    </div>
  );
}