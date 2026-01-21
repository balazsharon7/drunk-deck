'use client';

import { useState, useCallback, useEffect } from 'react';
import { useGame } from '@/lib/game-context';
import { Button } from '@/components/ui/button';
import { ArrowLeft, RotateCcw, Check, X, Play, Pause, Timer, Trophy, Wine } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CharadesProps {
  onBack: () => void;
}

// Magyar szavak/kifejezések kategóriánként
const WORDS: { [category: string]: string[] } = {
  'Állatok': [
    'Elefánt', 'Zsiráf', 'Pingvin', 'Krokodil', 'Flamingó', 'Gorilla', 'Delfin', 'Kaméleon',
    'Páva', 'Koala', 'Kenguru', 'Medúza', 'Kolibri', 'Tigris', 'Oroszlán', 'Zebra',
    'Strucc', 'Papagáj', 'Teknős', 'Polip', 'Cápa', 'Bálna', 'Mókus', 'Sün'
  ],
  'Ételek': [
    'Pizza', 'Hamburger', 'Sushi', 'Lángos', 'Palacsinta', 'Gulyásleves', 'Töltött káposzta',
    'Túrós csusza', 'Somlói galuska', 'Kürtőskalács', 'Rétes', 'Paprikás csirke',
    'Lecsó', 'Halászlé', 'Pogácsa', 'Dobostorta', 'Rakott krumpli', 'Taco', 'Lasagne', 'Tiramisu'
  ],
  'Filmek': [
    'Titanic', 'Avatar', 'Mátrix', 'Star Wars', 'Harry Potter', 'Gyűrűk Ura', 'Ponyvaregény',
    'Terminál', 'Keresztapa', 'Jóbarátok', 'Trónok Harca', 'Breaking Bad', 'Stranger Things',
    'Reszkessetek betörők', 'Üvegtigris', 'Valami Amerika', 'Kontroll', 'Macskafogó'
  ],
  'Hírességek': [
    'Majka', 'Azahriah', 'Puskás Peti', 'Rubint Réka', 'Istenes Bence', 'Tilla',
    'Sebestyén Balázs', 'Liptai Claudia', 'Till Attila', 'Bereczki Zoltán',
    'Szabó Győző', 'Stohl András', 'Cserpes Laura', 'Molnár Áron', 'Kamarás Iván'
  ],
  'Tevékenységek': [
    'Síelés', 'Szörfözés', 'Horgászás', 'Főzés', 'Festés', 'Táncolás', 'Éneklés',
    'Úszás', 'Futás', 'Biciklizés', 'Jógázás', 'Boksz', 'Kertészkedés', 'Varrás',
    'Sakkozás', 'Zongorázás', 'Fotózás', 'Autóvezetés', 'Repülés', 'Búvárkodás'
  ],
  'Tárgyak': [
    'Esernyő', 'Porszívó', 'Mosógép', 'Hűtőszekrény', 'Mikrohullámú sütő', 'Távirányító',
    'Fejhallgató', 'Szemüveg', 'Kulcs', 'Pénztárca', 'Kávéfőző', 'Kenyérpirító',
    'Hajszárító', 'Vasaló', 'Mixer', 'Lámpa', 'Óra', 'Tükör', 'Párna', 'Takaró'
  ]
};

const CATEGORIES = Object.keys(WORDS);

