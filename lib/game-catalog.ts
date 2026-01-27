export type GameCategory = 'drinking' | 'non-drinking';

export const GAME_CATEGORIES: { id: GameCategory | 'all'; label: string; labelEn: string }[] = [
  { id: 'all', label: 'Mind', labelEn: 'All' },
  { id: 'drinking', label: 'Ivós', labelEn: 'Drinking' },
  { id: 'non-drinking', label: 'Nem ivós', labelEn: 'Non-drinking' },
];

export interface GameInfo {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  rules: string;
  rulesEn: string;
  category: GameCategory;
  minPlayers: number;
  maxPlayers: number;
  duration: string;
  difficulty: 1 | 2 | 3;
  rating: number;
  ratingCount: number;
  icon: string;
  isOnlineOnly?: boolean;
  isPremium?: boolean;
  isNew?: boolean;
  isPopular?: boolean;
}

export const GAMES: GameInfo[] = [
  // Ivós játékok
  {
    id: 'kings-cup',
    name: '4 Király',
    nameEn: 'Kings Cup',
    description: 'A klasszikus ivós kártyajáték',
    descriptionEn: 'The classic drinking card game',
    rules: 'Húzz egy kártyát a körből! Minden lapnak megvan a szabálya. Aki a 4. Királyt húzza, megissza a poharat a közepén!',
    rulesEn: 'Draw a card from the circle! Each card has a rule. Whoever draws the 4th King drinks the cup in the middle!',
    category: 'drinking',
    minPlayers: 2,
    maxPlayers: 10,
    duration: '20-40 perc',
    difficulty: 1,
    rating: 4.8,
    ratingCount: 1250,
    icon: '/icons/kings-cup.png',
    isPopular: true,
  },
  {
    id: 'ride-the-bus',
    name: 'Busz',
    nameEn: 'Ride the Bus',
    description: 'Találd ki a kártyákat vagy igyál!',
    descriptionEn: 'Guess the cards or drink!',
    rules: '4 kör kérdés minden játékosnak: piros/fekete, magasabb/alacsonyabb, között/kívül, van-e ilyen szín. A végén a legtöbb lappal rendelkező buszozik!',
    rulesEn: '4 rounds of questions: red/black, higher/lower, inside/outside, suit guess. Most cards at the end rides the bus!',
    category: 'drinking',
    minPlayers: 2,
    maxPlayers: 8,
    duration: '15-30 perc',
    difficulty: 2,
    rating: 4.6,
    ratingCount: 890,
    icon: '/icons/ride-the-bus.png',
    isPopular: true,
  },
  {
    id: 'blackjack',
    name: 'Blackjack',
    nameEn: 'Blackjack',
    description: 'Huszonegy ivós verzió',
    descriptionEn: 'Twenty-one drinking edition',
    rules: 'Közelíts 21-hez anélkül, hogy túllépnéd! Ha vesztesz, iszol annyi kortyot amennyi a tét volt. Ha nyersz, te osztod ki!',
    rulesEn: 'Get close to 21 without going over! Losers drink the bet amount, winners give out sips!',
    category: 'drinking',
    minPlayers: 2,
    maxPlayers: 6,
    duration: '20-45 perc',
    difficulty: 2,
    rating: 4.5,
    ratingCount: 720,
    icon: '/icons/blackjack.png',
  },
  // Nem ivós (party) játékok
  {
    id: 'charades',
    name: 'Homlok Játék',
    nameEn: 'Charades',
    description: 'Találd ki mit mutatnak a többiek!',
    descriptionEn: 'Guess what others are showing!',
    rules: 'Tartsd a telefont a homlokodhoz! A többiek leírják a megjelenő szót, te pedig kitalálod. Helyes válaszért kortyot osztasz, rosszért iszol!',
    rulesEn: 'Hold the phone to your forehead! Others describe the word, you guess. Correct = give sips, wrong = drink!',
    category: 'non-drinking',
    minPlayers: 2,
    maxPlayers: 10,
    duration: '15-30 perc',
    difficulty: 1,
    rating: 4.7,
    ratingCount: 1100,
    icon: '/icons/charades.jpg',
    isNew: true,
  },
  {
    id: 'taboo',
    name: 'Barlangnyelv',
    nameEn: 'Cave Language',
    description: 'Írd körül csak egyszótagú szavakkal!',
    descriptionEn: 'Describe using only one-syllable words!',
    rules: 'Válassz egy szót a kártyáról és írd körül CSAK egyszótagú szavakkal! Tilos: a szó kimondása, mutogatás, hangutánzó szavak, betűzés.',
    rulesEn: 'Pick a word from the card and describe it using ONLY one-syllable words! Forbidden: saying the word, gesturing, onomatopoeia, spelling.',
    category: 'non-drinking',
    minPlayers: 4,
    maxPlayers: 10,
    duration: '20-40 perc',
    difficulty: 2,
    rating: 4.9,
    ratingCount: 980,
    icon: '/icons/barlangnyelv.png',
    isPopular: true,
  },
  {
    id: 'rating-game',
    name: 'Rangsorolós',
    nameEn: 'Rating Game',
    description: 'Találd ki a sorrendet!',
    descriptionEn: 'Guess the correct order!',
    rules: 'Egy játékos kap leírást (pl. "kellemes feneket törölni vele"). A többiek számot kapnak 1-10 és mondanak dolgokat. A tippelő kitalálja a sorrendet!',
    rulesEn: 'One player gets a description. Others get numbers 1-10 and name things. Guesser figures out the order!',
    category: 'non-drinking',
    minPlayers: 4,
    maxPlayers: 10,
    duration: '20-30 perc',
    difficulty: 1,
    rating: 4.4,
    ratingCount: 650,
    icon: '/icons/rating-game.jpg',
    isOnlineOnly: true,
    isNew: true,
  },
];

export function getGamesByCategory(category: GameCategory): GameInfo[] {
  return GAMES.filter(game => game.category === category);
}

export function getDrinkingGames(): GameInfo[] {
  return GAMES.filter(game => game.category === 'drinking');
}

export function getNonDrinkingGames(): GameInfo[] {
  return GAMES.filter(game => game.category === 'non-drinking');
}

export function getPopularGames(): GameInfo[] {
  return GAMES.filter(game => game.isPopular);
}

export function getNewGames(): GameInfo[] {
  return GAMES.filter(game => game.isNew);
}

export function searchGames(query: string): GameInfo[] {
  const q = query.toLowerCase();
  return GAMES.filter(game => 
    game.name.toLowerCase().includes(q) ||
    game.nameEn.toLowerCase().includes(q) ||
    game.description.toLowerCase().includes(q)
  );
}

export function getGameById(id: string): GameInfo | undefined {
  return GAMES.find(game => game.id === id);
}

// Alias for backwards compatibility
export type GameData = GameInfo;
