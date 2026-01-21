'use client';

import { useState, useCallback, useEffect } from 'react';
import { useGame } from '@/lib/game-context';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCcw, Check, X, Play, Trophy, HelpCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RatingGameProps {
  onBack: () => void;
}

// Leírások amiket rangsorolni kell
const DESCRIPTIONS = [
  { hu: 'Kellemes a feneket törölni vele', en: 'Nice to wipe your butt with' },
  { hu: 'Jó lenne egy lakatlan szigeten', en: 'Good to have on a deserted island' },
  { hu: 'Szívesen ennék belőle reggelire', en: 'Would eat for breakfast' },
  { hu: 'Jó ajándék a nagymamának', en: 'Good gift for grandma' },
  { hu: 'Elvinném az első randira', en: 'Would bring on a first date' },
  { hu: 'Használnám fegyverként zombi apokalipszisben', en: 'Would use as weapon in zombie apocalypse' },
  { hu: 'Jó társaság egy hosszú repülőúton', en: 'Good company on a long flight' },
  { hu: 'Szívesen cserélnék vele életet 1 napra', en: 'Would swap lives for a day' },
  { hu: 'Rábíznám a titkomat', en: 'Would trust with my secret' },
  { hu: 'Szívesen lennék a szomszédja', en: 'Would like to be their neighbor' },
  { hu: 'Jó lenne ha vezette volna a történelem órámat', en: 'Would be good teaching my history class' },
  { hu: 'Elvinném egy hétvégi kirándulásra', en: 'Would take on a weekend trip' },
  { hu: 'Szívesen hallanám a véleményét az életről', en: 'Would listen to their life advice' },
  { hu: 'Jó lenne együtt főzni vele', en: 'Would be fun to cook with' },
  { hu: 'Beengedném a házamba', en: 'Would let into my house' },
  { hu: 'Szívesen karaokéznék vele', en: 'Would karaoke with' },
  { hu: 'Megosztanám vele az utolsó pizzaszeletet', en: 'Would share last pizza slice with' },
  { hu: 'Jó lenne ha ő lenne a főnököm', en: 'Would be good as my boss' },
  { hu: 'Megkérném hogy legyen a tanúm az esküvőmön', en: 'Would ask to be witness at my wedding' },
  { hu: 'Elvinném a szüleimhez vacsorázni', en: 'Would bring to dinner with parents' },
];

