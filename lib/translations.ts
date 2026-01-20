import type { Language } from './game-types';

export const translations = {
  // Common
  appName: { hu: 'Drunk Deck', en: 'Drunk Deck' },
  startGame: { hu: 'Játék indítása', en: 'Start Game' },
  nextPlayer: { hu: 'Következő játékos', en: 'Next Player' },
  drawCard: { hu: 'Kártya húzás', en: 'Draw Card' },
  players: { hu: 'Játékosok', en: 'Players' },
  addPlayer: { hu: 'Játékos hozzáadása', en: 'Add Player' },
  removePlayer: { hu: 'Eltávolítás', en: 'Remove' },
  back: { hu: 'Vissza', en: 'Back' },
  sips: { hu: 'korty', en: 'sips' },
  drink: { hu: 'Igyál!', en: 'Drink!' },
  give: { hu: 'Adj ki', en: 'Give out' },
  take: { hu: 'Igyál', en: 'Take' },
  correct: { hu: 'Helyes!', en: 'Correct!' },
  wrong: { hu: 'Hibás!', en: 'Wrong!' },
  gameOver: { hu: 'Játék vége', en: 'Game Over' },
  newGame: { hu: 'Új játék', en: 'New Game' },
  rules: { hu: 'Szabályok', en: 'Rules' },
  settings: { hu: 'Beállítások', en: 'Settings' },
  language: { hu: 'Nyelv', en: 'Language' },
  
  // Home
  selectGame: { hu: 'Válassz játékot', en: 'Select a game' },
  quickPlay: { hu: 'Gyors játék', en: 'Quick Play' },
  
  // Games
  kingsCup: { hu: '4 Király', en: 'Kings Cup' },
  kingsCupDesc: { hu: 'A klasszikus ivós kártyajáték', en: 'The classic drinking card game' },
  rideTheBus: { hu: 'Busz', en: 'Ride the Bus' },
  rideTheBusDesc: { hu: 'Találd ki a kártyákat vagy igyál!', en: 'Guess the cards or drink!' },
  blackjack: { hu: 'Blackjack', en: 'Blackjack' },
  blackjackDesc: { hu: 'Huszonegy ivós verzió', en: 'Twenty-one drinking edition' },
  
  // Game Rules
  kingsCupRules: { 
    hu: 'Húzz egy kártyát a körből! Minden lapnak megvan a szabálya - a 4. Király megissza a poharat!', 
    en: 'Draw a card from the circle! Each card has a rule - the 4th King drinks the cup!' 
  },
  rideTheBusRules: { 
    hu: '4 kör kérdés: piros/fekete, magasabb/alacsonyabb, között/kívül, van-e szín. A végén a legtöbb lappal buszozol!', 
    en: '4 rounds: red/black, higher/lower, inside/outside, suit guess. Most cards at end rides the bus!' 
  },
  blackjackRules: { 
    hu: 'Közelíts 21-hez anélkül, hogy túllépnéd! Vesztesként iszol, győztesként osztod ki a kortyokat.', 
    en: 'Get close to 21 without going over! Losers drink, winners give out sips.' 
  },
  
  // Kings Cup specific
  waterfall: { hu: 'Vízesés', en: 'Waterfall' },
  waterfallDesc: { hu: 'Mindenki iszik, amíg az előtte lévő abba nem hagyja', en: 'Everyone drinks until the person before them stops' },
  you: { hu: 'Te', en: 'You' },
  youDesc: { hu: 'Válassz valakit, aki iszik 2 kortyot', en: 'Pick someone to drink 2 sips' },
  me: { hu: 'Én', en: 'Me' },
  meDesc: { hu: 'Te iszol 3 kortyot', en: 'You drink 3 sips' },
  floor: { hu: 'Padló', en: 'Floor' },
  floorDesc: { hu: 'Mindenki érjen a padlóhoz, az utolsó iszik', en: 'Everyone touch the floor, last one drinks' },
  guys: { hu: 'Fiúk', en: 'Guys' },
  guysDesc: { hu: 'Minden fiú iszik 2 kortyot', en: 'All guys drink 2 sips' },
  chicks: { hu: 'Lányok', en: 'Chicks' },
  chicksDesc: { hu: 'Minden lány iszik 2 kortyot', en: 'All girls drink 2 sips' },
  heaven: { hu: 'Ég', en: 'Heaven' },
  heavenDesc: { hu: 'Mindenki nyújtsa fel a kezét, az utolsó iszik', en: 'Everyone raise hands, last one drinks' },
  mate: { hu: 'Haver', en: 'Mate' },
  mateDesc: { hu: 'Válassz egy ivótársat - mindig együtt isztok', en: 'Pick a drinking buddy - you always drink together' },
  rhyme: { hu: 'Rím', en: 'Rhyme' },
  rhymeDesc: { hu: 'Mondj egy szót, körben rímeljetek rá', en: 'Say a word, everyone must rhyme' },
  categories: { hu: 'Kategória', en: 'Categories' },
  categoriesDesc: { hu: 'Válassz egy kategóriát, soroljatok fel elemeket', en: 'Pick a category, name items in it' },
  rulemaker: { hu: 'Szabály', en: 'Rule Maker' },
  rulemakerDesc: { hu: 'Csinálj egy új szabályt', en: 'Make a new rule' },
  questionMaster: { hu: 'Kérdés mester', en: 'Question Master' },
  questionMasterDesc: { hu: 'Aki válaszol a kérdéseidre, az iszik', en: 'Anyone who answers your questions drinks' },
  king: { hu: 'Király', en: 'King' },
  kingDesc: { hu: 'Tölts a közös pohárba. A 4. király megissza!', en: 'Pour into the Kings Cup. 4th King drinks it!' },
  
  // Ride the Bus
  redOrBlack: { hu: 'Piros vagy fekete?', en: 'Red or Black?' },
  red: { hu: 'Piros', en: 'Red' },
  black: { hu: 'Fekete', en: 'Black' },
  higherOrLower: { hu: 'Magasabb vagy alacsonyabb?', en: 'Higher or Lower?' },
  higher: { hu: 'Magasabb', en: 'Higher' },
  lower: { hu: 'Alacsonyabb', en: 'Lower' },
  insideOrOutside: { hu: 'Között vagy kívül?', en: 'Inside or Outside?' },
  inside: { hu: 'Között', en: 'Inside' },
  outside: { hu: 'Kívül', en: 'Outside' },
  guessSuit: { hu: 'Van-e ilyen szín?', en: 'Same Suit?' },
  rideBus: { hu: 'Buszozol!', en: 'Ride the Bus!' },
  busRideExplain: { hu: 'Menj végig a piramison helyesen!', en: 'Complete the pyramid correctly!' },
  
  // Blackjack
  hit: { hu: 'Kérek', en: 'Hit' },
  stand: { hu: 'Megállok', en: 'Stand' },
  bust: { hu: 'Betelt!', en: 'Bust!' },
  dealerWins: { hu: 'Az osztó nyer', en: 'Dealer Wins' },
  playerWins: { hu: 'A játékos nyer', en: 'Player Wins' },
  push: { hu: 'Döntetlen', en: 'Push' },
  dealerDrinks: { hu: 'Mindenki osztja ki a kortyokat!', en: 'Everyone gives out sips!' },
  playerDrinks: { hu: 'Igyál', en: 'Drink' },
};

export function t(key: keyof typeof translations, lang: Language): string {
  return translations[key]?.[lang] || key;
}
