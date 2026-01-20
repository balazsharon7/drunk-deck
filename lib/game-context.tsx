'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { Player, Language, GameType } from './game-types';
import { getRandomNames, getRandomUnusedName } from './funny-names';

interface GameContextType {
  players: Player[];
  language: Language;
  currentGame: GameType | null;
  addPlayer: (name?: string) => void;
  removePlayer: (id: string) => void;
  updatePlayerName: (id: string, name: string) => void;
  setLanguage: (lang: Language) => void;
  setCurrentGame: (game: GameType | null) => void;
  resetPlayers: () => void;
  updatePlayerSips: (playerId: string, sips: number) => void;
  shufflePlayerNames: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

function createInitialPlayers(): Player[] {
  const names = getRandomNames(2);
  return [
    { id: '1', name: names[0], sips: 0, isActive: true },
    { id: '2', name: names[1], sips: 0, isActive: true },
  ];
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [players, setPlayers] = useState<Player[]>(createInitialPlayers);
  const [language, setLanguage] = useState<Language>('hu');
  const [currentGame, setCurrentGame] = useState<GameType | null>(null);

  const addPlayer = useCallback((name?: string) => {
    if (players.length >= 10) return;
    const usedNames = players.map(p => p.name);
    const newName = name || getRandomUnusedName(usedNames);
    const newPlayer: Player = {
      id: Date.now().toString(),
      name: newName,
      sips: 0,
      isActive: true,
    };
    setPlayers((prev) => [...prev, newPlayer]);
  }, [players]);

  const removePlayer = useCallback((id: string) => {
    if (players.length <= 2) return;
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  }, [players.length]);

  const updatePlayerName = useCallback((id: string, name: string) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name } : p))
    );
  }, []);

  const resetPlayers = useCallback(() => {
    setPlayers((prev) => prev.map((p) => ({ ...p, sips: 0 })));
  }, []);

  const updatePlayerSips = useCallback((playerId: string, sips: number) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, sips: p.sips + sips } : p))
    );
  }, []);

  const shufflePlayerNames = useCallback(() => {
    const newNames = getRandomNames(players.length);
    setPlayers((prev) =>
      prev.map((p, i) => ({ ...p, name: newNames[i] }))
    );
  }, [players.length]);

  return (
    <GameContext.Provider
      value={{
        players,
        language,
        currentGame,
        addPlayer,
        removePlayer,
        updatePlayerName,
        setLanguage,
        setCurrentGame,
        resetPlayers,
        updatePlayerSips,
        shufflePlayerNames,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
}
