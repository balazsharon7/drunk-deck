"use client";

import { useState } from "react";
import { useGame } from "@/lib/game-context";
import { GAMES, GameInfo } from "@/lib/game-catalog";
import type { User } from "@supabase/supabase-js";
import Image from "next/image";
import { motion } from "framer-motion";
import { Home, Menu, Play, User as UserIcon, Users, Crown } from "lucide-react";
import { cn } from "@/lib/utils";

interface HomeScreenNewProps {
  onSelectGame: (game: GameInfo) => void;
  onOpenProfile?: () => void;
  onLogin?: () => void;
  onOpenParty?: () => void;
  isOnline: boolean;
  user: User | null;
  avatarUrl?: string | null;
}

type CategoryFilter = "all" | "classic" | "dirty";

export function HomeScreenNew({
  onSelectGame,
  onOpenProfile,
  onLogin,
  onOpenParty,
  isOnline,
  avatarUrl,
}: HomeScreenNewProps) {
  const { language } = useGame();
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("all");
  const [activeTab, setActiveTab] = useState<"home" | "party" | "more">("home");

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
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Háttérkép */}
      <div className="fixed inset-0 z-0">
        <Image
          src="/images/hatter.png"
          alt="background"
          fill
          className="object-cover"
          priority
        />
        {/* Rétegzett overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/85" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a0800]/80 via-transparent to-transparent" />
      </div>

      {/* Grain texture */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px",
        }}
      />

      {/* ── HEADER ── */}
      <header className="relative z-10 pt-4 pb-0 px-4 safe-area-top">
        {/* Profile / Login gomb */}
        {isOnline && onOpenProfile ? (
          <motion.button
            onClick={onOpenProfile}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute top-5 right-4 z-20 w-10 h-10 rounded-full overflow-hidden flex items-center justify-center transition-all"
            style={{
              background: "rgba(20,8,0,0.6)",
              border: "1px solid rgba(255,185,0,0.45)",
              backdropFilter: "blur(8px)",
              boxShadow: "0 0 12px rgba(255,160,0,0.15)",
            }}
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="profile"
                fill
                className="object-cover"
              />
            ) : (
              <UserIcon className="w-5 h-5 text-[#FFD700]" />
            )}
          </motion.button>
        ) : onLogin ? (
          <motion.button
            onClick={onLogin}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute top-5 right-4 z-20 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all"
            style={{
              fontFamily: "'Cinzel', serif",
              background: "rgba(20,8,0,0.6)",
              border: "1px solid rgba(255,185,0,0.45)",
              color: "#FFD700",
              backdropFilter: "blur(8px)",
            }}
          >
            {language === "hu" ? "Belépés" : "Login"}
          </motion.button>
        ) : null}

        {/* Logo – lebegő animáció + arany derengés */}
        <motion.div
          className="relative flex justify-center"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          {/* Arany derengés mögötte */}
          <div className="absolute top-4 w-64 h-32 rounded-full bg-[#FFB300]/20 blur-3xl pointer-events-none" />

          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
            className="relative w-64 h-28"
          >
            <Image
              src="images/logo.png"
              alt="Drunk Deck"
              fill
              className="object-contain drop-shadow-[0_0_24px_rgba(255,160,0,0.55)]"
              priority
            />
          </motion.div>
        </motion.div>
      </header>

      {/* ── ONLINE PARTY BANNER ── */}
      {onOpenParty && (
        <motion.div
          className="px-4 pt-2 pb-1 z-10"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <button
            onClick={onOpenParty}
            className="w-full relative overflow-hidden flex items-center justify-center gap-3 py-3 px-4 group transition-all active:scale-[0.98]"
            style={{
              borderRadius: "14px",
              background: "rgba(15,6,0,0.55)",
              border: "1px solid rgba(255,185,0,0.35)",
              backdropFilter: "blur(10px)",
              boxShadow: "0 0 20px rgba(255,140,0,0.1)",
            }}
          >
            {/* Shimmer */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#FFD700]/8 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

            <div
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: "rgba(255,185,0,0.15)",
                border: "1px solid rgba(255,185,0,0.3)",
              }}
            >
              <Crown className="w-4 h-4 text-[#FFD700]" />
            </div>
            <div className="text-left flex-1">
              <p
                className="text-sm font-black tracking-widest"
                style={{
                  fontFamily: "'Cinzel', serif",
                  background: "linear-gradient(90deg, #FFE566, #FFB300)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                ONLINE PARTY
              </p>
              <p className="text-[#FFD700]/50 text-xs mt-0.5">
                {language === "hu"
                  ? "Játssz az ismerőseiddel!"
                  : "Play with friends!"}
              </p>
            </div>
            <Users className="w-4 h-4 text-[#FFD700]/40 flex-shrink-0" />
          </button>
        </motion.div>
      )}

      {/* ── CATEGORY FILTERS ── */}
      <motion.div
        className="px-4 pt-3 pb-2 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        {/* Felső dekoratív vonal */}
        <div className="flex items-center gap-3 mb-3">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#FFB300]/40" />
          <div className="flex gap-1.5">
            <span className="text-[#FFB300]/50 text-[10px]">♠</span>
            <span className="text-[#FFB300]/70 text-[10px]">♥</span>
            <span className="text-[#FFB300]/50 text-[10px]">♣</span>
          </div>
          <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#FFB300]/40" />
        </div>

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
            <motion.button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              whileTap={{ scale: 0.95 }}
              className="relative px-5 py-2 text-xs font-black uppercase tracking-widest transition-all duration-300 overflow-hidden"
              style={{
                fontFamily: "'Cinzel', serif",
                borderRadius: "8px",
                ...(selectedCategory === cat.id
                  ? {
                      background:
                        "linear-gradient(180deg, #FFE566 0%, #FFB300 60%, #CC8800 100%)",
                      color: "#1a0800",
                      boxShadow:
                        "0 0 16px rgba(255,185,0,0.45), inset 0 1px 0 rgba(255,255,255,0.2)",
                      border: "1px solid #FFD700",
                    }
                  : {
                      background: "rgba(15,6,0,0.5)",
                      color: "rgba(255,210,0,0.65)",
                      border: "1px solid rgba(255,185,0,0.25)",
                      backdropFilter: "blur(6px)",
                    }),
              }}
            >
              {cat.label}
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ── GAME GRID ── */}
      <main className="flex-1 px-3 pb-28 overflow-y-auto z-10">
        <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
          {displayGames.map((game, i) => (
            <motion.div
              key={game.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.07, duration: 0.4 }}
            >
              <GameCard
                game={game}
                language={language}
                onSelect={() => onSelectGame(game)}
              />
            </motion.div>
          ))}
        </div>
      </main>

      {/* ── BOTTOM NAVBAR ── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom"
        style={{
          background: "rgba(10,4,0,0.88)",
          backdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,185,0,0.2)",
          boxShadow: "0 -4px 24px rgba(0,0,0,0.5)",
        }}
      >
        {/* Arany vonal accent */}
        <div
          className="h-px w-full"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, rgba(255,185,0,0.5) 30%, rgba(255,220,80,0.8) 50%, rgba(255,185,0,0.5) 70%, transparent 100%)",
          }}
        />

        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {[
            {
              tab: "home" as const,
              icon: Home,
              label: "Home",
              onClick: () => setActiveTab("home"),
            },
            {
              tab: "party" as const,
              icon: Users,
              label: "Party",
              onClick: () => {
                setActiveTab("party");
                if (onOpenParty) onOpenParty();
                else if (onLogin) onLogin();
              },
            },
            {
              tab: "more" as const,
              icon: UserIcon,
              label: "Profile",
              onClick: () => {
                setActiveTab("more");
                if (onOpenProfile) onOpenProfile();
                else if (onLogin) onLogin();
              },
            },
          ].map(({ tab, icon: Icon, label, onClick }) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={onClick}
                className="flex flex-col items-center gap-1 px-6 py-2 transition-all relative"
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute -top-px h-[2px] w-10 rounded-full"
                    style={{
                      background: "linear-gradient(90deg, #FFE566, #FFB300)",
                    }}
                  />
                )}
                <Icon
                  className="w-6 h-6 transition-all"
                  style={{
                    color: isActive ? "#FFD700" : "rgba(120,100,70,0.8)",
                    filter: isActive
                      ? "drop-shadow(0 0 8px rgba(255,185,0,0.7))"
                      : "none",
                  }}
                />
                <span
                  className="text-[10px] font-bold uppercase tracking-wider transition-all"
                  style={{
                    fontFamily: "'Cinzel', serif",
                    color: isActive ? "#FFD700" : "rgba(120,100,70,0.7)",
                  }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

// ── GAME CARD ──
interface GameCardProps {
  game: GameInfo;
  language: "hu" | "en";
  onSelect: () => void;
}

function GameCard({ game, language, onSelect }: GameCardProps) {
  return (
    <button
      onClick={onSelect}
      className="relative group w-full transition-transform duration-200 hover:scale-[1.03] active:scale-[0.97]"
    >
      {/* Arany keret ragyogással hover-re */}
      <div
        className="absolute -inset-[1px] rounded-[13px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"
        style={{
          background:
            "linear-gradient(135deg, #FFE566, #B8860B, #FFD700, #8B6914)",
          boxShadow: "0 0 16px rgba(255,185,0,0.4)",
        }}
      />

      <div
        className="relative z-10 aspect-square w-full overflow-hidden"
        style={{
          borderRadius: "12px",
          border: "1px solid rgba(255,185,0,0.2)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
        }}
      >
        <Image
          src={game.icon}
          alt={language === "hu" ? game.name : game.nameEn}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
        />

        {/* Alsó gradiens overlay (mindig látható, cím helyett) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(10,4,0,0.75) 0%, rgba(10,4,0,0.1) 45%, transparent 100%)",
          }}
        />

        {/* Play gomb hover-re */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{
              background:
                "linear-gradient(180deg, #FFE566 0%, #FFB300 60%, #CC8800 100%)",
              boxShadow: "0 0 20px rgba(255,185,0,0.6)",
            }}
          >
            <Play className="w-6 h-6 fill-[#1a0800] text-[#1a0800] ml-1" />
          </div>
        </div>

        {/* Játék neve alul */}
        <div className="absolute bottom-0 left-0 right-0 px-2 pb-2">
          <p
            className="text-xs font-black tracking-wider text-center leading-tight"
            style={{
              fontFamily: "'Cinzel', serif",
              background: "linear-gradient(180deg, #FFE566 0%, #FFB300 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 1px 4px rgba(0,0,0,0.8))",
            }}
          >
            {language === "hu" ? game.name : game.nameEn}
          </p>
        </div>
      </div>
    </button>
  );
}
