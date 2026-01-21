'use client';

import { useState, useCallback, useEffect } from 'react';
import { useGame } from '@/lib/game-context';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCcw, Check, X, Play, Timer, Trophy, Star, Users, BookOpen, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TabooProps {
  onBack: () => void;
}

interface WordSet {
  easy: string;
  medium: string;
  hard: string;
}

// Kártyák - mindegyiken 3 szó (könnyű, közepes, nehéz)
const WORD_SETS: WordSet[] = [
  { easy: 'Kutya', medium: 'Állatorvos', hard: 'Hűség' },
  { easy: 'Macska', medium: 'Macskakaparás', hard: 'Függetlenség' },
  { easy: 'Ház', medium: 'Építészet', hard: 'Otthon' },
  { easy: 'Autó', medium: 'Forgalom', hard: 'Szabadság' },
  { easy: 'Víz', medium: 'Óceán', hard: 'Élet' },
  { easy: 'Tűz', medium: 'Tűzoltó', hard: 'Szenvedély' },
  { easy: 'Nap', medium: 'Naprendszer', hard: 'Energia' },
  { easy: 'Hold', medium: 'Űrhajós', hard: 'Romantika' },
  { easy: 'Fa', medium: 'Erdő', hard: 'Növekedés' },
  { easy: 'Virág', medium: 'Kertész', hard: 'Szépség' },
  { easy: 'Kenyér', medium: 'Pékség', hard: 'Hagyomány' },
  { easy: 'Tej', medium: 'Tehenészet', hard: 'Táplálék' },
  { easy: 'Alma', medium: 'Gyümölcsös', hard: 'Egészség' },
  { easy: 'Szék', medium: 'Bútor', hard: 'Kényelem' },
  { easy: 'Könyv', medium: 'Könyvtár', hard: 'Tudás' },
  { easy: 'Toll', medium: 'Író', hard: 'Kreativitás' },
  { easy: 'Óra', medium: 'Időzóna', hard: 'Múlandóság' },
  { easy: 'Pénz', medium: 'Bank', hard: 'Biztonság' },
  { easy: 'Szív', medium: 'Kardiológus', hard: 'Szerelem' },
  { easy: 'Szem', medium: 'Szemüveg', hard: 'Megfigyelés' },
  { easy: 'Kéz', medium: 'Kézműves', hard: 'Alkotás' },
  { easy: 'Láb', medium: 'Maraton', hard: 'Kitartás' },
  { easy: 'Fej', medium: 'Gondolkodás', hard: 'Értelem' },
  { easy: 'Haj', medium: 'Fodrász', hard: 'Identitás' },
  { easy: 'Száj', medium: 'Beszéd', hard: 'Kommunikáció' },
  { easy: 'Fül', medium: 'Zenész', hard: 'Hallgatás' },
  { easy: 'Orr', medium: 'Parfüm', hard: 'Ösztön' },
  { easy: 'Fog', medium: 'Fogorvos', hard: 'Mosoly' },
  { easy: 'Eső', medium: 'Időjárás', hard: 'Melankólia' },
  { easy: 'Hó', medium: 'Síelés', hard: 'Tisztaság' },
  { easy: 'Szél', medium: 'Szélerőmű', hard: 'Változás' },
  { easy: 'Felhő', medium: 'Repülőgép', hard: 'Álmodozás' },
  { easy: 'Csillag', medium: 'Csillagász', hard: 'Remény' },
  { easy: 'Hegy', medium: 'Hegymászó', hard: 'Kihívás' },
  { easy: 'Tenger', medium: 'Hajózás', hard: 'Végtelen' },
  { easy: 'Folyó', medium: 'Halászat', hard: 'Folyamatosság' },
  { easy: 'Madár', medium: 'Ornitológia', hard: 'Szabadság' },
  { easy: 'Hal', medium: 'Akvárium', hard: 'Csend' },
  { easy: 'Ló', medium: 'Lovaglás', hard: 'Nemesség' },
  { easy: 'Tehén', medium: 'Tejgazdaság', hard: 'Türelem' },
  { easy: 'Polip', medium: 'Tengerfenék', hard: 'Intelligencia' },
  { easy: 'Kígyó', medium: 'Méregzsák', hard: 'Megújulás' },
  { easy: 'Elefánt', medium: 'Szafari', hard: 'Emlékezet' },
  { easy: 'Oroszlán', medium: 'Szavanna', hard: 'Bátorság' },
  { easy: 'Pingvin', medium: 'Antarktisz', hard: 'Kitartás' },
];

