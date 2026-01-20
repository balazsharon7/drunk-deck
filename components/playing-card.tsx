'use client';

import { cn } from '@/lib/utils';
import type { Card, Suit } from '@/lib/game-types';
import { getSuitSymbol } from '@/lib/deck';
import Image from 'next/image';

interface PlayingCardProps {
  card?: Card | null;
  faceDown?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  onClick?: () => void;
  isAnimating?: boolean;
}

const sizeConfig = {
  xs: { 
    container: 'w-10 h-14', 
    cornerText: 'text-[9px] leading-none font-bold',
    cornerSymbol: 'text-[7px] leading-none',
    centerSymbol: 'text-base',
    cornerGap: 'gap-0',
    padding: 'p-[2px]',
  },
  sm: { 
    container: 'w-14 h-20', 
    cornerText: 'text-xs leading-none font-bold',
    cornerSymbol: 'text-[10px] leading-none',
    centerSymbol: 'text-xl',
    cornerGap: 'gap-0',
    padding: 'p-1',
  },
  md: { 
    container: 'w-20 h-28', 
    cornerText: 'text-base leading-none font-bold',
    cornerSymbol: 'text-sm leading-none',
    centerSymbol: 'text-3xl',
    cornerGap: 'gap-0.5',
    padding: 'p-1.5',
  },
  lg: { 
    container: 'w-24 h-34', 
    cornerText: 'text-xl leading-none font-black',
    cornerSymbol: 'text-base leading-none',
    centerSymbol: 'text-5xl',
    cornerGap: 'gap-0.5',
    padding: 'p-2',
  },
  xl: { 
    container: 'w-32 h-44', 
    cornerText: 'text-2xl leading-none font-black',
    cornerSymbol: 'text-xl leading-none',
    centerSymbol: 'text-6xl',
    cornerGap: 'gap-1',
    padding: 'p-2.5',
  },
};

const suitColors: Record<Suit, string> = {
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-slate-800',
  spades: 'text-slate-800',
};

export function PlayingCard({
  card,
  faceDown = false,
  size = 'lg',
  className,
  onClick,
  isAnimating = false,
}: PlayingCardProps) {
  const config = sizeConfig[size];

  // Card back with image
  if (faceDown || !card) {
    return (
      <div
        onClick={onClick}
        className={cn(
          config.container,
          'rounded-lg cursor-pointer transition-all duration-300 relative overflow-hidden flex-shrink-0',
          'shadow-lg shadow-black/40',
          'hover:scale-105 hover:shadow-xl hover:shadow-primary/20',
          'active:scale-95',
          isAnimating && 'card-flip',
          className
        )}
        role="button"
        tabIndex={0}
        aria-label="Draw card"
      >
        <Image
          src="/card-back.png"
          alt="Card back"
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 200px"
        />
      </div>
    );
  }

  const symbol = getSuitSymbol(card.suit);
  const colorClass = suitColors[card.suit];
  const displayValue = card.value;

  return (
    <div
      onClick={onClick}
      className={cn(
        config.container,
        'rounded-lg cursor-pointer transition-all duration-300 flex-shrink-0',
        'bg-white',
        'border border-slate-300',
        'flex flex-col',
        config.padding,
        'shadow-lg shadow-black/30',
        'hover:scale-105',
        'overflow-hidden',
        isAnimating && 'bounce-in',
        className
      )}
      role="button"
      tabIndex={0}
    >
      {/* Top left corner */}
      <div className={cn('flex flex-col items-start', config.cornerGap, colorClass)}>
        <span className={config.cornerText}>{displayValue}</span>
        <span className={config.cornerSymbol}>{symbol}</span>
      </div>
      
      {/* Center symbol */}
      <div className={cn('flex-1 flex items-center justify-center min-h-0', colorClass)}>
        <span className={cn(config.centerSymbol)}>{symbol}</span>
      </div>
      
      {/* Bottom right corner (rotated) */}
      <div className={cn('flex flex-col items-end rotate-180', config.cornerGap, colorClass)}>
        <span className={config.cornerText}>{displayValue}</span>
        <span className={config.cornerSymbol}>{symbol}</span>
      </div>
    </div>
  );
}

export function CardDeck({
  cardsRemaining,
  onClick,
  className,
}: {
  cardsRemaining: number;
  onClick?: () => void;
  className?: string;
}) {
  const stackCards = Math.min(cardsRemaining, 5);
  
  return (
    <div className={cn('relative', className)}>
      {Array.from({ length: stackCards }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'absolute w-24 h-34 rounded-lg overflow-hidden',
            i === stackCards - 1 && 'cursor-pointer hover:scale-105 transition-transform'
          )}
          style={{
            top: -i * 2,
            left: -i * 2,
            zIndex: i,
          }}
          onClick={i === stackCards - 1 ? onClick : undefined}
        >
          <Image
            src="/card-back.png"
            alt="Card back"
            fill
            className="object-cover"
            sizes="200px"
          />
        </div>
      ))}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-muted-foreground text-sm font-medium">
        {cardsRemaining} lap
      </div>
    </div>
  );
}
