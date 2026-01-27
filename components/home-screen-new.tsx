'use client';

import React from "react"

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Search, Star, Users, Clock, ChevronRight, Wine, Gamepad2, User, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { GAMES, getDrinkingGames, getNonDrinkingGames, searchGames, type GameInfo } from '@/lib/game-catalog';

interface HomeScreenNewProps {
  onSelectGame: (game: GameInfo) => void;
  onOpenProfile?: () => void;
  onLogin?: () => void;
  onOpenParty?: () => void;
  isOnline?: boolean;
  user?: { id: string; email?: string } | null;
}

type FilterType = 'all' | 'drinking' | 'non-drinking';

export function HomeScreenNew({ 
  onSelectGame, 
  onOpenProfile, 
  onLogin,
  onOpenParty,
  isOnline = false,
  user
}: HomeScreenNewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredGames = useMemo(() => {
    let games: GameInfo[] = [];
    
    if (searchQuery) {
      games = searchGames(searchQuery);
    } else if (activeFilter === 'all') {
      games = GAMES;
    } else if (activeFilter === 'drinking') {
      games = getDrinkingGames();
    } else {
      games = getNonDrinkingGames();
    }
    
    return games;
  }, [searchQuery, activeFilter]);

  const filters: { id: FilterType; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'Minden', icon: <Gamepad2 className="w-4 h-4" /> },
    { id: 'drinking', label: 'Ivós', icon: <Wine className="w-4 h-4" /> },
    { id: 'non-drinking', label: 'Nem ivós', icon: <PartyPopper className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-amber-500/50 shadow-lg shadow-amber-500/20">
                <Image
                  src="/logo.png"
                  alt="Drunk Deck"
                  fill
                  className="object-cover scale-125"
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-golden">Drunk Deck</h1>
                <p className="text-xs text-muted-foreground">
                  {isOnline ? 'Online mód' : 'Offline mód'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isOnline && onOpenParty && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenParty}
                  className="rounded-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10 bg-transparent"
                >
                  <Users className="w-4 h-4 mr-1" />
                  Party
                </Button>
              )}
              
              {isOnline && onOpenProfile ? (
                <button 
                  onClick={onOpenProfile}
                  className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-amber-500/30 hover:border-amber-500/60 transition-colors"
                >
                  <div className="w-full h-full bg-card flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>
                </button>
              ) : onLogin && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLogin}
                  className="rounded-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10 bg-transparent"
                >
                  Bejelentkezés
                </Button>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Játékok keresése..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card/50 border-border/50 rounded-xl h-11"
            />
          </div>
        </div>

        {/* Category filters */}
        <div className="px-4 pb-3">
          <div className="flex gap-2">
            {filters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => setActiveFilter(filter.id)}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all',
                  activeFilter === filter.id
                    ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                    : 'bg-card/50 text-muted-foreground hover:bg-card'
                )}
              >
                {filter.icon}
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Games Grid */}
      <main className="flex-1 px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">
            {activeFilter === 'all' && 'Minden játék'}
            {activeFilter === 'drinking' && 'Ivós játékok'}
            {activeFilter === 'non-drinking' && 'Nem ivós játékok'}
            {searchQuery && `Találatok: "${searchQuery}"`}
          </h2>
          <span className="text-sm text-muted-foreground">{filteredGames.length} játék</span>
        </div>

        {filteredGames.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nincs találat</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredGames.map((game) => (
              <GameCard key={game.id} game={game} onSelect={() => onSelectGame(game)} />
            ))}
          </div>
        )}
      </main>

      {/* Bottom spacing */}
      <div className="h-4" />
    </div>
  );
}

function GameCard({ game, onSelect }: { game: GameInfo; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="group relative bg-card rounded-2xl overflow-hidden border border-border/50 hover:border-amber-500/30 transition-all hover:shadow-lg hover:shadow-amber-500/10 text-left"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-card/50 overflow-hidden">
        <Image
          src={game.icon || "/placeholder.svg"}
          alt={game.name}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-300"
        />
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-1">
          {game.isNew && (
            <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">
              ÚJ
            </span>
          )}
          {game.isPopular && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500 text-black text-[10px] font-bold">
              TOP
            </span>
          )}
          {game.isPremium && (
            <span className="px-2 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-bold">
              PRO
            </span>
          )}
          {game.isOnlineOnly && (
            <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-[10px] font-bold">
              ONLINE
            </span>
          )}
        </div>

        {/* Rating badge */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
          <span className="text-xs font-medium text-white">{game.rating}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-semibold text-sm mb-1 truncate">{game.name}</h3>
        <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{game.description}</p>
        
        <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {game.minPlayers}-{game.maxPlayers}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {game.duration}
          </span>
        </div>
      </div>

      {/* Hover arrow */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ChevronRight className="w-4 h-4 text-amber-500" />
      </div>
    </button>
  );
}
