'use client';

import Image from 'next/image';
import { ArrowLeft, Star, Users, Clock, Gauge, Wine, Bookmark, Share2, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type GameInfo, GAME_CATEGORIES } from '@/lib/game-catalog';

interface GameDetailProps {
  game: GameInfo;
  onBack: () => void;
  onStartGame: (gameId: string) => void;
}

export function GameDetail({ game, onBack, onStartGame }: GameDetailProps) {
  const difficultyLabels = ['Konnyu', 'Kozepes', 'Nehez'];
  const category = GAME_CATEGORIES.find(c => c.id === game.category);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Image */}
      <div className="relative h-72 bg-card">
        <Image
          src={game.icon || "/placeholder.svg"}
          alt={game.name}
          fill
          className="object-cover"
          priority
        />
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
        
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between safe-area-top">
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex gap-2">
            <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors">
              <Bookmark className="w-5 h-5 text-white" />
            </button>
            <button className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center hover:bg-black/60 transition-colors">
              <Share2 className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Badges */}
        <div className="absolute bottom-20 left-4 flex gap-2">
          {game.isNew && (
            <span className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-bold">
              UJ
            </span>
          )}
          {game.isPopular && (
            <span className="px-3 py-1 rounded-full bg-amber-500 text-black text-xs font-bold">
              NEPSZERU
            </span>
          )}
          {game.isPremium && (
            <span className="px-3 py-1 rounded-full bg-purple-500 text-white text-xs font-bold">
              PREMIUM
            </span>
          )}
          {game.isOnlineOnly && (
            <span className="px-3 py-1 rounded-full bg-blue-500 text-white text-xs font-bold">
              ONLINE
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 -mt-8 relative z-10">
        <div className="bg-background rounded-t-3xl px-4 pt-6 pb-32">
          {/* Title and category */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-golden mb-1">{game.name}</h1>
              <p className="text-sm text-muted-foreground">{category?.label || game.category}</p>
            </div>
            
            {/* Rating */}
            <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-card border border-amber-500/30">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              <span className="font-semibold text-amber-400">{game.rating}</span>
              <span className="text-xs text-muted-foreground">({game.ratingCount})</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-card rounded-xl p-3 text-center border border-border/50">
              <Users className="w-5 h-5 mx-auto mb-1 text-amber-500" />
              <p className="text-sm font-semibold">{game.minPlayers}-{game.maxPlayers}</p>
              <p className="text-xs text-muted-foreground">jatekos</p>
            </div>
            <div className="bg-card rounded-xl p-3 text-center border border-border/50">
              <Clock className="w-5 h-5 mx-auto mb-1 text-amber-500" />
              <p className="text-sm font-semibold">{game.duration}</p>
              <p className="text-xs text-muted-foreground">idotartam</p>
            </div>
            <div className="bg-card rounded-xl p-3 text-center border border-border/50">
              <Gauge className="w-5 h-5 mx-auto mb-1 text-amber-500" />
              <p className="text-sm font-semibold">{difficultyLabels[game.difficulty - 1]}</p>
              <p className="text-xs text-muted-foreground">nehezseg</p>
            </div>
          </div>

          {/* Description */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Leiras</h2>
            <p className="text-muted-foreground leading-relaxed">{game.description}</p>
          </div>

          {/* Rules */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
              <Wine className="w-5 h-5 text-amber-500" />
              Jatekszabalyok
            </h2>
            <div className="bg-card rounded-xl p-4 border border-amber-500/20">
              <p className="text-muted-foreground leading-relaxed">{game.rules}</p>
            </div>
          </div>

          {/* Difficulty indicator */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Nehezsegi szint</h2>
            <div className="flex gap-2">
              {[1, 2, 3].map((level) => (
                <div
                  key={level}
                  className={cn(
                    'flex-1 h-2 rounded-full transition-colors',
                    level <= game.difficulty
                      ? level === 1 ? 'bg-emerald-500' : level === 2 ? 'bg-amber-500' : 'bg-red-500'
                      : 'bg-card'
                  )}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span>Konnyu</span>
              <span>Kozepes</span>
              <span>Nehez</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed bottom button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background to-transparent safe-area-bottom">
        <Button
          onClick={() => onStartGame(game.id)}
          className="w-full h-14 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-lg shadow-lg shadow-amber-500/30"
        >
          <Play className="w-5 h-5 mr-2" />
          Jatek inditasa
        </Button>
      </div>
    </div>
  );
}