export function Taboo({ onBack }: TabooProps) {
  const { players, language } = useGame();
  const [phase, setPhase] = useState<'rules' | 'setup' | 'select-card' | 'playing' | 'select-guesser' | 'results'>('rules');
  const [currentDescriberIndex, setCurrentDescriberIndex] = useState(0);
  const [currentCard, setCurrentCard] = useState<WordSet | null>(null);
  const [selectedWord, setSelectedWord] = useState<{ word: string; points: number } | null>(null);
  const [usedCardIndices, setUsedCardIndices] = useState<Set<number>>(new Set());
  const [scores, setScores] = useState<{ [playerId: string]: number }>({});
  const [timeLeft, setTimeLeft] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [roundTime, setRoundTime] = useState(60);
  const [cardsCompleted, setCardsCompleted] = useState(0);
  const [isCardAnimating, setIsCardAnimating] = useState(false);
  const [cardAnimationDirection, setCardAnimationDirection] = useState<'left' | 'right'>('left');

  // Inicializálás
  useEffect(() => {
    const initialScores: { [playerId: string]: number } = {};
    players.forEach(p => {
      initialScores[p.id] = 0;
    });
    setScores(initialScores);
  }, [players]);

  // Időzítő - CSAK ha fut
  useEffect(() => {
    if (!isTimerRunning || timeLeft <= 0) return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft]);

  // Új kártya húzása
  const drawNewCard = useCallback(() => {
    const availableIndices = WORD_SETS.map((_, i) => i).filter(i => !usedCardIndices.has(i));
    
    if (availableIndices.length === 0) {
      setUsedCardIndices(new Set());
      drawNewCard();
      return;
    }
    
    const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    setCurrentCard(WORD_SETS[randomIndex]);
    setUsedCardIndices(prev => new Set(prev).add(randomIndex));
    setSelectedWord(null);
  }, [usedCardIndices]);

  // Beállítás után kártya választás
  const handleStartGame = () => {
    setPhase('select-card');
    setTimeLeft(roundTime);
    setCardsCompleted(0);
    drawNewCard();
    // Az idő NEM indul el még!
  };

  // Szó kiválasztása a kártyáról - ITT indul az idő!
  const handleSelectWord = (word: string, points: number) => {
    setSelectedWord({ word, points });
    setPhase('playing');
    setIsTimerRunning(true); // Most indul az időzítő!
  };

  // Másik kártya (passz a kártya választásnál) - animációval
  const handleSkipCard = () => {
    if (isCardAnimating) return;
    setIsCardAnimating(true);
    setCardAnimationDirection('left');
    
    setTimeout(() => {
      drawNewCard();
      setCardAnimationDirection('right');
      
      setTimeout(() => {
        setIsCardAnimating(false);
      }, 200);
    }, 200);
  };

  // Helyes válasz - ki találta ki?
  const handleCorrect = () => {
    setIsTimerRunning(false);
    setPhase('select-guesser');
  };

  // Kitaláló kiválasztása
  const handleSelectGuesser = (guesserIndex: number) => {
    if (!selectedWord) return;
    
    const describer = players[currentDescriberIndex];
    const guesser = players[guesserIndex];
    
    // Mindketten kapnak pontot
    setScores(prev => ({
      ...prev,
      [describer.id]: (prev[describer.id] || 0) + selectedWord.points,
      [guesser.id]: (prev[guesser.id] || 0) + selectedWord.points
    }));
    
    setCardsCompleted(prev => prev + 1);
    
    // A kitaláló lesz a következő leíró
    setCurrentDescriberIndex(guesserIndex);
    setPhase('select-card');
    setTimeLeft(roundTime);
    drawNewCard();
    // Az idő NEM indul el - csak ha kiválaszt szót
  };

  // Passz játék közben - senki nem találta ki
  const handlePass = () => {
    setPhase('select-card');
    drawNewCard();
    // Időzítő folytatódik ha még van idő
  };

  // Kör vége (idő lejárt vagy befejezés)
  const handleEndGame = () => {
    setIsTimerRunning(false);
    setPhase('results');
  };

  // Új játék
  const handleNewGame = () => {
    setPhase('setup');
    setCurrentDescriberIndex(0);
    setUsedCardIndices(new Set());
    setCardsCompleted(0);
    const initialScores: { [playerId: string]: number } = {};
    players.forEach(p => {
      initialScores[p.id] = 0;
    });
    setScores(initialScores);
  };

  const currentDescriber = players[currentDescriberIndex];

  // Szabályok fázis
  if (phase === 'rules') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground gap-1">
            <ArrowLeft className="w-4 h-4" />
            Vissza
          </Button>
          <h1 className="text-lg font-bold text-amber-400">Egyszótagos</h1>
          <div className="w-16" />
        </header>

        <main className="flex-1 overflow-y-auto px-4 py-6">
          <div className="w-full max-w-md mx-auto">
            {/* Szabályok kártya */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-6 h-6 text-amber-400" />
                <h2 className="text-xl font-bold text-amber-400">Játékszabályok</h2>
              </div>
              
              <p className="text-amber-100/80 mb-4 leading-relaxed">
                A játékban egyszerre vagytok költők és ősemberek! A feladványszavakat 
                körülírással kell a többi játékos tudomására hozni, de <span className="text-amber-400 font-semibold">csak 
                egyszótagú szavakat</span> használhattok!
              </p>

              <div className="p-4 rounded-xl bg-zinc-800/50 mb-4">
                <p className="text-sm text-amber-400 mb-2 font-semibold">Példa:</p>
                <p className="text-amber-100/70 italic">
                  "Él mély víz, van nyolc láb és nagy fej" - Mi lehet ez?
                </p>
                <p className="text-green-400 mt-2 font-medium">Válasz: Polip</p>
              </div>
            </div>

            {/* Tiltott dolgok */}
            <div className="p-5 rounded-2xl bg-red-500/10 border border-red-500/20 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <h3 className="text-lg font-bold text-red-400">Tilos!</h3>
              </div>
              
              <ul className="space-y-2 text-sm text-red-100/80">
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <span>Kimondani a kitalálandó szót vagy bármely részét</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <span>Gesztikulálni, mutogatni</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <span>Hangutánzó szavakat, rímeket használni</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <span>Lebetűzni a szót vagy rövidítéseket használni</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                  <span>Idegen szavakat mondani - csak magyarul!</span>
                </li>
              </ul>
            </div>

            {/* Pontrendszer */}
            <div className="p-5 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 mb-8">
              <h3 className="text-lg font-bold text-white mb-3">Pontrendszer</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-green-500/10">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-green-400 fill-green-400" />
                    <span className="text-green-400">Könnyű szó</span>
                  </div>
                  <span className="text-green-400 font-bold">1 pont</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-amber-500/10">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    <span className="text-amber-400">Közepes szó</span>
                  </div>
                  <span className="text-amber-400 font-bold">2 pont</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/10">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-red-400 fill-red-400" />
                    <Star className="w-4 h-4 text-red-400 fill-red-400" />
                    <Star className="w-4 h-4 text-red-400 fill-red-400" />
                    <span className="text-red-400">Nehéz szó</span>
                  </div>
                  <span className="text-red-400 font-bold">3 pont</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                A leíró és a kitaláló is megkapja a pontokat!
              </p>
            </div>

            <Button
              onClick={() => setPhase('setup')}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black rounded-full shadow-lg"
            >
              Tovább
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Setup fázis
  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <Button variant="ghost" size="sm" onClick={() => setPhase('rules')} className="text-muted-foreground gap-1">
            <ArrowLeft className="w-4 h-4" />
            Szabályok
          </Button>
          <h1 className="text-lg font-bold text-amber-400">Egyszótagos</h1>
          <div className="w-16" />
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-md text-center">
            {/* Időbeállítás */}
            <div className="mb-8">
              <p className="text-sm text-muted-foreground mb-3">Idő szavanként</p>
              <div className="flex gap-2 justify-center flex-wrap">
                {[30, 45, 60, 90, 120].map(time => (
                  <button
                    key={time}
                    onClick={() => setRoundTime(time)}
                    className={cn(
                      'px-5 py-3 rounded-full text-sm font-medium transition-all',
                      roundTime === time
                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/30'
                        : 'bg-card border border-amber-500/20 text-amber-400 hover:bg-amber-500/10'
                    )}
                  >
                    {time}s
                  </button>
                ))}
              </div>
            </div>

            {/* Első leíró */}
            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30">
              <p className="text-sm text-muted-foreground mb-2">Első leíró</p>
              <h2 className="text-3xl font-bold text-amber-400">{currentDescriber.name}</h2>
            </div>

            <Button
              onClick={handleStartGame}
              className="h-14 px-10 text-lg font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black rounded-full shadow-lg"
            >
              <Play className="w-5 h-5 mr-2" />
              Játék indítása
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Kitaláló kiválasztása
  if (phase === 'select-guesser') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <div className="w-16" />
          <h1 className="text-lg font-bold text-amber-400">Ki találta ki?</h1>
          <div className="w-16" />
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
          <div className="w-full max-w-md">
            {/* Kitalált szó */}
            <div className="mb-6 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-center">
              <p className="text-sm text-green-400 mb-1">Kitalált szó</p>
              <h2 className="text-2xl font-bold text-white">{selectedWord?.word}</h2>
              <p className="text-green-400 text-sm mt-1">+{selectedWord?.points} pont mindkettőtöknek</p>
            </div>

            <p className="text-center text-muted-foreground mb-4">
              Válaszd ki, ki találta ki a szót:
            </p>

            {/* Játékosok listája (kivéve a leírót) */}
            <div className="space-y-3">
              {players.map((player, index) => {
                if (index === currentDescriberIndex) return null;
                
                return (
                  <button
                    key={player.id}
                    onClick={() => handleSelectGuesser(index)}
                    className="w-full p-4 rounded-xl bg-card border border-amber-500/20 hover:border-amber-500/50 hover:bg-amber-500/10 transition-all flex items-center justify-between"
                  >
                    <span className="font-semibold text-lg">{player.name}</span>
                    <span className="text-amber-400 text-sm">{scores[player.id] || 0} pont</span>
                  </button>
                );
              })}
            </div>

            {/* Senki sem találta ki */}
            <button
              onClick={() => {
                setPhase('select-card');
                drawNewCard();
              }}
              className="w-full mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
            >
              Senki sem találta ki
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Kártya választás fázis (idő még NEM fut)
  if (phase === 'select-card') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-lg font-bold bg-zinc-700/50 text-zinc-400">
            <Timer className="w-5 h-5" />
            {roundTime}s
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Leíró</p>
            <p className="text-sm font-bold text-amber-400">{currentDescriber.name}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEndGame}
            className="text-muted-foreground"
          >
            Vége
          </Button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
          {currentCard && (
            <>
              <p className="text-center text-muted-foreground mb-4 text-sm">
                Válassz egy szót - utána indul az idő!
              </p>
              
              {/* Kártya 3 szóval - animációval */}
              <div className="w-full max-w-sm mb-6 overflow-hidden">
                <div 
                  className={cn(
                    "relative transition-all duration-200 ease-out",
                    isCardAnimating && cardAnimationDirection === 'left' && "translate-x-[-120%] opacity-0 rotate-[-10deg]",
                    isCardAnimating && cardAnimationDirection === 'right' && "translate-x-[120%] opacity-0 rotate-[10deg]",
                    !isCardAnimating && "translate-x-0 opacity-100 rotate-0"
                  )}
                >
                  {/* Kártya háttér */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-600/20 to-amber-800/20 rounded-3xl transform rotate-2" />
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-amber-700/20 rounded-3xl transform -rotate-1" />
                  
                  {/* Fő kártya */}
                  <div className="relative p-6 rounded-3xl bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-amber-500/40 shadow-2xl">
                    <div className="text-center mb-4">
                      <p className="text-xs text-amber-400/60 uppercase tracking-wider">Kártya #{cardsCompleted + 1}</p>
                    </div>
                    
                    {/* 3 szó opció */}
                    <div className="space-y-3">
                      {/* Könnyű */}
                      <button
                        onClick={() => handleSelectWord(currentCard.easy, 1)}
                        className="w-full p-4 rounded-xl bg-green-500/10 border-2 border-green-500/30 hover:border-green-500 hover:bg-green-500/20 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold text-white group-hover:text-green-400 transition-colors">
                            {currentCard.easy}
                          </span>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-green-400 fill-green-400" />
                            <span className="text-green-400 text-sm font-medium">1 pont</span>
                          </div>
                        </div>
                      </button>
                      
                      {/* Közepes */}
                      <button
                        onClick={() => handleSelectWord(currentCard.medium, 2)}
                        className="w-full p-4 rounded-xl bg-amber-500/10 border-2 border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/20 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold text-white group-hover:text-amber-400 transition-colors">
                            {currentCard.medium}
                          </span>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                            <span className="text-amber-400 text-sm font-medium">2 pont</span>
                          </div>
                        </div>
                      </button>
                      
                      {/* Nehéz */}
                      <button
                        onClick={() => handleSelectWord(currentCard.hard, 3)}
                        className="w-full p-4 rounded-xl bg-red-500/10 border-2 border-red-500/30 hover:border-red-500 hover:bg-red-500/20 transition-all group"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xl font-bold text-white group-hover:text-red-400 transition-colors">
                            {currentCard.hard}
                          </span>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 text-red-400 fill-red-400" />
                            <Star className="w-4 h-4 text-red-400 fill-red-400" />
                            <Star className="w-4 h-4 text-red-400 fill-red-400" />
                            <span className="text-red-400 text-sm font-medium">3 pont</span>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Passz gomb */}
              <button
                onClick={handleSkipCard}
                className="px-6 py-2 rounded-full bg-zinc-700/50 text-zinc-400 hover:bg-zinc-700 transition-all text-sm"
              >
                Másik kártya
              </button>
            </>
          )}
        </main>

        {/* Pontszámok */}
        <div className="px-4 py-3 border-t border-border/30">
          <div className="flex justify-around">
            {players.map(player => (
              <div key={player.id} className="text-center">
                <p className="text-xs text-muted-foreground truncate max-w-[80px]">{player.name}</p>
                <p className="text-lg font-bold text-amber-400">{scores[player.id] || 0}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Játék fázis (idő FUT)
  if (phase === 'playing' && selectedWord) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-lg font-bold",
            timeLeft <= 10 ? "bg-red-500/20 text-red-400 animate-pulse" : "bg-amber-500/20 text-amber-400"
          )}>
            <Timer className="w-5 h-5" />
            {timeLeft}s
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Leíró</p>
            <p className="text-sm font-bold text-amber-400">{currentDescriber.name}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleEndGame}
            className="text-muted-foreground"
          >
            Vége
          </Button>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
          {/* Kiválasztott szó megjelenítése */}
          <div className="w-full max-w-sm mb-6">
            <div className="p-8 rounded-3xl bg-gradient-to-br from-zinc-800 to-zinc-900 border-2 border-amber-500/40 shadow-2xl text-center">
              <div className="flex justify-center gap-1 mb-3">
                {Array(selectedWord.points).fill(0).map((_, i) => (
                  <Star 
                    key={i} 
                    className={cn(
                      "w-6 h-6 fill-current",
                      selectedWord.points === 1 ? "text-green-400" :
                      selectedWord.points === 2 ? "text-amber-400" : "text-red-400"
                    )} 
                  />
                ))}
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">{selectedWord.word}</h1>
              <p className="text-amber-400/60 text-sm">
                Csak egyszótagú szavakkal!
              </p>
            </div>
          </div>

          {/* Akció gombok */}
          <div className="flex gap-4 w-full max-w-sm">
            <button
              onClick={handlePass}
              className="flex-1 h-14 rounded-xl bg-red-500/20 border-2 border-red-500 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <X className="w-6 h-6 text-red-400" />
              <span className="text-red-400 font-bold">Passz</span>
            </button>
            <button
              onClick={handleCorrect}
              className="flex-1 h-14 rounded-xl bg-green-500/20 border-2 border-green-500 flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Check className="w-6 h-6 text-green-400" />
              <span className="text-green-400 font-bold">Kitalálták!</span>
            </button>
          </div>

          {/* Idő lejárt figyelmeztetés */}
          {timeLeft === 0 && (
            <div className="mt-6 p-4 rounded-xl bg-red-500/20 border border-red-500/30 text-center">
              <p className="text-red-400 font-bold">Lejárt az idő!</p>
              <Button
                onClick={handleEndGame}
                className="mt-3 bg-red-500 hover:bg-red-600 text-white"
              >
                Eredmények
              </Button>
            </div>
          )}
        </main>

        {/* Pontszámok */}
        <div className="px-4 py-3 border-t border-border/30">
          <div className="flex justify-around">
            {players.map(player => (
              <div key={player.id} className="text-center">
                <p className="text-xs text-muted-foreground truncate max-w-[80px]">{player.name}</p>
                <p className="text-lg font-bold text-amber-400">{scores[player.id] || 0}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Eredmények
  if (phase === 'results') {
    const sortedPlayers = [...players].sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0));
    const winner = sortedPlayers[0];
    const loser = sortedPlayers[sortedPlayers.length - 1];
    const sipsDiff = (scores[winner.id] || 0) - (scores[loser.id] || 0);

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground gap-1">
            <ArrowLeft className="w-4 h-4" />
            Menü
          </Button>
          <h1 className="text-lg font-bold text-amber-400">Eredmények</h1>
          <div className="w-16" />
        </header>

        <main className="flex-1 flex flex-col items-center px-4 py-8">
          <div className="w-full max-w-md">
            {/* Győztes */}
            <div className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 text-center">
              <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Győztes</p>
              <h2 className="text-3xl font-bold text-amber-400">{winner.name}</h2>
              <p className="text-amber-400/70 text-lg">{scores[winner.id] || 0} pont</p>
            </div>

            {/* Büntetés */}
            {sipsDiff > 0 && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-center">
                <p className="text-red-400 font-bold">
                  {loser.name} iszik {sipsDiff} kortyot!
                </p>
              </div>
            )}

            {/* Ranglista */}
            <div className="space-y-2 mb-8">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={cn(
                    'p-4 rounded-xl flex justify-between items-center',
                    index === 0 ? 'bg-amber-500/10 border border-amber-500/30' : 'bg-card/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-bold text-muted-foreground">#{index + 1}</span>
                    <span className="font-semibold">{player.name}</span>
                  </div>
                  <span className="text-amber-400 font-bold text-xl">{scores[player.id] || 0}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <Button
                onClick={handleNewGame}
                variant="outline"
                className="flex-1 h-12 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 bg-transparent"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Új játék
              </Button>
              <Button
                onClick={onBack}
                className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 text-black"
              >
                Menü
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return null;
}
