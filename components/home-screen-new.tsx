"use client";

import { useState } from "react";
import { useGame } from "@/lib/game-context";
import { Button } from "@/components/ui/button";
import { GAMES, GameInfo } from "@/lib/game-catalog";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import { User as UserIcon, Users, Heart, Menu, Play } from "lucide-react";
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
  onOpenParty,
  isOnline,
  user,
}: HomeScreenNewProps) {
  const { language } = useGame();
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("all");
  const [activeTab, setActiveTab] = useState<"home" | "favorites" | "more">(
    "home",
  );

  // Map games to categories (you can customize this)
  const getGamesByCategory = (category: CategoryFilter) => {
    if (category === "all") return GAMES;
    if (category === "classic")
      return GAMES.filter((g) => g.category === "drinking");
    if (category === "dirty")
      return GAMES.filter((g) => g.category === "non-drinking");
    return GAMES;
  };

  const filteredGames = getGamesByCategory(selectedCategory);

  // Get 4 featured games
  const featuredGames = [
    GAMES.find((g) => g.id === "kings-cup"),
    GAMES.find((g) => g.id === "ride-the-bus"),
    GAMES.find((g) => g.id === "taboo"),
    GAMES.find((g) => g.id === "rating-game"),
  ].filter(Boolean) as GameInfo[];

  // Game card icons mapping
  const gameIcons: { [key: string]: string } = {
    "kings-cup": "🔥",
    "ride-the-bus": "🃏",
    taboo: "🚌",
    "rating-game": "🎯",
    blackjack: "🎰",
    charades: "🎭",
  };

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Hero Section with Logo */}
      <header className="relative pt-8 pb-6 px-4">
        <div className="luxury-card rounded-3xl p-8 text-center overflow-hidden">
          {/* Ornate Pattern Background */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-2 left-2 w-12 h-12 border-t-2 border-l-2 border-gold" />
            <div className="absolute top-2 right-2 w-12 h-12 border-t-2 border-r-2 border-gold" />
            <div className="absolute bottom-2 left-2 w-12 h-12 border-b-2 border-l-2 border-gold" />
            <div className="absolute bottom-2 right-2 w-12 h-12 border-b-2 border-r-2 border-gold" />
          </div>

          {/* Logo and Title */}
          <div className="relative z-10">
            <div className="mb-4 flex justify-center">
              <div className="relative w-48 h-48">
                <Image
                  src="/logo.png"
                  alt="Drunk Deck Logo"
                  width={192}
                  height={192}
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            {/* Decorative elements */}
            <div className="flex items-center justify-center gap-4 mb-2">
              <div className="w-8 h-[2px] bg-gradient-to-r from-transparent via-gold to-gold" />
              <span className="text-2xl">👑</span>
              <div className="w-8 h-[2px] bg-gradient-to-l from-transparent via-gold to-gold" />
            </div>
          </div>
        </div>

        {/* User Profile Button */}
        {isOnline && onOpenProfile ? (
          <button
            onClick={onOpenProfile}
            className="absolute top-12 right-4 w-10 h-10 rounded-full border-2 border-gold bg-black flex items-center justify-center hover:bg-gold hover:text-black transition-all"
          >
            <UserIcon className="w-5 h-5" />
          </button>
        ) : onLogin ? (
          <button
            onClick={onLogin}
            className="absolute top-12 right-4 px-4 py-2 rounded-full border-2 border-gold bg-black text-gold text-sm font-bold hover:bg-gold hover:text-black transition-all"
          >
            {language === "hu" ? "Belépés" : "Login"}
          </button>
        ) : null}
      </header>

      {/* Category Filters */}
      <div className="px-4 mb-6">
        <div className="flex gap-3 justify-center">
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
              label: language === "hu" ? "MOCSKOS" : "DIRTY",
            },
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-bold tracking-wider transition-all border-2",
                selectedCategory === cat.id
                  ? "bg-gold text-black border-gold shadow-lg shadow-gold/50"
                  : "bg-transparent text-gold border-gold/50 hover:border-gold",
              )}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content - Game Grid */}
      <main className="flex-1 px-4 pb-24 overflow-y-auto">
        <div className="grid grid-cols-2 gap-4 max-w-2xl mx-auto">
          {featuredGames.map((game) => (
            <button
              key={game.id}
              onClick={() => onSelectGame(game)}
              className="luxury-card rounded-2xl p-4 hover:scale-105 transition-transform duration-300 group"
            >
              {/* Card Icon/Image Area */}
              <div className="relative aspect-square mb-3 rounded-xl bg-gradient-to-br from-black via-zinc-900 to-black flex items-center justify-center overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0">
                  <div className="absolute inset-2 border border-gold/20 rounded-lg" />
                  {/* Card suits pattern */}
                  <div className="absolute top-2 left-2 text-gold/20 text-xs">
                    ♠
                  </div>
                  <div className="absolute top-2 right-2 text-gold/20 text-xs">
                    ♥
                  </div>
                  <div className="absolute bottom-2 left-2 text-gold/20 text-xs">
                    ♣
                  </div>
                  <div className="absolute bottom-2 right-2 text-gold/20 text-xs">
                    ♦
                  </div>
                </div>

                {/* Main Icon */}
                <div className="relative z-10 text-6xl group-hover:scale-110 transition-transform">
                  {gameIcons[game.id] || "🎮"}
                </div>

                {/* Decorative elements */}
                <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1">
                  <div className="w-1 h-1 rounded-full bg-gold animate-pulse" />
                  <div className="w-1 h-1 rounded-full bg-gold animate-pulse delay-100" />
                  <div className="w-1 h-1 rounded-full bg-gold animate-pulse delay-200" />
                </div>
              </div>

              {/* Game Title */}
              <h3 className="text-golden text-lg font-black text-center mb-2 tracking-wide uppercase">
                {language === "hu" ? game.name : game.nameEn}
              </h3>

              {/* Play Button */}
              <div className="luxury-button rounded-lg py-2 px-4 flex items-center justify-center gap-2 text-black font-bold text-sm">
                <Play className="w-3 h-3 fill-current" />
                <span>{language === "hu" ? "JÁTÉK" : "PLAY"}</span>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t-2 border-gold safe-area-bottom">
        <div className="flex justify-around items-center h-16 max-w-2xl mx-auto">
          <button
            onClick={() => setActiveTab("home")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-6 py-2 transition-all",
              activeTab === "home" ? "text-gold" : "text-gray-500",
            )}
          >
            <div className="w-8 h-8 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
                <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
              </svg>
            </div>
            <span className="text-xs font-bold">
              {language === "hu" ? "Home" : "Home"}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("favorites")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-6 py-2 transition-all",
              activeTab === "favorites" ? "text-gold" : "text-gray-500",
            )}
          >
            <Heart
              className={cn(
                "w-6 h-6",
                activeTab === "favorites" && "fill-current",
              )}
            />
            <span className="text-xs font-bold">
              {language === "hu" ? "Favorites" : "Favorites"}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("more")}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-6 py-2 transition-all",
              activeTab === "more" ? "text-gold" : "text-gray-500",
            )}
          >
            <Menu className="w-6 h-6" />
            <span className="text-xs font-bold">
              {language === "hu" ? "More" : "More"}
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