export function RatingGame({ onBack }: RatingGameProps) {
  const { players, language } = useGame();
  const [phase, setPhase] = useState<'setup' | 'assign' | 'answer' | 'guess' | 'reveal' | 'results'>('setup');
  const [currentRound, setCurrentRound] = useState(1);
  const [totalRounds, setTotalRounds] = useState(3);
  const [currentDescription, setCurrentDescription] = useState<typeof DESCRIPTIONS[0] | null>(null);
  const [usedDescriptions, setUsedDescriptions] = useState<Set<number>>(new Set());
  const [assignments, setAssignments] = useState<{ [playerId: string]: number | 'guesser' }>({});
  const [answers, setAnswers] = useState<{ [playerId: string]: string }>({});
  const [currentAnswerIndex, setCurrentAnswerIndex] = useState(0);
  const [guess, setGuess] = useState<string[]>([]);
  const [scores, setScores] = useState<{ [playerId: string]: number }>({});
  const [revealedAnswers, setRevealedAnswers] = useState<{ number: number; answer: string; playerId: string }[]>([]);
  const [showingPlayer, setShowingPlayer] = useState<string | null>(null);

  // Min 3 játékos kell
  const minPlayers = 3;
  const hasEnoughPlayers = players.length >= minPlayers;

  // Inicializálás
  useEffect(() => {
    const initialScores: { [playerId: string]: number } = {};
    players.forEach(p => {
      initialScores[p.id] = 0;
    });
    setScores(initialScores);
  }, [players]);

  // Új kör indítása
  const startNewRound = useCallback(() => {
    // Válasszunk egy leírást
    const availableDescriptions = DESCRIPTIONS
      .map((d, i) => ({ desc: d, index: i }))
      .filter(d => !usedDescriptions.has(d.index));
    
    if (availableDescriptions.length === 0) {
      setUsedDescriptions(new Set());
      return startNewRound();
    }
    
    const randomDesc = availableDescriptions[Math.floor(Math.random() * availableDescriptions.length)];
    setCurrentDescription(randomDesc.desc);
    setUsedDescriptions(prev => new Set(prev).add(randomDesc.index));
    
    // Osszuk ki a számokat (1 guesser, többi 1-10 közötti szám)
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    const newAssignments: { [playerId: string]: number | 'guesser' } = {};
    
    // Az első lesz a tippelő
    newAssignments[shuffledPlayers[0].id] = 'guesser';
    
    // A többiek kapnak számot 1-10 között
    const numbers = Array.from({ length: players.length - 1 }, (_, i) => i + 1);
    numbers.sort(() => Math.random() - 0.5);
    
    for (let i = 1; i < shuffledPlayers.length; i++) {
      newAssignments[shuffledPlayers[i].id] = numbers[i - 1];
    }
    
    setAssignments(newAssignments);
    setAnswers({});
    setGuess([]);
    setRevealedAnswers([]);
    setCurrentAnswerIndex(0);
    setShowingPlayer(null);
    setPhase('assign');
  }, [players, usedDescriptions]);

  // Válasz beírása
  const handleAnswer = (playerId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [playerId]: answer }));
  };

  // Következő játékos válaszol
  const handleNextAnswer = () => {
    const answeringPlayers = players.filter(p => assignments[p.id] !== 'guesser');
    
    if (currentAnswerIndex < answeringPlayers.length - 1) {
      setCurrentAnswerIndex(prev => prev + 1);
    } else {
      // Minden válasz megvan, tippelés jön
      setPhase('guess');
    }
  };

  // Tipp hozzáadása
  const handleGuessAdd = (playerId: string) => {
    if (guess.includes(playerId)) {
      setGuess(prev => prev.filter(id => id !== playerId));
    } else {
      setGuess(prev => [...prev, playerId]);
    }
  };

  // Eredmény kiszámítása
  const handleReveal = () => {
    // Készítsük el a helyes sorrendet
    const correctOrder = players
      .filter(p => assignments[p.id] !== 'guesser')
      .sort((a, b) => (assignments[a.id] as number) - (assignments[b.id] as number));
    
    const revealed = correctOrder.map(p => ({
      number: assignments[p.id] as number,
      answer: answers[p.id] || '-',
      playerId: p.id
    }));
    
    setRevealedAnswers(revealed);
    
    // Pontszámítás
    let correctGuesses = 0;
    guess.forEach((playerId, guessIndex) => {
      const correctIndex = correctOrder.findIndex(p => p.id === playerId);
      if (correctIndex === guessIndex) {
        correctGuesses++;
      }
    });
    
    const guesserIdEntry = Object.entries(assignments).find(([_, v]) => v === 'guesser');
    if (guesserIdEntry) {
      const guesserId = guesserIdEntry[0];
      setScores(prev => ({
        ...prev,
        [guesserId]: (prev[guesserId] || 0) + correctGuesses
      }));
    }
    
    setPhase('reveal');
  };

  // Következő kör vagy vége
  const handleNextRound = () => {
    if (currentRound < totalRounds) {
      setCurrentRound(prev => prev + 1);
      startNewRound();
    } else {
      setPhase('results');
    }
  };

  // Új játék
  const handleNewGame = () => {
    setPhase('setup');
    setCurrentRound(1);
    setUsedDescriptions(new Set());
    const initialScores: { [playerId: string]: number } = {};
    players.forEach(p => {
      initialScores[p.id] = 0;
    });
    setScores(initialScores);
  };

  const guesser = players.find(p => assignments[p.id] === 'guesser');
  const answeringPlayers = players.filter(p => assignments[p.id] !== 'guesser');
  const currentAnsweringPlayer = answeringPlayers[currentAnswerIndex];

  // Setup fázis
  if (phase === 'setup') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground gap-1">
            <ArrowLeft className="w-4 h-4" />
            {language === 'hu' ? 'Vissza' : 'Back'}
          </Button>
          <h1 className="text-lg font-bold text-amber-400">
            {language === 'hu' ? 'Rangsorolós' : 'Rating Game'}
          </h1>
          <div className="w-16" />
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-md text-center">
            {!hasEnoughPlayers ? (
              <div className="mb-8 p-6 rounded-2xl bg-red-500/10 border border-red-500/30">
                <Users className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-red-400 mb-2">
                  {language === 'hu' ? 'Nincs elég játékos!' : 'Not enough players!'}
                </h3>
                <p className="text-sm text-red-300/70">
                  {language === 'hu' 
                    ? `Minimum ${minPlayers} játékos kell ehhez a játékhoz.`
                    : `Minimum ${minPlayers} players needed for this game.`}
                </p>
              </div>
            ) : (
              <>
                {/* Szabályok */}
                <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <h3 className="font-bold text-amber-400 mb-2">
                    {language === 'hu' ? 'Szabályok' : 'Rules'}
                  </h3>
                  <p className="text-sm text-amber-100/70">
                    {language === 'hu' 
                      ? 'Egy játékos kap egy leírást. A többiek számot kapnak (1-10, ahol 1 a legrosszabb). Mindanki mond egy dolgot a számának megfelelően. A tippelőnek ki kell találnia a sorrendet!'
                      : 'One player gets a description. Others get numbers (1-10, where 1 is worst). Everyone says something according to their number. The guesser must figure out the order!'}
                  </p>
                </div>

                {/* Körök beállítása */}
                <div className="mb-8">
                  <p className="text-sm text-muted-foreground mb-3">
                    {language === 'hu' ? 'Körök száma' : 'Number of rounds'}
                  </p>
                  <div className="flex gap-2 justify-center">
                    {[3, 5, 7, 10].map(rounds => (
                      <button
                        key={rounds}
                        onClick={() => setTotalRounds(rounds)}
                        className={cn(
                          'px-4 py-2 rounded-full text-sm font-medium transition-all',
                          totalRounds === rounds
                            ? 'bg-amber-500 text-black'
                            : 'bg-card border border-amber-500/20 text-amber-400 hover:bg-amber-500/10'
                        )}
                      >
                        {rounds}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={startNewRound}
                  className="h-14 px-10 text-lg font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black rounded-full shadow-lg"
                >
                  <Play className="w-5 h-5 mr-2" />
                  {language === 'hu' ? 'Indítás' : 'Start'}
                </Button>
              </>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Assign fázis - megmutatjuk kinek mi a száma
  if (phase === 'assign') {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <div className="text-sm text-muted-foreground">
            {currentRound}/{totalRounds}
          </div>
          <h1 className="text-lg font-bold text-amber-400">
            {language === 'hu' ? 'Számok kiosztása' : 'Assigning Numbers'}
          </h1>
          <div className="w-16" />
        </header>

        <main className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="max-w-md mx-auto">
            {/* Leírás */}
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <p className="text-sm text-muted-foreground mb-1">
                {language === 'hu' ? 'A leírás' : 'The description'}
              </p>
              <p className="text-lg font-bold text-amber-400">
                {language === 'hu' ? currentDescription?.hu : currentDescription?.en}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {language === 'hu' ? '(1 = legrosszabb, 10 = legjobb)' : '(1 = worst, 10 = best)'}
              </p>
            </div>

            {/* Játékosok és számok */}
            <div className="space-y-3 mb-6">
              {players.map(player => {
                const assignment = assignments[player.id];
                const isGuesser = assignment === 'guesser';
                const isShowing = showingPlayer === player.id;
                
                return (
                  <button
                    key={player.id}
                    onClick={() => setShowingPlayer(isShowing ? null : player.id)}
                    className={cn(
                      'w-full p-4 rounded-xl border transition-all text-left',
                      isGuesser
                        ? 'bg-purple-500/10 border-purple-500/30'
                        : 'bg-card/50 border-border/30 hover:border-amber-500/30'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{player.name}</span>
                      {isGuesser ? (
                        <span className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-400 text-sm font-bold flex items-center gap-1">
                          <HelpCircle className="w-4 h-4" />
                          {language === 'hu' ? 'Tippelő' : 'Guesser'}
                        </span>
                      ) : (
                        <span className={cn(
                          "px-3 py-1 rounded-full text-sm font-bold transition-all",
                          isShowing 
                            ? "bg-amber-500 text-black" 
                            : "bg-amber-500/20 text-amber-400"
                        )}>
                          {isShowing ? assignment : '?'}
                        </span>
                      )}
                    </div>
                    {!isGuesser && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {language === 'hu' ? 'Koppints a szám megjelenítéséhez' : 'Tap to reveal number'}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>

            <Button
              onClick={() => setPhase('answer')}
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold rounded-full"
            >
              {language === 'hu' ? 'Válaszok megadása' : 'Give answers'}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Answer fázis - mindenki megadja a válaszát
  if (phase === 'answer' && currentAnsweringPlayer) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <div className="text-sm text-muted-foreground">
            {currentAnswerIndex + 1}/{answeringPlayers.length}
          </div>
          <h1 className="text-lg font-bold text-amber-400">
            {language === 'hu' ? 'Válaszok' : 'Answers'}
          </h1>
          <div className="w-16" />
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-6">
          <div className="w-full max-w-md">
            {/* Leírás */}
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <p className="text-sm font-medium text-amber-400">
                "{language === 'hu' ? currentDescription?.hu : currentDescription?.en}"
              </p>
            </div>

            {/* Aktuális játékos */}
            <div className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-card to-card/50 border border-amber-500/30 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {language === 'hu' ? 'Most válaszol' : 'Now answering'}
              </p>
              <h2 className="text-2xl font-bold text-white mb-2">{currentAnsweringPlayer.name}</h2>
              <div className="inline-flex px-4 py-2 rounded-full bg-amber-500/20 text-amber-400 font-bold">
                {language === 'hu' ? 'Szám' : 'Number'}: {assignments[currentAnsweringPlayer.id]}
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {language === 'hu' 
                  ? 'Mondj valamit a számotnak megfelelően! (1 = legrosszabb, 10 = legjobb)'
                  : 'Say something according to your number! (1 = worst, 10 = best)'}
              </p>
            </div>

            {/* Válasz bevitel */}
            <div className="mb-6">
              <input
                type="text"
                value={answers[currentAnsweringPlayer.id] || ''}
                onChange={(e) => handleAnswer(currentAnsweringPlayer.id, e.target.value)}
                placeholder={language === 'hu' ? 'Írd be a válaszod...' : 'Enter your answer...'}
                className="w-full px-4 py-3 rounded-xl bg-card border border-amber-500/20 text-white placeholder:text-muted-foreground focus:border-amber-500/50 focus:outline-none"
              />
            </div>

            <Button
              onClick={handleNextAnswer}
              disabled={!answers[currentAnsweringPlayer.id]}
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold rounded-full disabled:opacity-50"
            >
              {currentAnswerIndex < answeringPlayers.length - 1
                ? (language === 'hu' ? 'Következő' : 'Next')
                : (language === 'hu' ? 'Tippelés' : 'Guess')}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Guess fázis - tippelő kitalálja a sorrendet
  if (phase === 'guess' && guesser) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <div className="text-sm text-muted-foreground">
            {currentRound}/{totalRounds}
          </div>
          <h1 className="text-lg font-bold text-amber-400">
            {guesser.name} {language === 'hu' ? 'tippel' : 'guesses'}
          </h1>
          <div className="w-16" />
        </header>

        <main className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="max-w-md mx-auto">
            {/* Leírás */}
            <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <p className="text-sm font-medium text-amber-400">
                "{language === 'hu' ? currentDescription?.hu : currentDescription?.en}"
              </p>
            </div>

            {/* Válaszok (random sorrendben) */}
            <div className="mb-4">
              <p className="text-sm text-muted-foreground mb-2 text-center">
                {language === 'hu' ? 'A válaszok:' : 'The answers:'}
              </p>
              <div className="space-y-2">
                {[...answeringPlayers].sort(() => Math.random() - 0.5).map(player => (
                  <div key={player.id} className="p-3 rounded-xl bg-card/50 border border-border/30">
                    <span className="font-bold text-amber-400">{player.name}:</span>{' '}
                    <span className="text-white">{answers[player.id]}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tippelés - húzd sorrendbe */}
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-2 text-center">
                {language === 'hu' ? 'Rakd sorrendbe (1-től 10-ig):' : 'Put in order (1 to 10):'}
              </p>
              <div className="space-y-2">
                {answeringPlayers.map(player => {
                  const guessIndex = guess.indexOf(player.id);
                  const isSelected = guessIndex !== -1;
                  
                  return (
                    <button
                      key={player.id}
                      onClick={() => handleGuessAdd(player.id)}
                      className={cn(
                        'w-full p-3 rounded-xl border transition-all flex items-center justify-between',
                        isSelected
                          ? 'bg-amber-500/20 border-amber-500'
                          : 'bg-card/50 border-border/30 hover:border-amber-500/30'
                      )}
                    >
                      <span className="font-bold">{player.name}</span>
                      {isSelected && (
                        <span className="w-8 h-8 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center">
                          {guessIndex + 1}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <Button
              onClick={handleReveal}
              disabled={guess.length !== answeringPlayers.length}
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold rounded-full disabled:opacity-50"
            >
              {language === 'hu' ? 'Eredmény' : 'Reveal'}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Reveal fázis
  if (phase === 'reveal') {
    let correctCount = 0;
    guess.forEach((playerId, i) => {
      const correctPlayer = revealedAnswers[i];
      if (correctPlayer && correctPlayer.playerId === playerId) {
        correctCount++;
      }
    });
    
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-between px-4 py-3 border-b border-border/30">
          <div className="text-sm text-muted-foreground">
            {currentRound}/{totalRounds}
          </div>
          <h1 className="text-lg font-bold text-amber-400">
            {language === 'hu' ? 'Eredmény' : 'Result'}
          </h1>
          <div className="w-16" />
        </header>

        <main className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="max-w-md mx-auto">
            {/* Helyes sorrend */}
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-3 text-center">
                {language === 'hu' ? 'Helyes sorrend:' : 'Correct order:'}
              </p>
              <div className="space-y-2">
                {revealedAnswers.map((item, index) => {
                  const guessedPlayerId = guess[index];
                  const isCorrect = guessedPlayerId === item.playerId;
                  const player = players.find(p => p.id === item.playerId);
                  
                  return (
                    <div
                      key={item.playerId}
                      className={cn(
                        'p-3 rounded-xl border flex items-center gap-3',
                        isCorrect ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'
                      )}
                    >
                      <span className="w-8 h-8 rounded-full bg-amber-500 text-black font-bold flex items-center justify-center flex-shrink-0">
                        {item.number}
                      </span>
                      <div className="flex-1">
                        <p className="font-bold">{player?.name}</p>
                        <p className="text-sm text-muted-foreground">{item.answer}</p>
                      </div>
                      {isCorrect ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <X className="w-5 h-5 text-red-400" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Pontszám */}
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center">
              <p className="text-sm text-muted-foreground mb-1">
                {guesser?.name} {language === 'hu' ? 'pontja' : 'scored'}
              </p>
              <p className="text-3xl font-bold text-amber-400">
                {correctCount}/{answeringPlayers.length}
              </p>
              {correctCount < answeringPlayers.length && (
                <p className="text-red-400 text-sm mt-2">
                  {language === 'hu' 
                    ? `Igyál ${answeringPlayers.length - correctCount} kortyot!`
                    : `Drink ${answeringPlayers.length - correctCount} sips!`}
                </p>
              )}
            </div>

            <Button
              onClick={handleNextRound}
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold rounded-full"
            >
              {currentRound < totalRounds
                ? (language === 'hu' ? 'Következő kör' : 'Next round')
                : (language === 'hu' ? 'Eredmények' : 'Results')}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Results fázis
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground gap-1">
          <ArrowLeft className="w-4 h-4" />
          {language === 'hu' ? 'Vissza' : 'Back'}
        </Button>
        <h1 className="text-lg font-bold text-amber-400">
          {language === 'hu' ? 'Végeredmény' : 'Final Results'}
        </h1>
        <div className="w-16" />
      </header>

      <main className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-2" />
            <h2 className="text-2xl font-bold text-amber-400">
              {language === 'hu' ? 'Játék vége!' : 'Game Over!'}
            </h2>
          </div>

          {/* Eredmények */}
          <div className="space-y-3 mb-6">
            {players
              .sort((a, b) => (scores[b.id] || 0) - (scores[a.id] || 0))
              .map((player, index) => {
                const playerScore = scores[player.id] || 0;
                const maxScore = Math.max(...Object.values(scores));
                const isWinner = playerScore === maxScore;
                
                return (
                  <div
                    key={player.id}
                    className={cn(
                      'p-4 rounded-xl border flex items-center justify-between',
                      isWinner ? 'bg-amber-500/10 border-amber-500/30' : 'bg-card/50 border-border/30'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      {isWinner && <Trophy className="w-5 h-5 text-amber-400" />}
                      <span className="font-bold">{player.name}</span>
                    </div>
                    <span className="text-xl font-bold text-amber-400">
                      {playerScore} {language === 'hu' ? 'pont' : 'pts'}
                    </span>
                  </div>
                );
              })}
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleNewGame}
              className="flex-1 h-12 bg-gradient-to-r from-amber-500 to-amber-600 text-black font-bold rounded-full"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              {language === 'hu' ? 'Új játék' : 'New game'}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
