'use client';

import { useState, useCallback, useMemo } from 'react';
import { useGame } from '@/lib/game-context';
import { t } from '@/lib/translations';
import { createDeck, shuffleDeck } from '@/lib/deck';
import { getKingsCupRule } from '@/lib/kings-cup-rules';
import type { Card } from '@/lib/game-types';
import { PlayingCard } from '@/components/playing-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Crown, ArrowLeft, RotateCcw, Wine, X } from 'lucide-react';

interface KingsCupProps {
  onBack: () => void;
}

interface CircleCard extends Card {
  isDrawn: boolean;
}

export function KingsCup({ onBack }: KingsCupProps) {
  const { players, language } = useGame();
  const [circleCards, setCircleCards] = useState<CircleCard[]>(() => 
    shuffleDeck(createDeck()).map(card => ({ ...card, isDrawn: false }))
  );
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [kingsDrawn, setKingsDrawn] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showRule, setShowRule] = useState(false);
  const [lastKingPlayer, setLastKingPlayer] = useState<string | null>(null);

  const currentPlayer = players[currentPlayerIndex];
  const rule = selectedCard ? getKingsCupRule(selectedCard.value) : null;
  const remainingCards = circleCards.filter(c => !c.isDrawn).length;

  // Calculate card positions in a bigger circle
  const cardPositions = useMemo(() => {
    const totalCards = 52;
    const radius = 155; // Bigger radius for easier tapping
    
    return circleCards.map((_, index) => {
      const angle = (index / totalCards) * 2 * Math.PI - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      const rotation = (angle * 180 / Math.PI) + 90;
      
      return { x, y, rotation };
    });
  }, [circleCards]);

  const handleSelectCard = useCallback((cardIndex: number) => {
    if (isAnimating || circleCards[cardIndex].isDrawn || selectedCard) return;

    const card = circleCards[cardIndex];
    setIsAnimating(true);
    
    setCircleCards(prev => prev.map((c, i) => 
      i === cardIndex ? { ...c, isDrawn: true } : c
    ));

    setTimeout(() => {
      setSelectedCard(card);
      
      if (card.value === 'K') {
        setKingsDrawn((prev) => prev + 1);
        setLastKingPlayer(currentPlayer?.name || null);
      }
      
      setTimeout(() => {
        setShowRule(true);
        setIsAnimating(false);
      }, 300);
    }, 200);
  }, [isAnimating, circleCards, selectedCard, currentPlayer]);

  const handleNextPlayer = useCallback(() => {
    setSelectedCard(null);
    setShowRule(false);
    setCurrentPlayerIndex((prev) => (prev + 1) % players.length);
  }, [players.length]);

  const handleNewGame = useCallback(() => {
    setCircleCards(shuffleDeck(createDeck()).map(card => ({ ...card, isDrawn: false })));
    setSelectedCard(null);
    setCurrentPlayerIndex(0);
    setKingsDrawn(0);
    setShowRule(false);
    setLastKingPlayer(null);
  }, []);

  const isGameOver = remainingCards === 0 || kingsDrawn >= 4;

  return (
    <div className="min-h-screen flex flex-col safe-area-top safe-area-bottom bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back', language)}
        </Button>
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-muted-foreground">
            {remainingCards}/52
          </div>
        </div>
      </header>

      {/* Current player */}
      <div className="text-center px-4">
        <p className="text-muted-foreground text-sm mb-1">
          {language === 'hu' ? 'Soron kovetkezik' : 'Current turn'}
        </p>
        <h2 className="text-2xl font-bold text-golden">{currentPlayer?.name}</h2>
      </div>

      {/* Main game area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4">
        {!isGameOver ? (
          <>
            {/* Card circle */}
            {!selectedCard && (
              <div className="relative" style={{ width: 360, height: 360 }}>
                {/* Center cup area with king counter */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-700/30 border-2 border-amber-500/50 flex flex-col items-center justify-center shadow-lg shadow-amber-500/20">
                  <Crown className="w-8 h-8 text-amber-400" />
                  <span className="text-2xl font-black text-amber-400">{kingsDrawn}/4</span>
                </div>
                
                {/* Cards in circle */}
                {circleCards.map((card, index) => {
                  const pos = cardPositions[index];
                  if (card.isDrawn) return null;
                  
                  return (
                    <div
                      key={card.id}
                      className="absolute transition-all duration-200 hover:scale-150 hover:z-50 cursor-pointer active:scale-125"
                      style={{
                        left: '50%',
                        top: '50%',
                        transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) rotate(${pos.rotation}deg)`,
                      }}
                      onClick={() => handleSelectCard(index)}
                    >
                      <PlayingCard
                        faceDown
                        size="sm"
                        className="shadow-lg hover:shadow-amber-500/30"
                      />
                    </div>
                  );
                })}
              </div>
            )}

            {/* Selected card display */}
            {selectedCard && (
              <div className="flex flex-col items-center gap-6">
                <PlayingCard
                  card={selectedCard}
                  size="xl"
                  isAnimating
                />
                
                {/* Rule display */}
                {showRule && rule && (
                  <div className="w-full max-w-sm slide-up">
                    <div className="bg-card/80 backdrop-blur-sm rounded-2xl p-6 border border-amber-500/30 shadow-lg">
                      <h3 className="text-xl font-bold mb-2 text-center text-golden">
                        {language === 'hu' ? rule.titleHu : rule.title}
                      </h3>
                      <p className="text-muted-foreground text-center">
                        {language === 'hu' ? rule.descriptionHu : rule.description}
                      </p>
                      {rule.sips > 0 && (
                        <div className="mt-4 text-center">
                          <span className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/20 rounded-full text-amber-400 font-bold">
                            <Wine className="w-4 h-4" />
                            {rule.sips} {t('sips', language)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hint text */}
            {!selectedCard && (
              <p className="text-muted-foreground text-sm mt-4 text-center">
                {language === 'hu' ? 'Koppints egy lapra a korbol!' : 'Tap a card from the circle!'}
              </p>
            )}
          </>
        ) : (
          <div className="text-center">
            {/* Show the 4th King card when game ends */}
            {kingsDrawn >= 4 && selectedCard && (
              <div className="mb-6">
                <PlayingCard card={selectedCard} size="xl" />
              </div>
            )}
            <Wine className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2 text-golden">{t('gameOver', language)}</h3>
            {kingsDrawn >= 4 && lastKingPlayer && (
              <p className="text-muted-foreground text-lg">
                {language === 'hu' 
                  ? `${lastKingPlayer} megissza a Kiraly poharat!` 
                  : `${lastKingPlayer} drinks the King's Cup!`}
              </p>
            )}
          </div>
        )}
      </main>

      {/* Bottom actions */}
      <div className="p-4 flex gap-3">
        {isGameOver ? (
          <Button onClick={handleNewGame} className="flex-1 h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold" size="lg">
            <RotateCcw className="w-5 h-5 mr-2" />
            {t('newGame', language)}
          </Button>
        ) : selectedCard ? (
          <Button onClick={handleNextPlayer} className="flex-1 h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold" size="lg">
            {t('nextPlayer', language)}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
