"use client";

import { useGame } from "@/lib/game-context";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GameInfo } from "@/lib/game-catalog";
import {
  ArrowLeft,
  Users,
  Clock,
  Zap,
  Star,
  Plus,
  X,
  Shuffle,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { motion } from "framer-motion";

interface GameDetailProps {
  game: GameInfo;
  onBack: () => void;
  onStartGame: () => void;
}

export function GameDetail({ game, onBack, onStartGame }: GameDetailProps) {
  const {
    players,
    addPlayer,
    removePlayer,
    updatePlayerName,
    shufflePlayerNames,
    language,
  } = useGame();

  const handleAddPlayer = () => {
    if (players.length < game.maxPlayers) addPlayer();
  };

  const handleRemovePlayer = (id: string) => {
    if (players.length > game.minPlayers) removePlayer(id);
  };

  const canStart =
    players.length >= game.minPlayers && players.length <= game.maxPlayers;

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
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/55 to-black/88" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a0800]/85 via-transparent to-transparent" />
      </div>

      {/* Grain */}
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px",
        }}
      />

      {/* ── HEADER ── */}
      <header className="relative z-10 flex items-center justify-between px-4 pt-5 pb-3 safe-area-top">
        <motion.button
          onClick={onBack}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-2 px-3 py-2 rounded-xl transition-all"
          style={{
            background: "rgba(15,6,0,0.55)",
            border: "1px solid rgba(255,185,0,0.3)",
            backdropFilter: "blur(8px)",
          }}
        >
          <ArrowLeft className="w-4 h-4 text-[#FFD700]" />
          <span
            className="text-sm font-bold text-[#FFD700]"
            style={{ fontFamily: "'Cinzel', serif" }}
          >
            {language === "hu" ? "Vissza" : "Back"}
          </span>
        </motion.button>

        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-base font-black tracking-widest"
          style={{
            fontFamily: "'Cinzel', serif",
            background:
              "linear-gradient(180deg, #FFE566 0%, #FFB300 60%, #CC8800 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            filter: "drop-shadow(0 0 8px rgba(255,160,0,0.4))",
          }}
        >
          {language === "hu" ? game.name : game.nameEn}
        </motion.h1>

        <div className="w-20" />
      </header>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-y-auto px-4 pb-32 z-10">
        <div className="max-w-md mx-auto space-y-4">
          {/* Hero: Game icon + badges */}
          <motion.div
            className="flex flex-col items-center pt-2 pb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
          >
            {/* Arany derengés mögötte */}
            <div className="relative flex items-center justify-center mb-4">
              <div className="absolute w-40 h-40 rounded-full bg-[#FFB300]/20 blur-3xl pointer-events-none" />
              <div
                className="relative w-28 h-28 rounded-2xl overflow-hidden flex items-center justify-center"
                style={{
                  border: "1px solid rgba(255,185,0,0.35)",
                  background: "rgba(15,6,0,0.6)",
                  backdropFilter: "blur(10px)",
                  boxShadow:
                    "0 0 30px rgba(255,160,0,0.2), 0 8px 32px rgba(0,0,0,0.6)",
                }}
              >
                {game.icon ? (
                  <Image
                    src={game.icon}
                    alt={game.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <span className="text-5xl">🎮</span>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="flex gap-2 flex-wrap justify-center">
              {game.isNew && (
                <GoldBadge
                  label={language === "hu" ? "Új" : "New"}
                  color="#22c55e"
                />
              )}
              {game.isPopular && (
                <GoldBadge
                  label={language === "hu" ? "Népszerű" : "Popular"}
                  color="#FFB300"
                />
              )}
              {game.isPremium && <GoldBadge label="Premium" color="#a855f7" />}
              {game.isOnlineOnly && (
                <GoldBadge label="Online" color="#3b82f6" />
              )}
            </div>
          </motion.div>

          {/* Description */}
          <GlassCard delay={0.2}>
            <p
              className="text-sm text-center leading-relaxed"
              style={{ color: "rgba(255,220,150,0.75)" }}
            >
              {language === "hu" ? game.description : game.descriptionEn}
            </p>
          </GlassCard>

          {/* Info grid */}
          <motion.div
            className="grid grid-cols-3 gap-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
          >
            <InfoCell
              icon={<Users className="w-5 h-5 text-[#FFD700]" />}
              label={language === "hu" ? "Játékosok" : "Players"}
            >
              <span
                className="text-sm font-black text-[#FFE566]"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                {game.minPlayers}–{game.maxPlayers}
              </span>
            </InfoCell>
            <InfoCell
              icon={<Clock className="w-5 h-5 text-[#FFD700]" />}
              label={language === "hu" ? "Időtartam" : "Duration"}
            >
              <span
                className="text-sm font-black text-[#FFE566]"
                style={{ fontFamily: "'Cinzel', serif" }}
              >
                {game.duration}
              </span>
            </InfoCell>
            <InfoCell
              icon={<Zap className="w-5 h-5 text-[#FFD700]" />}
              label={language === "hu" ? "Nehézség" : "Difficulty"}
            >
              <div className="flex gap-1 justify-center">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-2 h-4 rounded-sm"
                    style={{
                      background:
                        i < game.difficulty
                          ? "linear-gradient(180deg, #FFE566, #FFB300)"
                          : "rgba(255,185,0,0.15)",
                    }}
                  />
                ))}
              </div>
            </InfoCell>
          </motion.div>

          {/* Rules */}
          <GlassCard delay={0.35}>
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-[#FFD700]" />
              <h3
                className="font-black text-sm tracking-widest"
                style={{
                  fontFamily: "'Cinzel', serif",
                  background: "linear-gradient(90deg, #FFE566, #FFB300)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {language === "hu" ? "SZABÁLYOK" : "RULES"}
              </h3>
            </div>
            {/* Dekoratív vonal */}
            <div
              className="h-px mb-3"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,185,0,0.4), transparent)",
              }}
            />
            <p
              className="text-sm leading-relaxed"
              style={{ color: "rgba(255,220,150,0.75)" }}
            >
              {language === "hu" ? game.rules : game.rulesEn}
            </p>
          </GlassCard>

          {/* Players setup */}
          <GlassCard delay={0.42}>
            <div className="flex items-center justify-between mb-4">
              <Label
                className="font-black text-sm tracking-widest"
                style={{
                  fontFamily: "'Cinzel', serif",
                  background: "linear-gradient(90deg, #FFE566, #FFB300)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {language === "hu" ? "JÁTÉKOSOK" : "PLAYERS"} ({players.length}/
                {game.maxPlayers})
              </Label>
              <button
                onClick={shufflePlayerNames}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={{
                  fontFamily: "'Cinzel', serif",
                  color: "#FFD700",
                  background: "rgba(255,185,0,0.1)",
                  border: "1px solid rgba(255,185,0,0.25)",
                }}
              >
                <Shuffle className="w-3.5 h-3.5" />
                {language === "hu" ? "Keverés" : "Shuffle"}
              </button>
            </div>

            {/* Dekoratív vonal */}
            <div
              className="h-px mb-4"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,185,0,0.4), transparent)",
              }}
            />

            <div className="space-y-2.5 mb-4">
              {players.map((player, index) => (
                <motion.div
                  key={player.id}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <span
                    className="text-xs font-black w-6 text-center flex-shrink-0"
                    style={{
                      color: "rgba(255,185,0,0.5)",
                      fontFamily: "'Cinzel', serif",
                    }}
                  >
                    {index + 1}
                  </span>
                  <Input
                    value={player.name}
                    onChange={(e) =>
                      updatePlayerName(player.id, e.target.value)
                    }
                    className="flex-1 h-10 text-sm font-medium"
                    style={{
                      background: "rgba(15,6,0,0.5)",
                      border: "1px solid rgba(255,185,0,0.25)",
                      borderRadius: "10px",
                      color: "#FFE566",
                      outline: "none",
                    }}
                    placeholder={`${language === "hu" ? "Játékos" : "Player"} ${index + 1}`}
                  />
                  {players.length > game.minPlayers && (
                    <button
                      onClick={() => handleRemovePlayer(player.id)}
                      className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        background: "rgba(180,30,30,0.15)",
                        border: "1px solid rgba(180,30,30,0.3)",
                      }}
                    >
                      <X className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </motion.div>
              ))}
            </div>

            {players.length < game.maxPlayers && (
              <button
                onClick={handleAddPlayer}
                className="w-full h-10 flex items-center justify-center gap-2 text-sm font-bold transition-all rounded-xl"
                style={{
                  fontFamily: "'Cinzel', serif",
                  color: "#FFD700",
                  background: "rgba(255,185,0,0.08)",
                  border: "1px dashed rgba(255,185,0,0.35)",
                }}
              >
                <Plus className="w-4 h-4" />
                {language === "hu" ? "Játékos hozzáadása" : "Add Player"}
              </button>
            )}

            {!canStart && (
              <p
                className="text-xs text-center mt-3"
                style={{
                  color: "rgba(255,185,0,0.45)",
                  fontFamily: "'Cinzel', serif",
                }}
              >
                {language === "hu"
                  ? `Minimum ${game.minPlayers} játékos szükséges`
                  : `Minimum ${game.minPlayers} players required`}
              </p>
            )}
          </GlassCard>
        </div>
      </main>

      {/* ── FOOTER: Start gomb ── */}
      <div
        className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-3 safe-area-bottom"
        style={{
          background:
            "linear-gradient(to top, rgba(10,4,0,0.95) 0%, transparent 100%)",
        }}
      >
        <motion.button
          onClick={canStart ? onStartGame : undefined}
          disabled={!canStart}
          className="relative w-full py-[15px] flex items-center justify-center gap-3"
          style={{
            borderRadius: "12px",
            background: canStart
              ? "linear-gradient(180deg, #1a0a00 0%, #0d0500 100%)"
              : "rgba(30,20,10,0.4)",
            border: `1px solid ${canStart ? "rgba(255,185,0,0.55)" : "rgba(255,185,0,0.15)"}`,
            boxShadow: canStart
              ? "0 0 18px rgba(255,160,0,0.2), inset 0 1px 0 rgba(255,200,80,0.12)"
              : "none",
            cursor: canStart ? "pointer" : "not-allowed",
          }}
          whileHover={canStart ? { scale: 1.02 } : {}}
          whileTap={canStart ? { scale: 0.97 } : {}}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <Play
            className="w-4 h-4 fill-current"
            style={{ color: canStart ? "#FFD700" : "rgba(255,185,0,0.3)" }}
          />
          <span
            className="font-black tracking-[0.4em] text-base"
            style={{
              fontFamily: "'Cinzel', serif",
              background: canStart
                ? "linear-gradient(180deg, #FFE566 0%, #FFB300 60%, #CC8800 100%)"
                : "rgba(255,185,0,0.3)",
              WebkitBackgroundClip: canStart ? "text" : undefined,
              WebkitTextFillColor: canStart
                ? "transparent"
                : "rgba(255,185,0,0.3)",
            }}
          >
            {language === "hu" ? "JÁTÉK INDÍTÁSA" : "START GAME"}
          </span>
        </motion.button>
      </div>
    </div>
  );
}

// ── Helper Components ──

function GlassCard({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      className="w-full p-4 rounded-2xl"
      style={{
        background: "rgba(15,6,0,0.55)",
        border: "1px solid rgba(255,185,0,0.2)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.45 }}
    >
      {children}
    </motion.div>
  );
}

function InfoCell({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex flex-col items-center gap-1.5 p-3 rounded-xl"
      style={{
        background: "rgba(15,6,0,0.55)",
        border: "1px solid rgba(255,185,0,0.2)",
        backdropFilter: "blur(12px)",
      }}
    >
      {icon}
      <p
        className="text-[10px] uppercase tracking-widest"
        style={{ color: "rgba(255,185,0,0.45)", fontFamily: "'Cinzel', serif" }}
      >
        {label}
      </p>
      {children}
    </div>
  );
}

function GoldBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="px-3 py-1 rounded-full text-xs font-bold tracking-wider"
      style={{
        fontFamily: "'Cinzel', serif",
        background: `${color}18`,
        border: `1px solid ${color}45`,
        color: color,
      }}
    >
      {label}
    </span>
  );
}
