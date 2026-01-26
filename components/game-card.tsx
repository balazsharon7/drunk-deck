'use client';

import { cn } from '@/lib/utils';
import type { GameType } from '@/lib/game-types';
import Image from 'next/image';

interface GameCardProps {
  type: GameType;
  title: string;
  description: string;
  onClick: () => void;
  isSelected?: boolean;
}

const gameIcons: Record<GameType, string> = {
  'kings-cup': '/icons/kings-cup.png',
  'ride-the-bus': '/icons/ride-the-bus.png',
  'blackjack': '/icons/blackjack.png',
  'charades': '/icons/charades.png',
  'taboo': '/icons/taboo.png',
  'rating-game': '/icons/rating-game.png',
};

export function GameCard({ type, title, description, onClick, isSelected }: GameCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full p-4 rounded-2xl text-left transition-all duration-300',
        'bg-card/80 backdrop-blur-sm border',
        isSelected 
          ? 'border-amber-500 ring-2 ring-amber-500/30 scale-[1.02]' 
          : 'border-border/30 hover:border-amber-500/50',
        'hover:scale-[1.02] active:scale-[0.98]',
        'group'
      )}
    >
      <div className="flex items-center gap-4">
        <div className={cn(
          'w-20 h-20 rounded-full flex items-center justify-center relative overflow-hidden flex-shrink-0',
          'border-2 border-amber-500/30 shadow-lg shadow-amber-500/20',
          'group-hover:scale-105 group-hover:border-amber-500/50 transition-all duration-300'
        )}>
          <Image
            src={gameIcons[type] || "/placeholder.svg"}
            alt={title}
            fill
            className="object-cover scale-125"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold mb-0.5 text-foreground truncate">{title}</h3>
          <p className="text-muted-foreground text-sm line-clamp-2">{description}</p>
        </div>
      </div>
    </button>
  );
}
