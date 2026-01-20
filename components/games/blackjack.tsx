'use client';

import { useState, useCallback } from 'react';
import { useGame } from '@/lib/game-context';
import { t } from '@/lib/translations';
import { createDeck, shuffleDeck, drawCard, drawCards, calculateBlackjackValue } from '@/lib/deck';
import type { Card } from '@/lib/game-types';
import { PlayingCard } from '@/components/playing-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Spade, ArrowLeft, RotateCcw, Plus, Minus, Wine, Settings, Trophy, X } from 'lucide-react';

interface BlackjackProps {
  onBack: () => void;
}

interface Hand {
  cards: Card[];
  value: number;
  isBusted: boolean;
  isStanding: boolean;
  bet: number;
  isDoubled: boolean;
}

interface PlayerState {
  name: string;
  hands: Hand[];
  currentHandIndex: number;
  totalSips: number;
  hasFinished: boolean;
}

type GamePhase = 'settings' | 'betting' | 'playing' | 'dealer' | 'results';

const createEmptyHand = (bet: number = 0): Hand => ({
  cards: [],
  value: 0,
  isBusted: false,
  isStanding: false,
  bet,
  isDoubled: false,
});

export function Blackjack({ onBack }: BlackjackProps) {
  const { players, language } = useGame();
  const [deck, setDeck] = useState(() => shuffleDeck(createDeck()));
  const [playerStates, setPlayerStates] = useState<PlayerState[]>(() => 
    players.map(p => ({
      name: p.name,
      hands: [createEmptyHand()],
      currentHandIndex: 0,
      totalSips: 0,
      hasFinished: false,
    }))
  );
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [dealerHand, setDealerHand] = useState<Hand>(createEmptyHand());
  const [phase, setPhase] = useState<GamePhase>('settings');
  const [betAmount, setBetAmount] = useState(3);
  const [roundResults, setRoundResults] = useState<{ player: string; result: string; sips: number; canGive: boolean }[]>([]);
  
  // Settings
  const [totalRounds, setTotalRounds] = useState(5);
  const [currentRoundNum, setCurrentRoundNum] = useState(1);

  const currentPlayer = playerStates[currentPlayerIndex];
  const currentHand = currentPlayer?.hands[currentPlayer.currentHandIndex];
  const allPlayersFinished = playerStates.every(p => p.hasFinished);
  const isMultiplayer = players.length > 1;

  const canSplit = currentHand && 
    currentHand.cards.length === 2 && 
    currentHand.cards[0].value === currentHand.cards[1].value &&
    currentPlayer.hands.length === 1;

  const canDouble = currentHand && 
    currentHand.cards.length === 2 && 
    !currentHand.isDoubled;

  const startGame = useCallback(() => {
    setPhase('betting');
    setCurrentPlayerIndex(0);
  }, []);

  const placeBet = useCallback(() => {
    setPlayerStates(prev => prev.map((p, i) => 
      i === currentPlayerIndex 
        ? { ...p, hands: [{ ...p.hands[0], bet: betAmount }] }
        : p
    ));

    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(prev => prev + 1);
    } else {
      // All bets placed, deal cards
      let currentDeck = deck;
      const newPlayerStates = [...playerStates];
      
      // Deal 2 cards to each player
      for (let i = 0; i < players.length; i++) {
        const { cards, remainingDeck } = drawCards(currentDeck, 2);
        currentDeck = remainingDeck;
        newPlayerStates[i] = {
          ...newPlayerStates[i],
          hands: [{
            ...newPlayerStates[i].hands[0],
            bet: i === currentPlayerIndex ? betAmount : newPlayerStates[i].hands[0].bet,
            cards,
            value: calculateBlackjackValue(cards),
          }],
        };
      }
      
      // Deal 2 cards to dealer
      const { cards: dealerCards, remainingDeck: finalDeck } = drawCards(currentDeck, 2);
      
      setDeck(finalDeck);
      setPlayerStates(newPlayerStates);
      setDealerHand({
        cards: dealerCards,
        value: calculateBlackjackValue(dealerCards),
        isBusted: false,
        isStanding: false,
        bet: 0,
        isDoubled: false,
      });
      setCurrentPlayerIndex(0);
      setPhase('playing');
    }
  }, [betAmount, currentPlayerIndex, deck, players.length, playerStates]);

  const handleHit = useCallback(() => {
    const { card, remainingDeck } = drawCard(deck);
    if (!card) return;

    setDeck(remainingDeck);
    
    setPlayerStates(prev => {
      const newStates = [...prev];
      const player = { ...newStates[currentPlayerIndex] };
      const hands = [...player.hands];
      const hand = { ...hands[player.currentHandIndex] };
      
      hand.cards = [...hand.cards, card];
      hand.value = calculateBlackjackValue(hand.cards);
      hand.isBusted = hand.value > 21;
      
      hands[player.currentHandIndex] = hand;
      player.hands = hands;
      
      if (hand.isBusted) {
        if (player.currentHandIndex < player.hands.length - 1) {
          player.currentHandIndex++;
        } else {
          player.hasFinished = true;
        }
      }
      
      newStates[currentPlayerIndex] = player;
      return newStates;
    });
  }, [deck, currentPlayerIndex]);

  const handleStand = useCallback(() => {
    setPlayerStates(prev => {
      const newStates = [...prev];
      const player = { ...newStates[currentPlayerIndex] };
      const hands = [...player.hands];
      hands[player.currentHandIndex] = { ...hands[player.currentHandIndex], isStanding: true };
      player.hands = hands;
      
      if (player.currentHandIndex < player.hands.length - 1) {
        player.currentHandIndex++;
      } else {
        player.hasFinished = true;
      }
      
      newStates[currentPlayerIndex] = player;
      return newStates;
    });
  }, [currentPlayerIndex]);

  const handleDouble = useCallback(() => {
    const { card, remainingDeck } = drawCard(deck);
    if (!card) return;

    setDeck(remainingDeck);
    
    setPlayerStates(prev => {
      const newStates = [...prev];
      const player = { ...newStates[currentPlayerIndex] };
      const hands = [...player.hands];
      const hand = { ...hands[player.currentHandIndex] };
      
      hand.cards = [...hand.cards, card];
      hand.value = calculateBlackjackValue(hand.cards);
      hand.isBusted = hand.value > 21;
      hand.isDoubled = true;
      hand.bet = hand.bet * 2;
      hand.isStanding = true;
      
      hands[player.currentHandIndex] = hand;
      player.hands = hands;
      
      if (player.currentHandIndex < player.hands.length - 1) {
        player.currentHandIndex++;
      } else {
        player.hasFinished = true;
      }
      
      newStates[currentPlayerIndex] = player;
      return newStates;
    });
  }, [deck, currentPlayerIndex]);

  const handleSplit = useCallback(() => {
    const { cards: newCards, remainingDeck } = drawCards(deck, 2);
    if (newCards.length < 2) return;

    setDeck(remainingDeck);
    
    setPlayerStates(prev => {
      const newStates = [...prev];
      const player = { ...newStates[currentPlayerIndex] };
      const originalHand = player.hands[0];
      
      const hand1: Hand = {
        cards: [originalHand.cards[0], newCards[0]],
        value: calculateBlackjackValue([originalHand.cards[0], newCards[0]]),
        isBusted: false,
        isStanding: false,
        bet: originalHand.bet,
        isDoubled: false,
      };
      
      const hand2: Hand = {
        cards: [originalHand.cards[1], newCards[1]],
        value: calculateBlackjackValue([originalHand.cards[1], newCards[1]]),
        isBusted: false,
        isStanding: false,
        bet: originalHand.bet,
        isDoubled: false,
      };
      
      player.hands = [hand1, hand2];
      player.currentHandIndex = 0;
      
      newStates[currentPlayerIndex] = player;
      return newStates;
    });
  }, [deck, currentPlayerIndex]);

  // Move to next player when current finishes
  const moveToNextPlayer = useCallback(() => {
    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(prev => prev + 1);
    } else if (allPlayersFinished) {
      // All players done, dealer plays
      setPhase('dealer');
      
      let currentDeck = deck;
      let currentDealerHand = { ...dealerHand };
      
      // Dealer draws until 17
      while (currentDealerHand.value < 17) {
        const { card, remainingDeck } = drawCard(currentDeck);
        if (!card) break;
        currentDeck = remainingDeck;
        currentDealerHand.cards = [...currentDealerHand.cards, card];
        currentDealerHand.value = calculateBlackjackValue(currentDealerHand.cards);
      }
      
      currentDealerHand.isBusted = currentDealerHand.value > 21;
      setDeck(currentDeck);
      setDealerHand(currentDealerHand);
      
      // Calculate results
      setTimeout(() => {
        const results: { player: string; result: string; sips: number; canGive: boolean }[] = [];
        const dValue = currentDealerHand.value;
        const dealerBusted = currentDealerHand.isBusted;
        
        playerStates.forEach(player => {
          player.hands.forEach((hand, handIdx) => {
            const pValue = hand.value;
            const handLabel = player.hands.length > 1 ? ` (${language === 'hu' ? 'Kez' : 'Hand'} ${handIdx + 1})` : '';
            
            if (hand.isBusted) {
              results.push({
                player: player.name + handLabel,
                result: language === 'hu' ? 'Betelt - Igyal!' : 'Busted - Drink!',
                sips: hand.bet,
                canGive: false,
              });
            } else if (dealerBusted || pValue > dValue) {
              results.push({
                player: player.name + handLabel,
                result: language === 'hu' ? 'Nyert!' : 'Won!',
                sips: hand.bet,
                canGive: true,
              });
            } else if (pValue < dValue) {
              results.push({
                player: player.name + handLabel,
                result: language === 'hu' ? 'Vesztett - Igyal!' : 'Lost - Drink!',
                sips: hand.bet,
                canGive: false,
              });
            } else {
              results.push({
                player: player.name + handLabel,
                result: language === 'hu' ? 'Dontetlen' : 'Push',
                sips: 0,
                canGive: false,
              });
            }
          });
        });
        
        setRoundResults(results);
        setPhase('results');
      }, 500);
    }
  }, [currentPlayerIndex, players.length, allPlayersFinished, deck, dealerHand, playerStates, language]);

  // Auto-advance when player finishes
  if (phase === 'playing' && currentPlayer?.hasFinished && !allPlayersFinished) {
    setTimeout(() => moveToNextPlayer(), 100);
  } else if (phase === 'playing' && allPlayersFinished) {
    setTimeout(() => moveToNextPlayer(), 100);
  }

  const handleNewRound = useCallback(() => {
    const nextRound = currentRoundNum + 1;
    
    if (nextRound > totalRounds) {
      // Game completely over, go back to settings
      setPhase('settings');
      setCurrentRoundNum(1);
      setDeck(shuffleDeck(createDeck()));
      setPlayerStates(players.map(p => ({
        name: p.name,
        hands: [createEmptyHand()],
        currentHandIndex: 0,
        totalSips: 0,
        hasFinished: false,
      })));
      setDealerHand(createEmptyHand());
      setRoundResults([]);
      setBetAmount(3);
      return;
    }
    
    const newDeck = deck.length < 20 ? shuffleDeck(createDeck()) : deck;
    setDeck(newDeck);
    setPlayerStates(players.map(p => ({
      name: p.name,
      hands: [createEmptyHand()],
      currentHandIndex: 0,
      totalSips: 0,
      hasFinished: false,
    })));
    setDealerHand(createEmptyHand());
    setCurrentPlayerIndex(0);
    setPhase('betting');
    setRoundResults([]);
    setBetAmount(3);
    setCurrentRoundNum(nextRound);
  }, [deck, players, currentRoundNum, totalRounds]);

  return (
    <div className="min-h-screen flex flex-col safe-area-top safe-area-bottom bg-background">
      {/* Header */}
      <header className="flex items-center justify-between p-4">
        <Button variant="ghost" onClick={onBack} className="text-muted-foreground">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('back', language)}
        </Button>
        
        <div className="flex items-center gap-3">
          {phase !== 'settings' && (
            <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1 rounded-full">
              <span className="text-sm font-medium">{language === 'hu' ? 'Kor' : 'Round'}:</span>
              <span className="font-bold text-amber-400">{currentRoundNum}/{totalRounds}</span>
            </div>
          )}
          <Spade className="w-5 h-5 text-amber-400" />
        </div>
      </header>

      {/* Main game area */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 gap-4 overflow-y-auto pb-4">
        {/* Settings Phase */}
        {phase === 'settings' && (
          <>
            <Settings className="w-16 h-16 text-amber-400 mb-2" />
            <h2 className="text-2xl font-bold text-golden mb-6">
              {language === 'hu' ? 'Blackjack Beallitasok' : 'Blackjack Settings'}
            </h2>
            
            <div className="w-full max-w-sm space-y-6">
              <div className="bg-card/50 rounded-2xl p-6 border border-amber-500/20">
                <p className="text-muted-foreground text-center mb-4">
                  {language === 'hu' ? 'Hany koros legyen a jatek?' : 'How many rounds?'}
                </p>
                
                <div className="flex items-center justify-center gap-6">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setTotalRounds(Math.max(1, totalRounds - 1))}
                    className="w-14 h-14 rounded-full bg-transparent"
                  >
                    <Minus className="w-6 h-6" />
                  </Button>
                  
                  <span className="text-5xl font-black text-amber-400 w-20 text-center">{totalRounds}</span>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setTotalRounds(Math.min(20, totalRounds + 1))}
                    className="w-14 h-14 rounded-full bg-transparent"
                  >
                    <Plus className="w-6 h-6" />
                  </Button>
                </div>
              </div>
              
              <div className="text-center text-sm text-muted-foreground">
                <p>{language === 'hu' ? 'Jatekosok' : 'Players'}: {players.length}</p>
              </div>
            </div>
          </>
        )}

        {/* Betting Phase */}
        {phase === 'betting' && (
          <>
            <div className="text-center">
              <p className="text-muted-foreground text-sm mb-1">
                {language === 'hu' ? 'Jatekos' : 'Player'}
              </p>
              <h2 className="text-2xl font-bold text-golden">{players[currentPlayerIndex]?.name}</h2>
            </div>

            <div className="bg-card/50 rounded-2xl p-6 border border-amber-500/20 text-center">
              <p className="text-muted-foreground text-sm mb-4">
                {language === 'hu' ? 'Hany kortyba jatszol?' : 'How many sips do you bet?'}
              </p>
              
              <div className="flex items-center justify-center gap-6">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setBetAmount(Math.max(1, betAmount - 1))}
                  className="w-14 h-14 rounded-full bg-transparent"
                >
                  <Minus className="w-6 h-6" />
                </Button>
                
                <div className="flex items-center gap-2">
                  <Wine className="w-8 h-8 text-amber-400" />
                  <span className="text-5xl font-black text-amber-400">{betAmount}</span>
                </div>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setBetAmount(Math.min(10, betAmount + 1))}
                  className="w-14 h-14 rounded-full bg-transparent"
                >
                  <Plus className="w-6 h-6" />
                </Button>
              </div>
            </div>
            
            <PlayingCard faceDown size="xl" />
          </>
        )}

        {/* Results Phase */}
        {phase === 'results' && (
          <>
            {/* Dealer final hand */}
            <div className="text-center mb-4">
              <p className="text-muted-foreground text-sm mb-2">
                {language === 'hu' ? 'Oszto' : 'Dealer'} - <span className="text-amber-400 font-bold">{dealerHand.value}</span>
                {dealerHand.isBusted && <span className="text-red-400 ml-1">({language === 'hu' ? 'Betelt' : 'Bust'})</span>}
              </p>
              <div className="flex gap-3 justify-center">
                {dealerHand.cards.map((card) => (
                  <PlayingCard key={card.id} card={card} size="lg" />
                ))}
              </div>
            </div>

            {/* Results */}
            <div className="w-full max-w-md space-y-3">
              <h3 className="text-xl font-bold text-center text-golden mb-4">
                {language === 'hu' ? 'Eredmenyek' : 'Results'}
              </h3>
              {roundResults.map((result, i) => (
                <div
                  key={i}
                  className={cn(
                    'p-4 rounded-xl flex justify-between items-center border',
                    result.canGive && 'bg-green-500/10 border-green-500/30',
                    !result.canGive && result.sips > 0 && 'bg-red-500/10 border-red-500/30',
                    result.sips === 0 && 'bg-card/50 border-border/50'
                  )}
                >
                  <div>
                    <p className="font-semibold">{result.player}</p>
                    <p className="text-sm text-muted-foreground">{result.result}</p>
                  </div>
                  {result.sips !== 0 && (
                    <div className={cn(
                      'text-xl font-bold flex items-center gap-2',
                      result.canGive ? 'text-green-400' : 'text-red-400'
                    )}>
                      {result.canGive ? (
                        <>
                          <Trophy className="w-5 h-5" />
                          {language === 'hu' ? `Adj ki ${result.sips} kortyot!` : `Give out ${result.sips} sips!`}
                        </>
                      ) : (
                        <>
                          <X className="w-5 h-5" />
                          {result.sips} {language === 'hu' ? 'korty' : 'sips'}
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="w-full max-w-md mt-6 p-4 rounded-2xl bg-card/80 border border-amber-500/30">
              <h4 className="text-lg font-bold text-center text-amber-400 mb-4 flex items-center justify-center gap-2">
                <Wine className="w-5 h-5" />
                {language === 'hu' ? 'Osszesito' : 'Summary'}
              </h4>
              <div className="space-y-2">
                {(() => {
                  const summary: { name: string; toDrink: number; toGive: number }[] = [];
                  roundResults.forEach(r => {
                    const baseName = r.player.split(' (')[0];
                    let existing = summary.find(s => s.name === baseName);
                    if (!existing) {
                      existing = { name: baseName, toDrink: 0, toGive: 0 };
                      summary.push(existing);
                    }
                    if (r.canGive) {
                      existing.toGive += r.sips;
                    } else {
                      existing.toDrink += r.sips;
                    }
                  });
                  return summary.map((s, i) => (
                    <div key={i} className="flex justify-between items-center p-3 rounded-xl bg-background/50">
                      <span className="font-semibold">{s.name}</span>
                      <div className="flex gap-4 text-sm">
                        {s.toDrink > 0 && (
                          <span className="text-red-400 font-bold flex items-center gap-1">
                            <X className="w-4 h-4" />
                            {s.toDrink} {language === 'hu' ? 'korty' : 'sips'}
                          </span>
                        )}
                        {s.toGive > 0 && (
                          <span className="text-green-400 font-bold flex items-center gap-1">
                            <Trophy className="w-4 h-4" />
                            {s.toGive} {language === 'hu' ? 'oszthato' : 'to give'}
                          </span>
                        )}
                        {s.toDrink === 0 && s.toGive === 0 && (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </>
        )}

        {/* Playing Phase */}
        {(phase === 'playing' || phase === 'dealer') && (
          <>
            {/* Dealer hand */}
            <div className="text-center">
              <p className="text-muted-foreground text-sm mb-2">
                {language === 'hu' ? 'Oszto' : 'Dealer'}
                {(phase === 'dealer' || !isMultiplayer || allPlayersFinished) && (
                  <span className="text-amber-400 font-bold ml-2">{dealerHand.value}</span>
                )}
              </p>
              <div className="flex gap-3 justify-center">
                {dealerHand.cards.map((card, index) => (
                  <PlayingCard 
                    key={card.id} 
                    card={(isMultiplayer && !allPlayersFinished && index === 1) ? undefined : card}
                    faceDown={isMultiplayer && !allPlayersFinished && index === 1}
                    size="lg" 
                  />
                ))}
              </div>
            </div>

            <div className="h-4" />

            {/* Current player indicator for multiplayer */}
            {isMultiplayer && phase === 'playing' && (
              <div className="bg-amber-500/20 px-4 py-2 rounded-full border border-amber-500/30">
                <p className="text-sm font-medium">
                  {language === 'hu' ? 'Most:' : 'Now:'} <span className="text-amber-400 font-bold">{currentPlayer?.name}</span>
                </p>
              </div>
            )}

            {/* Player hands */}
            <div className="w-full max-w-lg space-y-4">
              {playerStates.map((player, pIdx) => (
                <div 
                  key={player.name}
                  className={cn(
                    'p-4 rounded-2xl transition-all border',
                    pIdx === currentPlayerIndex && phase === 'playing' 
                      ? 'bg-card/80 ring-2 ring-amber-400 border-amber-400/50' 
                      : 'bg-card/30 border-border/30 opacity-70'
                  )}
                >
                  <p className="text-sm font-medium mb-3 text-muted-foreground flex items-center justify-between">
                    <span>{player.name}</span>
                    {player.hasFinished && (
                      <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                        {language === 'hu' ? 'Kesz' : 'Done'}
                      </span>
                    )}
                  </p>
                  <div className="flex gap-4">
                    {player.hands.map((hand, hIdx) => (
                      <div key={hIdx} className="flex-1">
                        {player.hands.length > 1 && (
                          <p className="text-xs text-muted-foreground mb-2">
                            {language === 'hu' ? 'Kez' : 'Hand'} {hIdx + 1}
                            {pIdx === currentPlayerIndex && hIdx === player.currentHandIndex && (
                              <span className="text-amber-400 ml-1">*</span>
                            )}
                          </p>
                        )}
                        <div className="flex gap-2 flex-wrap">
                          {hand.cards.map((card) => (
                            <PlayingCard 
                              key={card.id} 
                              card={card} 
                              size={pIdx === currentPlayerIndex ? 'lg' : 'md'} 
                            />
                          ))}
                        </div>
                        <p className="text-sm mt-2">
                          <span className="text-amber-400 font-bold">{hand.value}</span>
                          {hand.isBusted && <span className="text-red-400 ml-2">({language === 'hu' ? 'Betelt' : 'Bust'})</span>}
                          {hand.isDoubled && <span className="text-amber-400 ml-2">(2x)</span>}
                          <span className="text-muted-foreground ml-3 text-xs flex items-center gap-1 inline-flex">
                            <Wine className="w-3 h-3" /> {hand.bet}
                          </span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Bottom actions */}
      <div className="p-4">
        {phase === 'settings' && (
          <Button onClick={startGame} className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold" size="lg">
            {language === 'hu' ? 'Jatek inditas' : 'Start Game'}
          </Button>
        )}

        {phase === 'betting' && (
          <Button onClick={placeBet} className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold" size="lg">
            {currentPlayerIndex < players.length - 1 
              ? (language === 'hu' ? 'Kovetkezo jatekos' : 'Next Player')
              : (language === 'hu' ? 'Osztas' : 'Deal')
            }
          </Button>
        )}
        
        {phase === 'playing' && currentPlayer && !currentPlayer.hasFinished && currentHand && !currentHand.isBusted && !currentHand.isStanding && (
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Button onClick={handleHit} className="flex-1 h-14 bg-green-600 hover:bg-green-700 text-white font-bold text-lg" size="lg">
                {t('hit', language)}
              </Button>
              <Button onClick={handleStand} className="flex-1 h-14 bg-red-600 hover:bg-red-700 text-white font-bold text-lg" size="lg">
                {t('stand', language)}
              </Button>
            </div>
            <div className="flex gap-2">
              {canDouble && (
                <Button onClick={handleDouble} variant="outline" className="flex-1 h-12 bg-transparent border-amber-500/50 text-amber-400 hover:bg-amber-500/10" size="sm">
                  {language === 'hu' ? 'Duplazas (2x)' : 'Double (2x)'}
                </Button>
              )}
              {canSplit && (
                <Button onClick={handleSplit} variant="outline" className="flex-1 h-12 bg-transparent border-amber-500/50 text-amber-400 hover:bg-amber-500/10" size="sm">
                  {language === 'hu' ? 'Osztas' : 'Split'}
                </Button>
              )}
            </div>
          </div>
        )}
        
        {phase === 'results' && (
          <Button onClick={handleNewRound} className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold" size="lg">
            <RotateCcw className="w-5 h-5 mr-2" />
            {currentRoundNum >= totalRounds 
              ? (language === 'hu' ? 'Uj jatek' : 'New Game')
              : (language === 'hu' ? 'Kovetkezo kor' : 'Next Round')
            }
          </Button>
        )}
      </div>
    </div>
  );
}
