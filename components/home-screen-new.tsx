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
  const displayGames = filteredGames.slice(0, 6);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Texture overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-30 z-0" 
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.4'/%3E%3C/svg%3E")`,
        }} 
      />

      {/* Header with Framed Logo */}
      <header className="relative pt-4 pb-2 px-3 safe-area-top z-10">
        {/* Profile Button - positioned absolutely */}
        {isOnline && onOpenProfile ? (
          <button
            onClick={onOpenProfile}
            className="absolute top-6 right-4 z-20 w-10 h-10 rounded-full border-2 border-gold/60 bg-background/90 flex items-center justify-center text-gold hover:bg-gold hover:text-background transition-all shadow-lg"
          >
            <UserIcon className="w-5 h-5" />
          </button>
        ) : onLogin ? (
          <button
            onClick={onLogin}
            className="absolute top-6 right-4 z-20 px-3 py-1.5 rounded-full border-2 border-gold/60 bg-background/90 text-gold text-xs font-bold uppercase tracking-wider hover:bg-gold hover:text-background transition-all shadow-lg"
          >
            {language === "hu" ? "Belépés" : "Login"}
          </button>
        ) : null}

        {/* Logo Image - full width with frame included */}
        <div className="relative w-full max-w-sm mx-auto animate-float">
          <div className="relative aspect-[1.6/1] w-full">
            <Image
              src="/images/logo-framed.png"
              alt="Drunk Deck"
              fill
              className="object-contain drop-shadow-[0_4px_20px_rgba(212,175,55,0.4)]"
              priority
            />
          </div>
        </div>
      </header>

      {/* Category Filters */}
      <div className="px-4 py-3 z-10">
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
                "px-5 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300",
                "border-2",
                selectedCategory === cat.id
                  ? "bg-gold text-background border-gold shadow-[0_0_15px_rgba(212,175,55,0.5)]"
                  : "bg-transparent text-gold/80 border-gold/40 hover:border-gold/70 hover:text-gold"
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Game Grid */}
      <main className="flex-1 px-3 pb-24 overflow-y-auto z-10">
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
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
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-md border-t border-gold/20 safe-area-bottom">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          <button
            onClick={() => setActiveTab("home")}
            className={cn(
              "flex flex-col items-center gap-1 px-6 py-2 transition-all",
              activeTab === "home" ? "text-gold" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Home className={cn("w-6 h-6", activeTab === "home" && "drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]")} />
            <span className="text-xs font-semibold">Home</span>
          </button>

          <button
            onClick={() => setActiveTab("favorites")}
            className={cn(
              "flex flex-col items-center gap-1 px-6 py-2 transition-all",
              activeTab === "favorites" ? "text-gold" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Heart
              className={cn("w-6 h-6", activeTab === "favorites" && "fill-current drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]")}
            />
            <span className="text-xs font-semibold">Favorites</span>
          </button>

          <button
            onClick={() => setActiveTab("more")}
            className={cn(
              "flex flex-col items-center gap-1 px-6 py-2 transition-all",
              activeTab === "more" ? "text-gold" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            <Menu className={cn("w-6 h-6", activeTab === "more" && "drop-shadow-[0_0_8px_rgba(212,175,55,0.8)]")} />
            <span className="text-xs font-semibold">More</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

// Game Card Component - Full image with frame included
interface GameCardProps {
  game: GameInfo;
  language: "hu" | "en";
  onSelect: () => void;
}

function GameCard({ game, language, onSelect }: GameCardProps) {
  return (
    <button
      onClick={onSelect}
      className="relative group transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98]"
    >
      {/* Game Image - Full card with ornate frame included in image */}
      <div className="relative aspect-square w-full rounded-lg overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
        <Image
          src={game.icon}
          alt={language === "hu" ? game.name : game.nameEn}
          fill
          className="object-cover"
        />
        
        {/* Subtle shine effect on hover */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/0 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        {/* Play button overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-14 h-14 rounded-full bg-gold/90 flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-7 h-7 text-background fill-current ml-1" />
          </div>
        </div>
      </div>
    </button>
  );
}