export function Charades({ onBack }: CharadesProps) {
  const { players, language } = useGame();
  const [phase, setPhase] = useState<'setup' | 'playing' | 'results'>('setup');
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [currentCategory, setCurrentCategory] = useState('');
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
  const [scores, setScores] = useState<{ [playerId: string]: { correct: number; wrong: number } }>({});
  const [timeLeft, setTimeLeft] = useState(60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [roundTime, setRoundTime] = useState(60);
  const [showWord, setShowWord] = useState(false);

  // Inicializálás
  useEffect(() => {
    const initialScores: { [playerId: string]: { correct: number; wrong: number } } = {};
    players.forEach(p => {
      initialScores[p.id] = { correct: 0, wrong: 0 };
    });
    setScores(initialScores);
  }, [players]);

  // Időzítő
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

  // Új szó húzása
  const drawNewWord = useCallback(() => {
    const availableCategories = CATEGORIES.filter(cat => 
      WORDS[cat].some(word => !usedWords.has(word))
    );
    
    if (availableCategories.length === 0) {
      setUsedWords(new Set());
      return drawNewWord();
    }
    
    const randomCat = availableCategories[Math.floor(Math.random() * availableCategories.length)];
    const availableWords = WORDS[randomCat].filter(word => !usedWords.has(word));
    const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    
    setCurrentCategory(randomCat);
    setCurrentWord(randomWord);
    setUsedWords(prev => new Set(prev).add(randomWord));
  }, [usedWords]);

  // Játék indítása
  const handleStartRound = () => {
    setPhase('playing');
    setTimeLeft(roundTime);
    setShowWord(false);
    drawNewWord();
  };

  // Telefon homlokhoz
  const handleShowWord = () => {
    setShowWord(true);
    setIsTimerRunning(true);
  };

  // Helyes válasz
  const handleCorrect = () => {
    const currentPlayer = players[currentPlayerIndex];
    setScores(prev => ({
      ...prev,
      [currentPlayer.id]: {
        ...prev[currentPlayer.id],
        correct: prev[currentPlayer.id].correct + 1
      }
    }));
    drawNewWord();
  };

  // Rossz válasz / Passz
  const handleWrong = () => {
    const currentPlayer = players[currentPlayerIndex];
    setScores(prev => ({
      ...prev,
      [currentPlayer.id]: {
        ...prev[currentPlayer.id],
        wrong: prev[currentPlayer.id].wrong + 1
      }
    }));
    drawNewWord();
  };

  // Kör vége
  const handleEndTurn = () => {
    setIsTimerRunning(false);
    setShowWord(false);
    
    if (currentPlayerIndex < players.length - 1) {
      setCurrentPlayerIndex(prev => prev + 1);
      setPhase('setup');
    } else {
      setPhase('results');
    }
  };

  // Új játék
  const handleNewGame = () => {
    setPhase('setup');
    setCurrentPlayerIndex(0);
    setUsedWords(new Set());
    const initialScores: { [playerId: string]: { correct: number; wrong: number } } = {};
    players.forEach(p => {
      initialScores[p.id] = { correct: 0, wrong: 0 };
    });
    setScores(initialScores);
  };

  const currentPlayer = players[currentPlayerIndex];

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
            {language === 'hu' ? 'Homlok Játék' : 'Charades'}
          </h1>
          <div className="w-16" />
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-md text-center">
            {/* Időbeállítás */}
            <div className="mb-8">
              <p className="text-sm text-muted-foreground mb-3">
                {language === 'hu' ? 'Kör időtartama' : 'Round duration'}
              </p>
              <div className="flex gap-2 justify-center">
                {[30, 45, 60, 90].map(time => (
                  <button
                    key={time}
                    onClick={() => setRoundTime(time)}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium transition-all',
                      roundTime === time
                        ? 'bg-amber-500 text-black'
                        : 'bg-card border border-amber-500/20 text-amber-400 hover:bg-amber-500/10'
                    )}
                  >
                    {time}s
                  </button>
                ))}
              </div>
            </div>

            {/* Aktuális játékos */}
            <div className="mb-8 p-6 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30">
              <p className="text-sm text-muted-foreground mb-2">
                {language === 'hu' ? 'Következő játékos' : 'Next player'}
              </p>
              <h2 className="text-3xl font-bold text-amber-400 mb-4">{currentPlayer.name}</h2>
              <p className="text-sm text-amber-100/60">
                {language === 'hu' 
                  ? 'Tartsd a telefont a homlokodhoz, és a többiek leírják neked a megjelenő szót!'
                  : 'Hold the phone to your forehead, others will describe the word!'}
              </p>
            </div>

            <Button
              onClick={handleStartRound}
              className="h-14 px-10 text-lg font-bold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black rounded-full shadow-lg"
            >
              <Play className="w-5 h-5 mr-2" />
              {language === 'hu' ? 'Indítás' : 'Start'}
            </Button>
          </div>
        </main>
      </div>
    );
  }

  // Játék fázis
  if (phase === 'playing') {
    return (
      <div 
        className={cn(
          "min-h-screen flex flex-col transition-colors duration-300",
          showWord ? "bg-gradient-to-br from-amber-900 to-amber-950" : "bg-background"
        )}
      >
        {!showWord ? (
          // Telefon homlokhoz üzenet
          <main className="flex-1 flex flex-col items-center justify-center px-4">
            <div className="text-center">
              <div className="w-32 h-32 rounded-full bg-amber-500/20 border-4 border-amber-500 flex items-center justify-center mx-auto mb-6 animate-pulse">
                <Timer className="w-16 h-16 text-amber-400" />
              </div>
              <h2 className="text-2xl font-bold text-amber-400 mb-4">
                {language === 'hu' ? 'Tartsd a telefont a homlokodhoz!' : 'Hold phone to forehead!'}
              </h2>
              <Button
                onClick={handleShowWord}
                className="h-14 px-10 text-lg font-bold bg-gradient-to-r from-amber-500 to-amber-600 text-black rounded-full"
              >
                {language === 'hu' ? 'Kész vagyok!' : "I'm ready!"}
              </Button>
            </div>
          </main>
        ) : (
          // Szó megjelenítése (180 fokkal elforgatva)
          <main className="flex-1 flex flex-col" style={{ transform: 'rotate(180deg)' }}>
            {/* Időzítő */}
            <div className="text-center py-4">
              <div className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-full text-2xl font-bold",
                timeLeft <= 10 ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
              )}>
                <Timer className="w-6 h-6" />
                {timeLeft}s
              </div>
            </div>

            {/* Kategória és szó */}
            <div className="flex-1 flex flex-col items-center justify-center px-4">
              <p className="text-lg text-amber-400/60 mb-2">{currentCategory}</p>
              <h1 className="text-5xl font-bold text-white text-center mb-8">{currentWord}</h1>
            </div>

            {/* Gombok */}
            <div className="flex gap-4 p-6">
              <button
                onClick={handleWrong}
                className="flex-1 h-24 rounded-2xl bg-red-500/20 border-2 border-red-500 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <X className="w-10 h-10 text-red-400" />
                <span className="text-red-400 font-bold">
                  {language === 'hu' ? 'Passz' : 'Pass'}
                </span>
              </button>
              <button
                onClick={handleCorrect}
                className="flex-1 h-24 rounded-2xl bg-green-500/20 border-2 border-green-500 flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform"
              >
                <Check className="w-10 h-10 text-green-400" />
                <span className="text-green-400 font-bold">
                  {language === 'hu' ? 'Helyes' : 'Correct'}
                </span>
              </button>
            </div>

            {/* Kör vége gomb */}
            {(timeLeft === 0) && (
              <div className="p-6 pt-0">
                <Button
                  onClick={handleEndTurn}
                  className="w-full h-14 text-lg font-bold bg-amber-500 text-black rounded-full"
                >
                  {language === 'hu' ? 'Kör vége' : 'End turn'}
                </Button>
              </div>
            )}
          </main>
        )}
      </div>
    );
  }

  // Eredmények
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <Button variant="ghost" size="sm" onClick={onBack} className="text-muted-foreground gap-1">
          <ArrowLeft className="w-4 h-4" />
          {language === 'hu' ? 'Vissza' : 'Back'}
        </Button>
        <h1 className="text-lg font-bold text-amber-400">
          {language === 'hu' ? 'Eredmények' : 'Results'}
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

          {/* Eredmények listája */}
          <div className="space-y-3 mb-6">
            {players
              .sort((a, b) => (scores[b.id]?.correct || 0) - (scores[a.id]?.correct || 0))
              .map((player, index) => {
                const playerScore = scores[player.id] || { correct: 0, wrong: 0 };
                const sipsToGive = playerScore.correct;
                const sipsToDrink = playerScore.wrong;
                
                return (
                  <div
                    key={player.id}
                    className={cn(
                      'p-4 rounded-xl border',
                      index === 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-card/50 border-border/30'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {index === 0 && <Trophy className="w-5 h-5 text-amber-400" />}
                        <span className="font-bold">{player.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-green-400 font-bold flex items-center gap-1">
                          <Check className="w-4 h-4" />
                          {playerScore.correct}
                        </span>
                        <span className="text-red-400 font-bold flex items-center gap-1">
                          <X className="w-4 h-4" />
                          {playerScore.wrong}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border/20 flex justify-between text-sm">
                      <span className="text-green-400">
                        {language === 'hu' ? `Kioszthat: ${sipsToGive} korty` : `Can give: ${sipsToGive} sips`}
                      </span>
                      <span className="text-red-400">
                        {language === 'hu' ? `Iszik: ${sipsToDrink} korty` : `Drinks: ${sipsToDrink} sips`}
                      </span>
                    </div>
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
