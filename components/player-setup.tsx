'use client';

import React, { useState } from 'react';
import { useGame } from '@/lib/game-context';
import { t } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { X, Plus, Users, Shuffle, Pencil, Check } from 'lucide-react';
import { getRandomUnusedName, FUNNY_NAMES } from '@/lib/funny-names';

interface PlayerSetupProps {
  onStartGame: () => void;
  className?: string;
}

const PLAYER_COLORS = [
  'from-amber-600 to-amber-700',
  'from-amber-500 to-orange-600',
  'from-yellow-600 to-amber-600',
  'from-orange-500 to-amber-600',
  'from-amber-700 to-yellow-700',
  'from-yellow-500 to-amber-500',
  'from-orange-600 to-red-600',
  'from-amber-600 to-yellow-600',
  'from-yellow-700 to-orange-600',
  'from-orange-700 to-amber-700',
];

export function PlayerSetup({ onStartGame, className }: PlayerSetupProps) {
  const { players, language, addPlayer, removePlayer, updatePlayerName, shufflePlayerNames } = useGame();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [showNamePicker, setShowNamePicker] = useState<string | null>(null);

  const handleAddPlayer = () => {
    addPlayer();
  };

  const startEditing = (playerId: string, currentName: string) => {
    setEditingId(playerId);
    setEditValue(currentName);
    setShowNamePicker(null);
  };

  const finishEditing = () => {
    if (editingId && editValue.trim()) {
      updatePlayerName(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      finishEditing();
    }
    if (e.key === 'Escape') {
      setEditingId(null);
      setEditValue('');
    }
  };

  const selectFunnyName = (playerId: string, name: string) => {
    updatePlayerName(playerId, name);
    setShowNamePicker(null);
  };

  const getRandomNewName = (playerId: string) => {
    const usedNames = players.filter(p => p.id !== playerId).map(p => p.name);
    const newName = getRandomUnusedName(usedNames);
    updatePlayerName(playerId, newName);
  };

  // Filter available names (not already used)
  const getAvailableNames = (currentPlayerId: string) => {
    const usedNames = players.filter(p => p.id !== currentPlayerId).map(p => p.name);
    return FUNNY_NAMES.filter(name => !usedNames.includes(name)).slice(0, 20);
  };

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">{t('players', language)}</h2>
            <p className="text-xs text-muted-foreground">{players.length}/10 {language === 'hu' ? 'jatekos' : 'players'}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={shufflePlayerNames}
          className="gap-2 border-primary/30 hover:bg-primary/10 bg-transparent"
        >
          <Shuffle className="w-4 h-4" />
          <span className="hidden sm:inline">{language === 'hu' ? 'Keverés' : 'Shuffle'}</span>
        </Button>
      </div>

      {/* Player list */}
      <div className="flex flex-col gap-2">
        {players.map((player, index) => (
          <div key={player.id} className="relative">
            <div
              className={cn(
                'flex items-center gap-2 p-2 rounded-xl',
                'bg-gradient-to-r',
                PLAYER_COLORS[index % PLAYER_COLORS.length],
                'shadow-lg',
                'transition-all duration-200'
              )}
            >
              {/* Player number badge */}
              <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur flex items-center justify-center font-bold text-white text-sm shrink-0">
                {index + 1}
              </div>

              {/* Name area */}
              {editingId === player.id ? (
                <div className="flex-1 flex gap-2">
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyPress}
                    className="flex-1 h-8 bg-white/20 border-white/30 text-white placeholder:text-white/50 font-medium"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={finishEditing}
                    className="h-8 w-8 text-white hover:bg-white/20"
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowNamePicker(showNamePicker === player.id ? null : player.id)}
                  className="flex-1 text-left px-2 py-1 rounded-lg text-white font-semibold hover:bg-white/10 transition-colors flex items-center gap-2"
                >
                  <span className="truncate">{player.name}</span>
                  <Pencil className="w-3 h-3 opacity-50 shrink-0" />
                </button>
              )}

              {/* Random name button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => getRandomNewName(player.id)}
                className="h-8 w-8 text-white/70 hover:text-white hover:bg-white/20 shrink-0"
              >
                <Shuffle className="w-4 h-4" />
              </Button>

              {/* Remove button */}
              {players.length > 2 && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removePlayer(player.id)}
                  className="h-8 w-8 text-white/70 hover:text-white hover:bg-red-500/50 shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Name picker dropdown */}
            {showNamePicker === player.id && (
              <div className="absolute top-full left-0 right-0 mt-1 p-2 bg-card/95 backdrop-blur-xl rounded-xl border border-border shadow-2xl z-50 max-h-64 overflow-y-auto">
                {/* Manual input option */}
                <button
                  type="button"
                  onClick={() => startEditing(player.id, player.name)}
                  className="w-full p-2 mb-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-medium flex items-center gap-2 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                  {language === 'hu' ? 'Sajat nev megadasa...' : 'Enter custom name...'}
                </button>
                
                {/* Funny names grid */}
                <div className="grid grid-cols-2 gap-1">
                  {getAvailableNames(player.id).map((name) => (
                    <button
                      type="button"
                      key={name}
                      onClick={() => selectFunnyName(player.id, name)}
                      className="p-2 rounded-lg text-sm font-medium text-left hover:bg-primary/10 transition-colors truncate"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add player button */}
      {players.length < 10 && (
        <Button
          onClick={handleAddPlayer}
          variant="outline"
          className="w-full h-12 border-dashed border-2 border-primary/30 hover:border-primary/50 hover:bg-primary/5 gap-2 bg-transparent"
        >
          <Plus className="w-5 h-5" />
          {language === 'hu' ? 'Uj jatekos hozzaadasa' : 'Add new player'}
        </Button>
      )}

      {/* Start game button */}
      <Button
        onClick={onStartGame}
        className="w-full h-14 text-lg font-bold mt-2 bg-gradient-to-r from-primary to-amber-500 hover:from-primary/90 hover:to-amber-500/90 shadow-lg shadow-primary/25"
        size="lg"
      >
        {t('startGame', language)}
      </Button>
    </div>
  );
}
