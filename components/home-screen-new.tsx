"use client";

import { useState } from "react";
import { useGame } from "@/lib/game-context";
import { GAMES, GameInfo } from "@/lib/game-catalog";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import { Home, Heart, Menu, Play, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface HomeScreenNewProps {
  onSelectGame: (game: GameInfo) => void;
  onOpenProfile?: () => void;
  onLogin?: () => void;
  onOpenParty?: () => void;
  isOnline: boolean;
  user: User | null;
}

type CategoryFilter = "all" | "classic" | "dirty";

export function HomeScreenNew({
  onSelectGame,
  onOpenProfile,
  onLogin,
  isOnline,
}: HomeScreenNewProps) {
  const { language } = useGame();
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("all");
  const [activeTab, setActiveTab] = useState<"home" | "favorites" | "more">(
    "home",
  );

  const getGamesByCategory = (category: CategoryFilter) => {
    if (category === "all") return GAMES;
    if (category === "classic")
      return GAMES.filter((g) => g.category === "drinking");
    if (category === "dirty")
      return GAMES.filter((g) => g.category === "non-drinking");
    return GAMES;
  };

  const filteredGames = getGamesByCategory(selectedCategory);

  // Display games based on category
  const displayGames = filteredGames.slice(0, 6);

  return (
    <div className="min-h-screen bg-background flex flex-col texture-overlay">
      {/* Header with Logo */}
      <header className="relative pt-6 pb-4 px-4 safe-area-top">
        <div className="header-frame rounded-2xl p-6 relative overflow-hidden">
          {/* Corner Ornaments */}
          <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-gold opacity-50" />
          <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-gold opacity-50" />
          <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-gold opacity-50" />
          <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-gold opacity-50" />
          
          {/* Background card suits */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none overflow-hidden">
            <span className="text-[120px] text-gold tracking-[-0.2em]">
              {"♠♥♣♦"}
            </span>
          </div>

          {/* Logo */}
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-40 h-40 relative mb-2 animate-float">
              <Image
                src="/logo.png"
                alt="Drunk Deck"
                fill
                className="object-contain drop-shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                priority
              />
            </div>
            
            {/* Decorative divider */}
            <div className="flex items-center gap-3 mt-1">
              <div className="w-12 h-[1px] bg-gradient-to-r from-transparent to-gold" />
              <div className="diamond-icon" />
              <div className="w-12 h-[1px] bg-gradient-to-l from-transparent to-gold" />
            </div>
          </div>
        </div>

        {/* Profile Button */}
        {isOnline && onOpenProfile ? (
          <button
            onClick={onOpenProfile}
            className="absolute top-10 right-6 w-10 h-10 rounded-full border-2 border-gold bg-background/80 flex items-center justify-center text-gold hover:bg-gold hover:text-background transition-all"
          >
            <UserIcon className="w-5 h-5" />
          </button>
        ) : onLogin ? (
          <button
            onClick={onLogin}
            className="absolute top-10 right-6 px-4 py-2 rounded-full border-2 border-gold bg-background/80 text-gold text-xs font-bold uppercase tracking-wider hover:bg-gold hover:text-background transition-all"
          >
            {language === "hu" ? "Belépés" : "Login"}
          </button>
        ) : null}
      </header>

      {/* Category Filters */}
      <div className="px-4 py-4">
        <div className="flex gap-2 justify-center">
          {[
            {
              id: "all" as CategoryFilter,
              label: language === "hu" ? "MIND" : "ALL",
            },
            {
              id: "classic" as CategoryFilter,
              label: language === "hu" ? "KLASSZIKUS" : "CLASSIC",
            },
            {
              id: "dirty" as CategoryFilter,
              label: language === "hu" ? "PARTY" : "PARTY",
            },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "category-pill",
                selectedCategory === cat.id && "active",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Game Grid */}
      <main className="flex-1 px-4 pb-24 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4 max-w-lg mx-auto">
          {displayGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              language={language}
              onSelect={() => onSelectGame(game)}
            />
          ))}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bottom-nav safe-area-bottom z-50">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          <button
            onClick={() => setActiveTab("home")}
            className={cn("nav-item", activeTab === "home" && "active")}
          >
            <Home className="w-6 h-6" />
            <span className="text-xs font-semibold">Home</span>
          </button>

          <button
            onClick={() => setActiveTab("favorites")}
            className={cn("nav-item", activeTab === "favorites" && "active")}
          >
            <Heart
              className={cn("w-6 h-6", activeTab === "favorites" && "fill-current")}
            />
            <span className="text-xs font-semibold">Favorites</span>
          </button>

          <button
            onClick={() => setActiveTab("more")}
            className={cn("nav-item", activeTab === "more" && "active")}
          >
            <Menu className="w-6 h-6" />
            <span className="text-xs font-semibold">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

// Game Card Component
interface GameCardProps {
  game: GameInfo;
  language: "hu" | "en";
  onSelect: () => void;
}

function GameCard({ game, language, onSelect }: GameCardProps) {
  const gameDisplayNames: Record<string, { hu: string; en: string }> = {
    "kings-cup": { hu: "Tűzgyűrű", en: "Ring of Fire" },
    "ride-the-bus": { hu: "Buszozás", en: "Bus Driver" },
    "blackjack": { hu: "Blackjack", en: "Blackjack" },
    "charades": { hu: "Homlokjáték", en: "Charades" },
    "taboo": { hu: "Kategóriák", en: "Categories" },
    "rating-game": { hu: "Igazságkör", en: "Truth Circle" },
  };

  const displayName = gameDisplayNames[game.id]?.[language] || 
    (language === "hu" ? game.name : game.nameEn);

  return (
    <button
      onClick={onSelect}
      className="game-card-frame p-3 text-left group transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98]"
    >
      {/* Card Image Area */}
      <div className="relative aspect-square mb-3 rounded-lg overflow-hidden bg-gradient-to-br from-black via-zinc-900 to-black">
        {/* Corner card suits */}
        <div className="absolute top-2 left-2 text-gold/30 text-sm font-bold">{"♦"}</div>
        <div className="absolute top-2 right-2 text-gold/30 text-sm font-bold">{"♦"}</div>
        <div className="absolute bottom-2 left-2 text-gold/30 text-sm font-bold">{"♦"}</div>
        <div className="absolute bottom-2 right-2 text-gold/30 text-sm font-bold">{"♦"}</div>
        
        {/* Inner border */}
        <div className="absolute inset-2 border border-gold/20 rounded-md pointer-events-none" />
        
        {/* Game icon/image */}
        <div className="absolute inset-0 flex items-center justify-center">
          {game.icon ? (
            <div className="relative w-20 h-20 group-hover:scale-110 transition-transform">
              <Image
                src={game.icon}
                alt={displayName}
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <span className="text-5xl group-hover:scale-110 transition-transform">
              {"🎮"}
            </span>
          )}
        </div>
        
        {/* Shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-gold/0 to-gold/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Game Title */}
      <h3 className="text-golden text-center text-sm font-black uppercase tracking-wide mb-2 line-clamp-1">
        {displayName}
      </h3>

      {/* Play Button */}
      <div className="btn-gold rounded-md py-2 px-3 flex items-center justify-center gap-2 text-xs">
        <Play className="w-3 h-3 fill-current" />
        <span>{language === "hu" ? "JÁTÉK" : "PLAY"}</span>
      </div>
    </button>
  );
}
