'use client';

import { useState, useCallback } from 'react';
import { useGame } from '@/lib/game-context';
import { createDeck, shuffleDeck, drawCard, getCardColor } from '@/lib/deck';
import type { Card } from '@/lib/game-types';
import { PlayingCard } from '@/components/playing-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Bus, ArrowLeft, RotateCcw, Check, Trophy, Wine, Users, ArrowUp, ArrowDown, MoveHorizontal, Circle } from 'lucide-react';

interface RideTheBusProps {
  onBack: () => void;
}

type GamePhase = 
  | 'red-black' 
  | 'higher-lower' 
  | 'inside-outside' 
  | 'suit-guess'
  | 'pyramid'
  | 'bus-ride'
  | 'game-over';

interface PlayerState {
  name: string;
  cards: Card[];
  totalSips: number;
}

interface PyramidCard {
  card: Card | null;
  isRevealed: boolean;
  row: number;
}

// Ace is lowest (1) in this game
function getBusCardValue(card: Card): number {
  if (card.value === 'A') return 1;
  if (card.value === 'J') return 11;
  if (card.value === 'Q') return 12;
  if (card.value === 'K') return 13;
  return parseInt(card.value, 10);
}

export function RideTheBus({ onBack }: RideTheBusProps) {
  const { players, language } = useGame();
  const [deck, setDeck] = useState(() => shuffleDeck(createDeck()));
  const [playerStates, setPlayerStates] = useState<PlayerState[]>(() => 
    players.map(p => ({ name: p.name, cards: [], totalSips: 0 }))
  );
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentRound, setCurrentRound] = useState(1);
  const [phase, setPhase] = useState<GamePhase>('red-black');
  const [lastGuessCorrect, setLastGuessCorrect] = useState<boolean | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showingResult, setShowingResult] = useState(false);
  const [drawnCard, setDrawnCard] = useState<Card | null>(null);
  const [sipsPenalty, setSipsPenalty] = useState(0);
  
  // Pyramid state
  const [pyramid, setPyramid] = useState<PyramidCard[]>([]);
  const [currentPyramidIndex, setCurrentPyramidIndex] = useState(0);
  const [selectedCardToPlace, setSelectedCardToPlace] = useState<number | null>(null);
  
  // Bus ride state - 4-base pyramid (4+3+2+1 = 10 cards)
  const [busRider, setBusRider] = useState<string | null>(null);
  const [busPyramid, setBusPyramid] = useState<Card[]>([]);
  const [busRevealed, setBusRevealed] = useState<boolean[]>([]);
  const [busProgress, setBusProgress] = useState(0);
  const [busCurrentCard, setBusCurrentCard] = useState<Card | null>(null);
  const [busWaitingForGuess, setBusWaitingForGuess] = useState(false);
  const [busTotalSips, setBusTotalSips] = useState(0);
  const [busIsFlipping, setBusIsFlipping] = useState(false);
  const [busDrawnCard, setBusDrawnCard] = useState<Card | null>(null);

  const currentPlayer = playerStates[currentPlayerIndex];

  // Find who has the most cards (rides the bus)
  const findBusRider = useCallback(() => {
    let maxCards = 0;
    let rider = playerStates[0]?.name || '';
    playerStates.forEach(p => {
      if (p.cards.length > maxCards) {
        maxCards = p.cards.length;
        rider = p.name;
      }
    });
    return rider;
  }, [playerStates]);

  // Initialize pyramid (5-base: 5+4+3+2+1 = 15 cards)
  const initializePyramid = useCallback(() => {
    const pyramidCards: PyramidCard[] = [];
    let currentDeck = deck;
    
    for (let row = 0; row < 5; row++) {
      const cardsInRow = 5 - row;
      for (let i = 0; i < cardsInRow; i++) {
        const { card, remainingDeck } = drawCard(currentDeck);
        currentDeck = remainingDeck;
        pyramidCards.push({
          card: card,
          isRevealed: false,
          row: row,
        });
      }
    }
    
    setDeck(currentDeck);
    setPyramid(pyramidCards);
    setCurrentPyramidIndex(0);
    setPhase('pyramid');
  }, [deck]);

  // Initialize bus ride - 4-base pyramid (4+3+2+1 = 10 cards)
  const initializeBusRide = useCallback(() => {
    let currentDeck = deck;
    const busCards: Card[] = [];
    
    for (let i = 0; i < 10; i++) {
      const { card, remainingDeck } = drawCard(currentDeck);
      if (card) {
        busCards.push(card);
        currentDeck = remainingDeck;
      }
    }
    
    if (busCards.length < 10) {
      currentDeck = shuffleDeck(createDeck());
      busCards.length = 0;
      for (let i = 0; i < 10; i++) {
        const { card, remainingDeck } = drawCard(currentDeck);
        if (card) {
          busCards.push(card);
          currentDeck = remainingDeck;
        }
      }
    }
    
    setDeck(currentDeck);
    setBusPyramid(busCards);
    setBusRevealed(new Array(10).fill(false));
    setBusProgress(0);
    setBusCurrentCard(null);
    setBusWaitingForGuess(false);
    setBusTotalSips(0);
    setPhase('bus-ride');
  }, [deck]);

  const getPhaseTitle = () => {
    switch (phase) {
      case 'red-black':
        return language === 'hu' ? 'Piros vagy Fekete?' : 'Red or Black?';
      case 'higher-lower':
        return language === 'hu' ? 'Magasabb vagy Alacsonyabb?' : 'Higher or Lower?';
      case 'inside-outside':
        return language === 'hu' ? 'Kozte vagy Kivul?' : 'Inside or Outside?';
      case 'suit-guess':
        return language === 'hu' ? 'Van mar ilyen szin?' : 'Do you have this suit?';
      case 'pyramid':
        return language === 'hu' ? 'Piramis' : 'Pyramid';
      case 'bus-ride':
        return language === 'hu' ? `${busRider} buszozik!` : `${busRider} rides the bus!`;
      case 'game-over':
        return language === 'hu' ? 'Jatek vege!' : 'Game Over!';
    }
  };

  const handleGuess = useCallback((guess: string) => {
    if (deck.length === 0 || isAnimating) return;

    setIsAnimating(true);
    setShowingResult(false);
    setDrawnCard(null);
    setSipsPenalty(0);
    
    const { card, remainingDeck } = drawCard(deck);
    
    if (!card) {
      setIsAnimating(false);
      return;
    }
    
    setDeck(remainingDeck);

    setTimeout(() => {
      setDrawnCard(card);

      let isCorrect = false;
      const playerCards = currentPlayer.cards;
      
      switch (phase) {
        case 'red-black':
          isCorrect = getCardColor(card) === guess;
          break;
        case 'higher-lower':
          if (playerCards.length > 0) {
            const prevValue = getBusCardValue(playerCards[playerCards.length - 1]);
            const currValue = getBusCardValue(card);
            if (guess === 'higher') {
              isCorrect = currValue >= prevValue;
            } else {
              isCorrect = currValue <= prevValue;
            }
          }
          break;
        case 'inside-outside':
          if (playerCards.length >= 2) {
            const val1 = getBusCardValue(playerCards[0]);
            const val2 = getBusCardValue(playerCards[1]);
            const min = Math.min(val1, val2);
            const max = Math.max(val1, val2);
            const currValue = getBusCardValue(card);
            if (guess === 'inside') {
              isCorrect = currValue > min && currValue < max;
            } else {
              isCorrect = currValue < min || currValue > max || currValue === min || currValue === max;
            }
          }
          break;
        case 'suit-guess':
          const playerSuits = new Set(playerCards.map(c => c.suit));
          if (guess === 'yes') {
            isCorrect = playerSuits.has(card.suit);
          } else {
            isCorrect = !playerSuits.has(card.suit);
          }
          break;
      }

      setLastGuessCorrect(isCorrect);
      setSipsPenalty(isCorrect ? 0 : 1);
      setShowingResult(true);

      setPlayerStates(prev => {
        const newStates = [...prev];
        const player = { ...newStates[currentPlayerIndex] };
        player.cards = [...player.cards, card];
        if (!isCorrect) {
          player.totalSips += 1;
        }
        newStates[currentPlayerIndex] = player;
        return newStates;
      });

      setTimeout(() => {
        setShowingResult(false);
        setLastGuessCorrect(null);
        setDrawnCard(null);
        setSipsPenalty(0);
        setIsAnimating(false);
        
        if (currentPlayerIndex < players.length - 1) {
          setCurrentPlayerIndex(prev => prev + 1);
        } else {
          setCurrentPlayerIndex(0);
          
          if (currentRound < 4) {
            const nextRound = currentRound + 1;
            setCurrentRound(nextRound);
            switch (nextRound) {
              case 2:
                setPhase('higher-lower');
                break;
              case 3:
                setPhase('inside-outside');
                break;
              case 4:
                setPhase('suit-guess');
                break;
            }
          } else {
            setPlayerStates(prev => prev.map(p => ({
              ...p,
              totalSips: p.totalSips + 1
            })));
            initializePyramid();
          }
        }
      }, 2000);
    }, 300);
  }, [deck, isAnimating, phase, currentPlayer, currentPlayerIndex, players.length, currentRound, initializePyramid]);

  const handleRevealPyramidCard = useCallback(() => {
    if (currentPyramidIndex >= pyramid.length) return;
    
    setPyramid(prev => {
      const newPyramid = [...prev];
      newPyramid[currentPyramidIndex] = {
        ...newPyramid[currentPyramidIndex],
        isRevealed: true,
      };
      return newPyramid;
    });
  }, [currentPyramidIndex, pyramid.length]);

  const handlePlaceCard = useCallback((playerIndex: number, cardIndex: number) => {
    const player = playerStates[playerIndex];
    const card = player.cards[cardIndex];
    const pyramidCard = pyramid[currentPyramidIndex];
    
    if (!pyramidCard?.card || !pyramidCard.isRevealed) return;
    if (card.value !== pyramidCard.card.value) return;
    
    const sipsToGive = pyramidCard.row + 1;
    
    setPlayerStates(prev => {
      const newStates = [...prev];
      const newPlayer = { ...newStates[playerIndex] };
      newPlayer.cards = newPlayer.cards.filter((_, i) => i !== cardIndex);
      newStates[playerIndex] = newPlayer;
      return newStates;
    });
    
    setSelectedCardToPlace(sipsToGive);
    
    setTimeout(() => {
      setSelectedCardToPlace(null);
    }, 2000);
  }, [playerStates, pyramid, currentPyramidIndex]);

  const handleNextPyramidCard = useCallback(() => {
    if (currentPyramidIndex < pyramid.length - 1) {
      setCurrentPyramidIndex(prev => prev + 1);
    } else {
      const rider = findBusRider();
      setBusRider(rider);
      initializeBusRide();
    }
  }, [currentPyramidIndex, pyramid.length, findBusRider, initializeBusRide]);

  // Start bus - reveal first card
  const handleStartBus = useCallback(() => {
    const card = busPyramid[0];
    setBusRevealed(prev => {
      const newRevealed = [...prev];
      newRevealed[0] = true;
      return newRevealed;
    });
    setBusCurrentCard(card);
    setBusProgress(1);
    setBusWaitingForGuess(true);
  }, [busPyramid]);

  // Bus guess - higher or lower
  const handleBusGuess = useCallback((guess: 'higher' | 'lower') => {
    if (!busWaitingForGuess || busProgress >= 10) return;
    
    const nextCard = busPyramid[busProgress];
    
    // Reveal the next card
    setBusRevealed(prev => {
      const newRevealed = [...prev];
      newRevealed[busProgress] = true;
      return newRevealed;
    });
    
    const prevValue = getBusCardValue(busCurrentCard!);
    const currValue = getBusCardValue(nextCard);
    
    let isCorrect = false;
    let everyoneDrinks = false;
    
    // Same value = everyone drinks but can continue
    if (currValue === prevValue) {
      setPlayerStates(prev => prev.map(p => ({
        ...p,
        totalSips: p.totalSips + 1
      })));
      everyoneDrinks = true;
      isCorrect = true;
    } else if (guess === 'higher') {
      isCorrect = currValue > prevValue;
    } else {
      isCorrect = currValue < prevValue;
    }
    
    setLastGuessCorrect(isCorrect);
    setShowingResult(true);
    setBusWaitingForGuess(false);
    
    if (isCorrect) {
      setBusCurrentCard(nextCard);
      const newProgress = busProgress + 1;
      setBusProgress(newProgress);
      
      setTimeout(() => {
        setShowingResult(false);
        setLastGuessCorrect(null);
        
        if (newProgress >= 10) {
          setPhase('game-over');
        } else {
          setBusWaitingForGuess(true);
        }
      }, everyoneDrinks ? 1500 : 800);
    } else {
      // Wrong - add a sip, restart from first card but KEEP revealed cards visible
      setBusTotalSips(prev => prev + 1);
      
      setTimeout(() => {
        setShowingResult(false);
        setLastGuessCorrect(null);
        
        // Keep the same cards and revealed state, just restart guessing from first revealed card
        // The player now knows some cards and must guess again from the beginning
        setBusCurrentCard(busPyramid[0]);
        setBusProgress(1);
        setBusWaitingForGuess(true);
      }, 2000);
    }
  }, [busProgress, busPyramid, busCurrentCard, busWaitingForGuess]);

  const handleNewGame = useCallback(() => {
    setDeck(shuffleDeck(createDeck()));
    setPlayerStates(players.map(p => ({ name: p.name, cards: [], totalSips: 0 })));
    setCurrentPlayerIndex(0);
    setCurrentRound(1);
    setPhase('red-black');
    setLastGuessCorrect(null);
    setIsAnimating(false);
    setShowingResult(false);
    setDrawnCard(null);
    setSipsPenalty(0);
    setPyramid([]);
    setCurrentPyramidIndex(0);
    setSelectedCardToPlace(null);
    setBusRider(null);
    setBusProgress(0);
    setBusPyramid([]);
    setBusRevealed([]);
    setBusCurrentCard(null);
    setBusWaitingForGuess(false);
    setBusTotalSips(0);
  }, [players]);

  // Render main pyramid (5-base)
  const renderPyramid = () => {
    const rows: PyramidCard[][] = [];
    let idx = 0;
    for (let row = 0; row < 5; row++) {
      const cardsInRow = 5 - row;
      rows.push(pyramid.slice(idx, idx + cardsInRow));
      idx += cardsInRow;
    }
    
    return (
      <div className="flex flex-col items-center gap-1">
        {rows.reverse().map((row, rowIdx) => (
          <div key={rowIdx} className="flex items-center gap-1">
            <span className="w-8 text-sm text-amber-400 font-bold flex items-center justify-center">
              {5 - rowIdx}x
            </span>
            {row.map((pc, i) => (
              <div 
                key={i}
                className={cn(
                  'transition-all',
                  pyramid.indexOf(pc) === currentPyramidIndex && 'ring-2 ring-amber-400 rounded-lg'
                )}
              >
                <PlayingCard 
                  card={pc.isRevealed ? pc.card : undefined}
                  faceDown={!pc.isRevealed}
                  size="sm"
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  // Render bus pyramid (4-base: 4+3+2+1 = 10 cards)
  const renderBusPyramid = () => {
    const rows = [
      busPyramid.slice(0, 4),
      busPyramid.slice(4, 7),
      busPyramid.slice(7, 9),
      busPyramid.slice(9, 10),
    ];
    
    const rowStarts = [0, 4, 7, 9];
    
    return (
      <div className="flex flex-col items-center gap-3">
        {/* Pyramid display - from top to bottom */}
        {rows.slice().reverse().map((row, displayRowIdx) => {
          const actualRowIdx = 3 - displayRowIdx;
          const rowStartIdx = rowStarts[actualRowIdx];
          
          return (
            <div key={displayRowIdx} className="flex items-center gap-2 justify-center">
              {row.map((card, i) => {
                const cardIdx = rowStartIdx + i;
                const isCurrentCard = cardIdx === busProgress - 1;
                const isNextCard = cardIdx === busProgress;
                const isRevealed = busRevealed[cardIdx];
                
                return (
                  <div 
                    key={i}
                    className={cn(
                      'transition-all duration-300',
                      isCurrentCard && 'ring-2 ring-green-500 rounded-lg scale-105',
                      isNextCard && busWaitingForGuess && 'ring-2 ring-amber-400 rounded-lg animate-pulse'
                    )}
                  >
                    <PlayingCard 
                      card={isRevealed ? card : undefined}
                      faceDown={!isRevealed}
                      size="md"
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
        
        {/* Progress dots */}
        <div className="flex gap-1 mt-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div 
              key={i}
              className={cn(
                'w-2.5 h-2.5 rounded-full transition-all',
                i < busProgress 
                  ? 'bg-green-500' 
                  : i === busProgress 
                    ? 'bg-amber-400 animate-pulse' 
                    : 'bg-muted'
              )}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col safe-area-top safe-area-bottom bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {language === 'hu' ? 'Vissza' : 'Back'}
        </Button>
        
        <div className="flex items-center gap-4">
          {phase !== 'pyramid' && phase !== 'bus-ride' && phase !== 'game-over' && (
            <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1.5 rounded-full">
              <span className="text-sm font-medium">{language === 'hu' ? 'Kor' : 'Round'}:</span>
              <span className="font-bold text-amber-400">{currentRound}/4</span>
            </div>
          )}
          {phase === 'bus-ride' && busTotalSips > 0 && (
            <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1.5 rounded-full">
              <Wine className="w-4 h-4 text-red-400" />
              <span className="font-bold text-red-400">{busTotalSips}</span>
            </div>
          )}
          <Bus className="w-5 h-5 text-amber-400" />
        </div>
      </header>

      {/* Main game area */}
      <main className="flex-1 flex flex-col items-center px-4 gap-4 overflow-y-auto pb-4">
        {/* Phase title */}
        <h3 className="text-xl font-bold text-center text-golden">{getPhaseTitle()}</h3>

        {/* Card collection phases */}
        {(phase === 'red-black' || phase === 'higher-lower' || phase === 'inside-outside' || phase === 'suit-guess') && (
          <>
            {/* Current player */}
            <div className="text-center">
              <p className="text-muted-foreground text-sm mb-1">
                {language === 'hu' ? 'Jatekos' : 'Player'}
              </p>
              <h2 className="text-2xl font-bold text-golden">{currentPlayer?.name}</h2>
            </div>

            {/* Drawn card display */}
            {drawnCard && (
              <div className="bounce-in">
                <PlayingCard card={drawnCard} size="xl" />
              </div>
            )}

            {/* Current player's cards - bigger display */}
            <div className="bg-card/50 rounded-2xl p-4 border border-amber-500/20 w-full max-w-md">
              <p className="text-sm text-center text-muted-foreground mb-3">
                {language === 'hu' ? 'A te lapjaid' : 'Your cards'}
              </p>
              <div className="flex gap-2 justify-center flex-wrap min-h-[100px] items-center">
                {currentPlayer?.cards.length === 0 && !drawnCard && (
                  <p className="text-muted-foreground italic">
                    {language === 'hu' ? 'Meg nincs lapod' : 'No cards yet'}
                  </p>
                )}
                {currentPlayer?.cards.map((card) => (
                  <PlayingCard key={card.id} card={card} size="md" />
                ))}
              </div>
            </div>

            {/* Result indicator - improved design */}
            {showingResult && lastGuessCorrect !== null && (
              <div className={cn(
                'flex flex-col items-center gap-3 p-6 rounded-2xl bounce-in w-full max-w-sm',
                lastGuessCorrect 
                  ? 'bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30' 
                  : 'bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30'
              )}>
                {lastGuessCorrect ? (
                  <>
                    <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="w-10 h-10 text-green-400" />
                    </div>
                    <span className="font-bold text-xl text-green-400">
                      {language === 'hu' ? 'Helyes!' : 'Correct!'}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
                      <Wine className="w-10 h-10 text-red-400" />
                    </div>
                    <span className="font-bold text-xl text-red-400">
                      {language === 'hu' ? 'Nem talaltad el!' : 'Wrong guess!'}
                    </span>
                    <div className="flex items-center gap-2 bg-red-500/10 px-4 py-2 rounded-full">
                      <Wine className="w-5 h-5 text-red-400" />
                      <span className="text-red-300 font-bold">
                        {language === 'hu' ? `Igyal ${sipsPenalty} kortyot!` : `Drink ${sipsPenalty} sip!`}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* All players' cards overview - smaller */}
            <div className="w-full max-w-md mt-2">
              <p className="text-sm text-muted-foreground mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                {language === 'hu' ? 'Tobbi jatekos' : 'Other players'}
              </p>
              <div className="space-y-2">
                {playerStates.filter((_, i) => i !== currentPlayerIndex).map((p) => (
                  <div 
                    key={p.name}
                    className="flex items-center gap-3 p-2 rounded-lg bg-card/30"
                  >
                    <span className="text-sm font-medium w-20 truncate">{p.name}</span>
                    <div className="flex gap-1 flex-1 flex-wrap">
                      {p.cards.map((card) => (
                        <PlayingCard key={card.id} card={card} size="xs" />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Wine className="w-3 h-3" />
                      {p.totalSips}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Pyramid phase */}
        {phase === 'pyramid' && (
          <>
            {renderPyramid()}
            
            {selectedCardToPlace && (
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 text-green-400 px-6 py-3 rounded-2xl bounce-in text-lg font-bold flex items-center gap-3">
                <Wine className="w-6 h-6" />
                {language === 'hu' ? `Adj ki ${selectedCardToPlace} kortyot!` : `Give out ${selectedCardToPlace} sips!`}
              </div>
            )}

            {/* Players can place matching cards */}
            <div className="w-full max-w-md mt-4">
              <p className="text-sm text-muted-foreground mb-2">
                {language === 'hu' 
                  ? 'Koppints ha van egyezo lapod' 
                  : 'Tap if you have a matching card'}
              </p>
              <div className="space-y-2">
                {playerStates.map((p, pIdx) => (
                  <div key={p.name} className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border/50">
                    <span className="text-sm font-medium w-20 truncate">{p.name}</span>
                    <div className="flex gap-1 flex-1 flex-wrap">
                      {p.cards.map((card, cIdx) => {
                        const pyramidCard = pyramid[currentPyramidIndex];
                        const canPlace = pyramidCard?.isRevealed && pyramidCard.card?.value === card.value;
                        return (
                          <button 
                            key={card.id}
                            onClick={() => canPlace && handlePlaceCard(pIdx, cIdx)}
                            className={cn(
                              'transition-all rounded-lg',
                              canPlace && 'ring-2 ring-green-500 hover:scale-110 animate-pulse'
                            )}
                          >
                            <PlayingCard card={card} size="sm" />
                          </button>
                        );
                      })}
                    </div>
                    <span className="text-sm font-bold text-amber-400">{p.cards.length}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Bus ride phase */}
        {phase === 'bus-ride' && (
          <>
            <div className="text-center mb-2">
              <p className="text-muted-foreground">
                {language === 'hu' ? 'Menj vegig a piramison!' : 'Complete the pyramid!'}
              </p>
            </div>

            {renderBusPyramid()}

            {/* Result display for bus */}
            {showingResult && lastGuessCorrect !== null && (
              <div className={cn(
                'flex flex-col items-center gap-3 p-5 rounded-2xl bounce-in w-full max-w-sm mt-4',
                lastGuessCorrect 
                  ? 'bg-gradient-to-br from-green-500/20 to-green-600/10 border border-green-500/30' 
                  : 'bg-gradient-to-br from-red-500/20 to-red-600/10 border border-red-500/30'
              )}>
                {lastGuessCorrect ? (
                  <>
                    <Check className="w-12 h-12 text-green-400" />
                    <span className="font-bold text-xl text-green-400">
                      {language === 'hu' ? 'Helyes!' : 'Correct!'}
                    </span>
                  </>
                ) : (
                  <>
                    <Wine className="w-12 h-12 text-red-400" />
                    <span className="font-bold text-xl text-red-400">
                      {language === 'hu' ? 'Nem talaltad el!' : 'Wrong!'}
                    </span>
                    <div className="flex items-center gap-2 bg-red-500/10 px-4 py-2 rounded-full">
                      <Wine className="w-5 h-5 text-red-400" />
                      <span className="text-red-300 font-bold">
                        {language === 'hu' ? 'Igyal 1 kortyot es kezd ujra!' : 'Drink 1 sip and restart!'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* Game over */}
        {phase === 'game-over' && (
          <div className="text-center slide-up">
            <Trophy className="w-20 h-20 text-amber-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-golden mb-4">
              {busRider} {language === 'hu' ? 'leszallt a buszrol!' : 'got off the bus!'}
            </h2>
            
            {busTotalSips > 0 && (
              <div className="bg-amber-500/20 px-6 py-3 rounded-2xl mb-6 inline-flex items-center gap-3">
                <Wine className="w-6 h-6 text-amber-400" />
                <span className="text-amber-400 font-bold text-lg">
                  {busTotalSips} {language === 'hu' ? 'korty a buszozasert' : 'sips from the bus ride'}
                </span>
              </div>
            )}
            
            <div className="w-full max-w-md space-y-2 mt-6">
              <p className="text-muted-foreground mb-2">
                {language === 'hu' ? 'Vegso eredmenyek' : 'Final results'}
              </p>
              {playerStates.sort((a, b) => a.totalSips - b.totalSips).map((p, i) => (
                <div key={p.name} className="flex items-center justify-between p-3 rounded-xl bg-card/50 border border-border/50">
                  <span className="font-medium">{i + 1}. {p.name}</span>
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Wine className="w-4 h-4 text-amber-400" />
                    <span className="font-bold text-amber-400">{p.totalSips}</span> {language === 'hu' ? 'korty' : 'sips'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Bottom actions - improved button design */}
      <div className="p-4">
        {(phase === 'red-black' || phase === 'higher-lower' || phase === 'inside-outside' || phase === 'suit-guess') && !isAnimating && !showingResult && (
          <div className="flex gap-3">
            {phase === 'red-black' && (
              <>
                <Button
                  onClick={() => handleGuess('red')}
                  className="flex-1 h-16 bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white font-bold text-lg rounded-2xl shadow-lg shadow-red-500/25 border-0"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-2xl">♥ ♦</span>
                    <span>{language === 'hu' ? 'Piros' : 'Red'}</span>
                  </div>
                </Button>
                <Button
                  onClick={() => handleGuess('black')}
                  className="flex-1 h-16 bg-gradient-to-br from-slate-700 to-slate-900 hover:from-slate-800 hover:to-black text-white font-bold text-lg rounded-2xl shadow-lg shadow-slate-500/25 border-0"
                >
                  <div className="flex flex-col items-center">
                    <span className="text-2xl">♠ ♣</span>
                    <span>{language === 'hu' ? 'Fekete' : 'Black'}</span>
                  </div>
                </Button>
              </>
            )}
            {phase === 'higher-lower' && (
              <>
                <Button
                  onClick={() => handleGuess('higher')}
                  className="flex-1 h-16 bg-gradient-to-br from-green-500 to-emerald-700 hover:from-green-600 hover:to-emerald-800 text-white font-bold text-lg rounded-2xl shadow-lg shadow-green-500/25 border-0"
                >
                  <div className="flex flex-col items-center gap-1">
                    <ArrowUp className="w-6 h-6" />
                    <span>{language === 'hu' ? 'Magasabb' : 'Higher'}</span>
                  </div>
                </Button>
                <Button
                  onClick={() => handleGuess('lower')}
                  className="flex-1 h-16 bg-gradient-to-br from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white font-bold text-lg rounded-2xl shadow-lg shadow-orange-500/25 border-0"
                >
                  <div className="flex flex-col items-center gap-1">
                    <ArrowDown className="w-6 h-6" />
                    <span>{language === 'hu' ? 'Alacsonyabb' : 'Lower'}</span>
                  </div>
                </Button>
              </>
            )}
            {phase === 'inside-outside' && (
              <>
                <Button
                  onClick={() => handleGuess('inside')}
                  className="flex-1 h-16 bg-gradient-to-br from-blue-500 to-indigo-700 hover:from-blue-600 hover:to-indigo-800 text-white font-bold text-lg rounded-2xl shadow-lg shadow-blue-500/25 border-0"
                >
                  <div className="flex flex-col items-center gap-1">
                    <MoveHorizontal className="w-6 h-6" />
                    <span>{language === 'hu' ? 'Kozte' : 'Inside'}</span>
                  </div>
                </Button>
                <Button
                  onClick={() => handleGuess('outside')}
                  className="flex-1 h-16 bg-gradient-to-br from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 text-white font-bold text-lg rounded-2xl shadow-lg shadow-purple-500/25 border-0"
                >
                  <div className="flex flex-col items-center gap-1">
                    <div className="flex gap-3">
                      <Circle className="w-4 h-4" />
                      <Circle className="w-4 h-4" />
                    </div>
                    <span>{language === 'hu' ? 'Kivul' : 'Outside'}</span>
                  </div>
                </Button>
              </>
            )}
            {phase === 'suit-guess' && (
              <>
                <Button
                  onClick={() => handleGuess('yes')}
                  className="flex-1 h-16 bg-gradient-to-br from-green-500 to-emerald-700 hover:from-green-600 hover:to-emerald-800 text-white font-bold text-lg rounded-2xl shadow-lg shadow-green-500/25 border-0"
                >
                  <div className="flex flex-col items-center gap-1">
                    <Check className="w-6 h-6" />
                    <span>{language === 'hu' ? 'Van' : 'Yes'}</span>
                  </div>
                </Button>
                <Button
                  onClick={() => handleGuess('no')}
                  className="flex-1 h-16 bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 text-white font-bold text-lg rounded-2xl shadow-lg shadow-red-500/25 border-0"
                >
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-2xl font-thin">✕</span>
                    <span>{language === 'hu' ? 'Nincs' : 'No'}</span>
                  </div>
                </Button>
              </>
            )}
          </div>
        )}

        {phase === 'pyramid' && (
          <div className="flex gap-3">
            {!pyramid[currentPyramidIndex]?.isRevealed ? (
              <Button onClick={handleRevealPyramidCard} className="flex-1 h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold rounded-2xl">
                {language === 'hu' ? 'Lap felfedese' : 'Reveal Card'}
              </Button>
            ) : (
              <Button onClick={handleNextPyramidCard} className="flex-1 h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold rounded-2xl">
                {currentPyramidIndex < pyramid.length - 1
                  ? (language === 'hu' ? 'Kovetkezo lap' : 'Next Card')
                  : (language === 'hu' ? 'Buszozas!' : 'Bus Time!')
                }
              </Button>
            )}
          </div>
        )}

        {phase === 'bus-ride' && !showingResult && (
          <div className="flex gap-3">
            {busProgress === 0 ? (
              <Button
                onClick={handleStartBus}
                className="flex-1 h-16 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-lg rounded-2xl"
              >
                {language === 'hu' ? 'Elso lap felfedese' : 'Reveal First Card'}
              </Button>
            ) : busWaitingForGuess ? (
              <>
                <Button
                  onClick={() => handleBusGuess('higher')}
                  className="flex-1 h-16 bg-gradient-to-br from-green-500 to-emerald-700 hover:from-green-600 hover:to-emerald-800 text-white font-bold text-lg rounded-2xl shadow-lg shadow-green-500/25 border-0"
                >
                  <div className="flex flex-col items-center gap-1">
                    <ArrowUp className="w-6 h-6" />
                    <span>{language === 'hu' ? 'Magasabb' : 'Higher'}</span>
                  </div>
                </Button>
                <Button
                  onClick={() => handleBusGuess('lower')}
                  className="flex-1 h-16 bg-gradient-to-br from-orange-500 to-orange-700 hover:from-orange-600 hover:to-orange-800 text-white font-bold text-lg rounded-2xl shadow-lg shadow-orange-500/25 border-0"
                >
                  <div className="flex flex-col items-center gap-1">
                    <ArrowDown className="w-6 h-6" />
                    <span>{language === 'hu' ? 'Alacsonyabb' : 'Lower'}</span>
                  </div>
                </Button>
              </>
            ) : null}
          </div>
        )}

        {phase === 'game-over' && (
          <Button onClick={handleNewGame} className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold rounded-2xl" size="lg">
            <RotateCcw className="w-5 h-5 mr-2" />
            {language === 'hu' ? 'Uj jatek' : 'New Game'}
          </Button>
        )}
      </div>
    </div>
  );
}
