"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useGame } from "@/lib/game-context";
import { createClient } from "@/lib/supabase/client";
import { GAMES, GameInfo, getMultiplayerGames } from "@/lib/game-catalog";
import type { GameType } from "@/lib/game-types";
import {
  ArrowLeft,
  Users,
  Copy,
  Check,
  Crown,
  UserPlus,
  Play,
  RefreshCw,
  Share2,
  Sparkles,
  Wifi,
  QrCode,
} from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface PartyLobbyProps {
  userId: string;
  username: string;
  onStartGame: (gameType: GameType, partyId: string, members: any[]) => void;
  onLeave: () => void;
}
interface Party {
  id: string;
  code: string;
  name: string;
  host_id: string;
  game_type: string;
  status: string;
  max_players: number;
}
interface PartyMember {
  id: string;
  user_id: string;
  is_ready: boolean;
  profiles: { username: string; avatar_url?: string };
}

// ── Shared UI ──

function BG() {
  return (
    <>
      <div className="fixed inset-0 z-0">
        <Image
          src="/images/hatter.png"
          alt="bg"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/55 to-black/88" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a0800]/85 via-transparent to-transparent" />
      </div>
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px",
        }}
      />
    </>
  );
}

function GoldDivider() {
  return (
    <div className="flex items-center gap-2 my-3">
      <div
        className="flex-1 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,185,0,0.35))",
        }}
      />
      <span className="text-[10px]" style={{ color: "rgba(255,185,0,0.5)" }}>
        ◆
      </span>
      <div
        className="flex-1 h-px"
        style={{
          background:
            "linear-gradient(270deg, transparent, rgba(255,185,0,0.35))",
        }}
      />
    </div>
  );
}

function BackBtn({
  onClick,
  label = "Vissza",
}: {
  onClick: () => void;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-3 py-2 rounded-xl z-10"
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
        {label}
      </span>
    </button>
  );
}

function ScreenTitle({ label }: { label: string }) {
  return (
    <h1
      className="text-base font-black tracking-widest absolute left-1/2 -translate-x-1/2"
      style={{
        fontFamily: "'Cinzel', serif",
        background:
          "linear-gradient(180deg, #FFE566 0%, #FFB300 60%, #CC8800 100%)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
    >
      {label}
    </h1>
  );
}

function GCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${className}`}
      style={{
        background: "rgba(15,6,0,0.55)",
        border: "1px solid rgba(255,185,0,0.2)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      {children}
    </div>
  );
}

function GoldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] font-black tracking-[0.35em] mb-2"
      style={{ fontFamily: "'Cinzel', serif", color: "rgba(255,185,0,0.55)" }}
    >
      {children}
    </p>
  );
}

function PrimaryBtn({
  children,
  onClick,
  disabled = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 w-full">
      <button
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className="relative w-full py-[14px] flex items-center justify-center gap-2 transition-all"
        style={{
          borderRadius: "12px",
          background: disabled
            ? "rgba(30,15,0,0.35)"
            : "linear-gradient(180deg, #1a0a00 0%, #0d0500 100%)",
          border: `1px solid ${disabled ? "rgba(255,185,0,0.15)" : "rgba(255,185,0,0.55)"}`,
          boxShadow: disabled
            ? "none"
            : "0 0 18px rgba(255,160,0,0.2), inset 0 1px 0 rgba(255,200,80,0.12)",
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <span
          className="font-black tracking-[0.35em] text-sm"
          style={{
            fontFamily: "'Cinzel', serif",
            background: disabled
              ? "none"
              : "linear-gradient(180deg, #FFE566 0%, #FFB300 60%, #CC8800 100%)",
            WebkitBackgroundClip: disabled ? "none" : "text",
            WebkitTextFillColor: disabled
              ? "rgba(255,185,0,0.3)"
              : "transparent",
          }}
        >
          {children}
        </span>
      </button>
    </div>
  );
}

function OutlineBtn({
  children,
  onClick,
  red = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  red?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full py-[13px] flex items-center justify-center gap-2 rounded-xl transition-all"
      style={{
        background: red ? "rgba(180,30,30,0.1)" : "rgba(255,185,0,0.06)",
        border: `1px solid ${red ? "rgba(180,30,30,0.35)" : "rgba(255,185,0,0.25)"}`,
        backdropFilter: "blur(8px)",
      }}
    >
      <span
        className="text-sm font-black tracking-widest"
        style={{
          fontFamily: "'Cinzel', serif",
          color: red ? "#f87171" : "#FFD700",
        }}
      >
        {children}
      </span>
    </button>
  );
}

function MemberRow({
  m,
  isHost,
  isMe,
}: {
  m: PartyMember;
  isHost: boolean;
  isMe: boolean;
}) {
  const ready = m.is_ready || isHost;
  return (
    <div className="flex items-center gap-3 py-1">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
        style={{
          background: "rgba(10,4,0,0.7)",
          border: "1px solid rgba(255,185,0,0.35)",
          color: "#FFD700",
        }}
      >
        {m.profiles?.username?.[0]?.toUpperCase() || "?"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="text-sm font-bold truncate"
            style={{ color: "#FFE8A0" }}
          >
            {m.profiles?.username || "Unknown"}
          </span>
          {isHost && (
            <span
              className="text-[9px] font-black px-1.5 py-0.5 rounded"
              style={{
                background: "rgba(255,185,0,0.15)",
                border: "1px solid rgba(255,185,0,0.3)",
                color: "#FFD700",
                fontFamily: "'Cinzel', serif",
              }}
            >
              HOST
            </span>
          )}
          {isMe && !isHost && (
            <span
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{
                color: "rgba(255,185,0,0.5)",
                fontFamily: "'Cinzel', serif",
              }}
            >
              TE
            </span>
          )}
        </div>
        <p
          className="text-[10px] mt-0.5"
          style={{ color: ready ? "#4ade80" : "rgba(255,185,0,0.35)" }}
        >
          {isHost ? "Gazda" : ready ? "Kész" : "Vár..."}
        </p>
      </div>
      {isHost && <Crown className="w-4 h-4 text-[#FFD700] flex-shrink-0" />}
      {ready && !isHost && (
        <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
      )}
    </div>
  );
}

// ── Main ──

export function PartyLobby({
  userId,
  username,
  onStartGame,
  onLeave,
}: PartyLobbyProps) {
  const { language } = useGame();
  const t = language === "hu";

  const [view, setView] = useState<
    | "menu"
    | "create-setup"
    | "create-invite"
    | "create-lobby"
    | "join"
    | "guest-lobby"
  >("menu");
  const [partyName, setPartyName] = useState("");
  const [selectedGameId, setSelectedGameId] = useState<string>("kings-cup");
  const [currentParty, setCurrentParty] = useState<Party | null>(null);
  const [members, setMembers] = useState<PartyMember[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [foundParty, setFoundParty] = useState<Party | null>(null);
  const [searching, setSearching] = useState(false);

  const supabase = createClient();
  const isHost = currentParty?.host_id === userId;
  const allReady = members.every(
    (m) => m.is_ready || m.user_id === currentParty?.host_id,
  );
  const canStart = isHost && members.length >= 2 && allReady;

  // Keep a ref to members so the channel listener always has the latest value
  const membersRef = useRef(members);
  membersRef.current = members;

  const loadMembers = useCallback(async () => {
    if (!currentParty) return;
    const { data } = await supabase
      .from("party_members")
      .select("id,user_id,is_ready,profiles(username,avatar_url)")
      .eq("party_id", currentParty.id);
    if (data) setMembers(data as PartyMember[]);
  }, [currentParty, supabase]);

  useEffect(() => {
    if (!currentParty) return;

    // Initial load
    loadMembers();

    const channel = supabase
      .channel(`party:${currentParty.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "party_members",
          filter: `party_id=eq.${currentParty.id}`,
        },
        () => loadMembers(),
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "parties",
          filter: `id=eq.${currentParty.id}`,
        },
        (payload) => {
          const updated = payload.new as Party;
          setCurrentParty(updated);
          if (updated.status === "playing") {
            console.log("[v0] Party status -> playing, starting game with members:", membersRef.current.length);
            onStartGame(updated.game_type as GameType, updated.id, membersRef.current);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentParty?.id]);

  const handleCreateParty = async () => {
    if (!partyName.trim()) {
      setError(t ? "Add meg a party nevet!" : "Enter party name!");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const { data: party, error: pe } = await supabase
        .from("parties")
        .insert({
          code,
          name: partyName,
          host_id: userId,
          game_type: selectedGameId,
          status: "waiting",
          max_players: 10,
        })
        .select()
        .single();
      if (pe) throw pe;
      await supabase
        .from("party_members")
        .insert({ party_id: party.id, user_id: userId, is_ready: true });
      setCurrentParty(party);
      setView("create-invite");
    } catch {
      setError(t ? "Hiba a party létrehozásakor" : "Error creating party");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchParty = async () => {
    if (joinCode.length !== 6) return;
    setSearching(true);
    setFoundParty(null);
    setError("");
    try {
      const { data: party } = await supabase
        .from("parties")
        .select()
        .eq("code", joinCode.toUpperCase())
        .eq("status", "waiting")
        .single();
      if (!party) {
        setError(t ? "Party nem található!" : "Party not found!");
        return;
      }
      setFoundParty(party);
    } catch {
      setError(t ? "Party nem található!" : "Party not found!");
    } finally {
      setSearching(false);
    }
  };

  const handleJoinParty = async () => {
    if (!foundParty) return;
    setLoading(true);
    try {
      const { data: ex } = await supabase
        .from("party_members")
        .select()
        .eq("party_id", foundParty.id)
        .eq("user_id", userId)
        .single();
      if (!ex)
        await supabase
          .from("party_members")
          .insert({
            party_id: foundParty.id,
            user_id: userId,
            is_ready: false,
          });
      setCurrentParty(foundParty);
      setView("guest-lobby");
    } catch {
      setError(t ? "Hiba a csatlakozáskor" : "Error joining");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleReady = async () => {
    if (!currentParty || isHost) return;
    const next = !isReady;
    setIsReady(next);
    await supabase
      .from("party_members")
      .update({ is_ready: next })
      .eq("party_id", currentParty.id)
      .eq("user_id", userId);
  };

  const handleSelectGame = async (gameId: string) => {
    if (!currentParty || !isHost) return;
    await supabase
      .from("parties")
      .update({ game_type: gameId })
      .eq("id", currentParty.id);
    setCurrentParty({ ...currentParty, game_type: gameId });
    setSelectedGameId(gameId);
  };

  const handleStartGame = async () => {
    console.log("[v0] handleStartGame called, canStart:", canStart, "currentParty:", currentParty?.id, "game_type:", currentParty?.game_type, "members:", members.length);
    if (!currentParty || !canStart) {
      console.log("[v0] handleStartGame BLOCKED - currentParty:", !!currentParty, "canStart:", canStart, "isHost:", isHost, "members.length:", members.length, "allReady:", allReady);
      return;
    }
    const { error: updateError } = await supabase
      .from("parties")
      .update({ status: "playing" })
      .eq("id", currentParty.id);

    if (updateError) {
      console.log("[v0] Error updating party status:", updateError.message);
      return;
    }

    console.log("[v0] Party status updated, calling onStartGame with:", currentParty.game_type, currentParty.id, members.length, "members");
    // Host triggers directly - don't wait for realtime event
    onStartGame(currentParty.game_type as GameType, currentParty.id, members);
  };

  const handleLeaveParty = async () => {
    if (!currentParty) return;
    await supabase
      .from("party_members")
      .delete()
      .eq("party_id", currentParty.id)
      .eq("user_id", userId);
    if (isHost)
      await supabase.from("parties").delete().eq("id", currentParty.id);
    setCurrentParty(null);
    setMembers([]);
    setIsReady(false);
    setView("menu");
  };

  const copyCode = async () => {
    if (!currentParty) return;
    try {
      await navigator.clipboard.writeText(currentParty.code);
    } catch {}
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareParty = async () => {
    if (!currentParty) return;
    const sd = {
      title: "Drunk Deck Party",
      text: t
        ? `Csatlakozz: "${currentParty.name}" - Kód: ${currentParty.code}`
        : `Join "${currentParty.name}" - Code: ${currentParty.code}`,
      url: `${window.location.origin}?party=${currentParty.code}`,
    };
    if (navigator.share) {
      try {
        await navigator.share(sd);
      } catch {
        copyCode();
      }
    } else {
      copyCode();
    }
  };

  // ══ MENU ══
  if (view === "menu")
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden safe-area-top safe-area-bottom">
        <BG />
        <header className="relative z-10 flex items-center justify-between px-4 pt-5 pb-3">
          <BackBtn onClick={onLeave} label={t ? "Vissza" : "Back"} />
          <ScreenTitle label="ONLINE PARTY" />
          <div className="flex items-center gap-2 z-10">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs"
              style={{
                background: "rgba(10,4,0,0.7)",
                border: "1px solid rgba(255,185,0,0.35)",
                color: "#FFD700",
              }}
            >
              {username[0]?.toUpperCase()}
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 pb-10 z-10 flex flex-col gap-4 pt-2">
          {/* Create card */}
          <motion.button
            onClick={() => setView("create-setup")}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative overflow-hidden text-left active:scale-[0.98] transition-all w-full"
            style={{
              borderRadius: "20px",
              background: "rgba(15,6,0,0.6)",
              border: "1px solid rgba(255,185,0,0.3)",
              backdropFilter: "blur(12px)",
              boxShadow: "0 0 30px rgba(255,160,0,0.1)",
            }}
          >
            <div
              className="absolute top-0 right-0 w-32 h-32 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle, rgba(255,185,0,0.08) 0%, transparent 70%)",
                transform: "translate(30%, -30%)",
              }}
            />
            <div className="p-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: "rgba(255,185,0,0.1)",
                  border: "1px solid rgba(255,185,0,0.25)",
                }}
              >
                <Sparkles className="w-5 h-5 text-[#FFD700]" />
              </div>
              <p
                className="font-black text-lg tracking-wider mb-1.5"
                style={{
                  fontFamily: "'Cinzel', serif",
                  background: "linear-gradient(90deg, #FFE566, #FFB300)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {t ? "PARTI LÉTREHOZÁSA" : "CREATE PARTY"}
              </p>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "rgba(255,220,150,0.6)" }}
              >
                {t
                  ? "Hívj meg barátokat linkkel vagy 6 jegyű kóddal. Te választod a játékot."
                  : "Invite friends with a link or 6-digit code. You choose the game."}
              </p>
            </div>
          </motion.button>

          {/* Join card */}
          <motion.button
            onClick={() => setView("join")}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative overflow-hidden text-left active:scale-[0.98] transition-all w-full"
            style={{
              borderRadius: "20px",
              background: "rgba(15,6,0,0.45)",
              border: "1px solid rgba(255,185,0,0.15)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div className="p-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{
                  background: "rgba(255,185,0,0.07)",
                  border: "1px solid rgba(255,185,0,0.15)",
                }}
              >
                <UserPlus className="w-5 h-5 text-[#FFD700]" />
              </div>
              <p
                className="font-black text-lg tracking-wider mb-1.5"
                style={{ fontFamily: "'Cinzel', serif", color: "#FFE8A0" }}
              >
                {t ? "CSATLAKOZÁS" : "JOIN PARTY"}
              </p>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "rgba(255,220,150,0.5)" }}
              >
                {t
                  ? "Add meg a 6 jegyű kódot amit a parti gazdájától kaptál."
                  : "Enter the 6-digit code you got from the party host."}
              </p>
            </div>
          </motion.button>
        </main>
      </div>
    );

  // ══ CREATE SETUP ══
  if (view === "create-setup")
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden safe-area-top safe-area-bottom">
        <BG />
        <header className="relative z-10 flex items-center justify-between px-4 pt-5 pb-3">
          <BackBtn
            onClick={() => setView("menu")}
            label={t ? "Vissza" : "Back"}
          />
          <ScreenTitle label={t ? "ÚJ PARTI" : "NEW PARTY"} />
          <div className="w-20" />
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-32 z-10 space-y-4 pt-2">
          {/* Party name */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GCard>
              <GoldLabel>{t ? "PARTI NEVE" : "PARTY NAME"}</GoldLabel>
              <div
                className="h-px mb-3"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(255,185,0,0.35), transparent)",
                }}
              />
              <input
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                maxLength={30}
                placeholder={t ? "Pl: Pénteki buli" : "E.g: Friday Night"}
                className="w-full h-11 px-4 text-sm font-bold outline-none rounded-xl"
                style={{
                  background: "rgba(10,4,0,0.55)",
                  border: "1px solid rgba(255,185,0,0.25)",
                  color: "#FFE566",
                  fontFamily: "'Cinzel', serif",
                }}
              />
            </GCard>
          </motion.div>

          {/* Game select */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GCard>
              <GoldLabel>{t ? "JÁTÉK VÁLASZTÁSA" : "CHOOSE GAME"}</GoldLabel>
              <div
                className="h-px mb-3"
                style={{
                  background:
                    "linear-gradient(90deg, rgba(255,185,0,0.35), transparent)",
                }}
              />
              <div className="space-y-2">
                {getMultiplayerGames().map((g) => {
                  const sel = selectedGameId === g.id;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGameId(g.id)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left"
                      style={{
                        background: sel
                          ? "rgba(255,185,0,0.1)"
                          : "rgba(10,4,0,0.4)",
                        border: `1px solid ${sel ? "rgba(255,185,0,0.45)" : "rgba(255,185,0,0.12)"}`,
                      }}
                    >
                      <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                        <Image
                          src={g.icon}
                          alt={g.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-bold truncate"
                          style={{ color: "#FFE8A0" }}
                        >
                          {t ? g.name : g.nameEn}
                        </p>
                        <p
                          className="text-[11px] truncate mt-0.5"
                          style={{ color: "rgba(255,185,0,0.4)" }}
                        >
                          {g.minPlayers}–{g.maxPlayers} {t ? "fő" : "players"}
                        </p>
                      </div>
                      {sel && (
                        <Check className="w-4 h-4 text-[#FFD700] flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </GCard>
          </motion.div>

          {error && (
            <div
              className="p-3 rounded-xl text-sm text-center"
              style={{
                background: "rgba(180,30,30,0.15)",
                border: "1px solid rgba(180,30,30,0.35)",
                color: "#f87171",
              }}
            >
              {error}
            </div>
          )}
        </main>

        <div
          className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-3"
          style={{
            background:
              "linear-gradient(to top, rgba(10,4,0,0.95) 0%, transparent 100%)",
          }}
        >
          <PrimaryBtn
            onClick={handleCreateParty}
            disabled={!partyName.trim() || loading}
          >
            {loading ? "..." : t ? "TOVÁBB – MEGHÍVÓ" : "NEXT – INVITE"}
          </PrimaryBtn>
        </div>
      </div>
    );

  // ══ CREATE INVITE ══
  if (view === "create-invite" && currentParty) {
    const selGame = GAMES.find((g) => g.id === currentParty.game_type);
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden safe-area-top safe-area-bottom">
        <BG />
        <header className="relative z-10 flex items-center justify-between px-4 pt-5 pb-3">
          <BackBtn
            onClick={() => setView("create-setup")}
            label={t ? "Szerkesztés" : "Edit"}
          />
          <ScreenTitle label={t ? "MEGHÍVÓ" : "INVITE"} />
          <div className="w-20" />
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-32 z-10 space-y-4 pt-2">
          {/* Party info */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GCard>
              <div className="flex items-center gap-3">
                {selGame && (
                  <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                    <Image
                      src={selGame.icon}
                      alt={selGame.name}
                      width={48}
                      height={48}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <p
                    className="font-black text-sm"
                    style={{ fontFamily: "'Cinzel', serif", color: "#FFE566" }}
                  >
                    {currentParty.name}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "rgba(255,185,0,0.5)" }}
                  >
                    {selGame ? (t ? selGame.name : selGame.nameEn) : ""}
                  </p>
                </div>
              </div>
            </GCard>
          </motion.div>

          {/* Code display */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <GCard className="text-center">
              <GoldLabel>{t ? "CSATLAKOZÁSI KÓD" : "JOIN CODE"}</GoldLabel>
              <div
                className="h-px mb-5"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,185,0,0.4), transparent)",
                }}
              />
              <div
                className="text-[44px] font-black tracking-[10px] mb-5"
                style={{
                  fontFamily: "'Cinzel', serif",
                  background:
                    "linear-gradient(180deg, #FFE566 0%, #FFB300 60%, #CC8800 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  filter: "drop-shadow(0 0 16px rgba(255,185,0,0.3))",
                }}
              >
                {currentParty.code}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={copyCode}
                  className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-black transition-all"
                  style={{
                    fontFamily: "'Cinzel', serif",
                    background: copied
                      ? "rgba(34,197,94,0.12)"
                      : "rgba(255,185,0,0.08)",
                    border: `1px solid ${copied ? "rgba(34,197,94,0.35)" : "rgba(255,185,0,0.25)"}`,
                    color: copied ? "#4ade80" : "#FFD700",
                  }}
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      {t ? "MÁSOLVA" : "COPIED"}
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      {t ? "MÁSOLÁS" : "COPY"}
                    </>
                  )}
                </button>
                <button
                  onClick={shareParty}
                  className="flex-1 py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs font-black"
                  style={{
                    fontFamily: "'Cinzel', serif",
                    background: "rgba(255,185,0,0.06)",
                    border: "1px solid rgba(255,185,0,0.2)",
                    color: "#FFD700",
                  }}
                >
                  <Share2 className="w-3.5 h-3.5" />
                  {t ? "MEGOSZTÁS" : "SHARE"}
                </button>
              </div>
            </GCard>
          </motion.div>

          {/* QR */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <GCard className="text-center">
              <GoldLabel>
                {t ? "QR KÓD BEOLVASÁSSAL" : "SCAN QR CODE"}
              </GoldLabel>
              <div
                className="h-px mb-4"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,185,0,0.35), transparent)",
                }}
              />
              <div className="w-28 h-28 bg-white mx-auto rounded-xl flex items-center justify-center">
                <QrCode className="w-16 h-16 text-black/60" />
              </div>
              <p
                className="text-xs mt-3"
                style={{
                  color: "rgba(255,185,0,0.4)",
                  fontFamily: "'Cinzel', serif",
                }}
              >
                {t
                  ? "Mutasd a képernyőt a barátodnak"
                  : "Show this screen to your friend"}
              </p>
            </GCard>
          </motion.div>
        </main>

        <div
          className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-3"
          style={{
            background:
              "linear-gradient(to top, rgba(10,4,0,0.95) 0%, transparent 100%)",
          }}
        >
          <PrimaryBtn onClick={() => setView("create-lobby")}>
            {t ? "LOBBY MEGNYITÁSA" : "OPEN LOBBY"}
          </PrimaryBtn>
        </div>
      </div>
    );
  }

  // ══ HOST LOBBY ══
  if (view === "create-lobby" && currentParty) {
    const selGame = GAMES.find((g) => g.id === currentParty.game_type);
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden safe-area-top safe-area-bottom">
        <BG />
        <header className="relative z-10 flex items-center justify-between px-4 pt-5 pb-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{
              background: "rgba(15,6,0,0.55)",
              border: "1px solid rgba(34,197,94,0.3)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Wifi className="w-3.5 h-3.5 text-green-400" />
            <span
              className="text-xs font-bold text-green-400"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              LIVE
            </span>
          </div>
          <ScreenTitle label={currentParty.name.toUpperCase()} />
          <button
            onClick={copyCode}
            className="px-3 py-2 rounded-xl text-xs font-black"
            style={{
              fontFamily: "'Cinzel', serif",
              background: copied ? "rgba(34,197,94,0.1)" : "rgba(15,6,0,0.55)",
              border: `1px solid ${copied ? "rgba(34,197,94,0.35)" : "rgba(255,185,0,0.3)"}`,
              color: copied ? "#4ade80" : "#FFD700",
              backdropFilter: "blur(8px)",
            }}
          >
            {currentParty.code}
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-40 z-10 space-y-4 pt-2">
          {/* Game picker */}
          <GCard>
            <GoldLabel>{t ? "JÁTÉK KIVÁLASZTÁSA" : "SELECT GAME"}</GoldLabel>
            <div
              className="h-px mb-3"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,185,0,0.35), transparent)",
              }}
            />
            <div
              className="flex gap-2 overflow-x-auto pb-1"
              style={{ scrollbarWidth: "none" }}
            >
              {getMultiplayerGames().map((g) => {
                const active = currentParty.game_type === g.id;
                return (
                  <button
                    key={g.id}
                    onClick={() => handleSelectGame(g.id)}
                    className="flex-shrink-0 flex items-center gap-2 py-2 px-3 rounded-2xl text-xs font-black transition-all"
                    style={{
                      fontFamily: "'Cinzel', serif",
                      background: active
                        ? "rgba(255,185,0,0.12)"
                        : "rgba(10,4,0,0.5)",
                      border: `1px solid ${active ? "rgba(255,185,0,0.45)" : "rgba(255,185,0,0.12)"}`,
                      color: active ? "#FFD700" : "rgba(255,185,0,0.45)",
                    }}
                  >
                    <div className="w-5 h-5 rounded overflow-hidden flex-shrink-0">
                      <Image
                        src={g.icon}
                        alt={g.name}
                        width={20}
                        height={20}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    {t ? g.name : g.nameEn}
                  </button>
                );
              })}
            </div>
          </GCard>

          {/* Members */}
          <GCard>
            <GoldLabel>
              {t ? "JÁTÉKOSOK" : "PLAYERS"} ({members.length}/
              {currentParty.max_players})
            </GoldLabel>
            <div
              className="h-px mb-3"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,185,0,0.35), transparent)",
              }}
            />
            <div className="space-y-2">
              {members.map((m) => (
                <MemberRow
                  key={m.id}
                  m={m}
                  isHost={m.user_id === currentParty.host_id}
                  isMe={m.user_id === userId}
                />
              ))}
            </div>
          </GCard>
        </main>

        <div
          className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-3 space-y-2"
          style={{
            background:
              "linear-gradient(to top, rgba(10,4,0,0.95) 0%, transparent 100%)",
          }}
        >
          <p
            className="text-center text-[10px] mb-1"
            style={{
              color: "rgba(255,185,0,0.4)",
              fontFamily: "'Cinzel', serif",
            }}
          >
            {
              members.filter(
                (m) => m.is_ready || m.user_id === currentParty.host_id,
              ).length
            }
            /{members.length} {t ? "játékos kész" : "players ready"}
          </p>
          <PrimaryBtn onClick={handleStartGame} disabled={!canStart}>
            <Play
              className="w-4 h-4"
              style={{ color: canStart ? "#FFD700" : "rgba(255,185,0,0.3)" }}
            />
            {t ? "JÁTÉK INDÍTÁSA" : "START GAME"}
          </PrimaryBtn>
          <OutlineBtn onClick={handleLeaveParty} red>
            {t ? "PARTI FELOSZLATÁSA" : "DISSOLVE PARTY"}
          </OutlineBtn>
        </div>
      </div>
    );
  }

  // ══ JOIN ══
  if (view === "join")
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden safe-area-top safe-area-bottom">
        <BG />
        <header className="relative z-10 flex items-center justify-between px-4 pt-5 pb-3">
          <BackBtn
            onClick={() => {
              setView("menu");
              setJoinCode("");
              setFoundParty(null);
              setError("");
            }}
            label={t ? "Vissza" : "Back"}
          />
          <ScreenTitle label={t ? "CSATLAKOZÁS" : "JOIN PARTY"} />
          <div className="w-20" />
        </header>

        <main className="flex-1 px-4 pb-10 z-10 space-y-4 pt-2">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <GCard className="text-center">
              <GoldLabel>{t ? "KÓD MEGADÁSA" : "ENTER CODE"}</GoldLabel>
              <div
                className="h-px mb-5"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,185,0,0.4), transparent)",
                }}
              />
              <input
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(
                    e.target.value
                      .replace(/[^A-Z0-9]/gi, "")
                      .toUpperCase()
                      .slice(0, 6),
                  );
                  setFoundParty(null);
                  setError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSearchParty()}
                placeholder="ABC123"
                maxLength={6}
                autoFocus
                className="w-full py-3 px-4 text-center text-3xl font-black tracking-[8px] uppercase outline-none rounded-xl mb-4"
                style={{
                  background: "rgba(10,4,0,0.6)",
                  border: "1px solid rgba(255,185,0,0.25)",
                  fontFamily: "'Cinzel', serif",
                  background: "transparent",
                  color: "#FFE566",
                  letterSpacing: "0.4em",
                }}
              />
              {/* Code boxes */}
              <div className="flex gap-2 justify-center mb-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-10 h-12 rounded-xl flex items-center justify-center text-xl font-black transition-all"
                    style={{
                      background: joinCode[i]
                        ? "rgba(255,185,0,0.1)"
                        : "rgba(10,4,0,0.5)",
                      border: `1px solid ${joinCode[i] ? "rgba(255,185,0,0.45)" : "rgba(255,185,0,0.15)"}`,
                      fontFamily: "'Cinzel', serif",
                      color: "#FFE566",
                    }}
                  >
                    {joinCode[i] || ""}
                  </div>
                ))}
              </div>
              <PrimaryBtn
                onClick={handleSearchParty}
                disabled={joinCode.length !== 6 || searching}
              >
                {searching
                  ? t
                    ? "KERESÉS..."
                    : "SEARCHING..."
                  : t
                    ? "PARTI KERESÉSE"
                    : "SEARCH PARTY"}
              </PrimaryBtn>
            </GCard>
          </motion.div>

          {error && (
            <div
              className="p-3 rounded-xl text-sm text-center"
              style={{
                background: "rgba(180,30,30,0.15)",
                border: "1px solid rgba(180,30,30,0.35)",
                color: "#f87171",
              }}
            >
              {error}
            </div>
          )}

          <AnimatePresence>
            {foundParty && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <GCard>
                  <div className="flex items-center gap-2 mb-3">
                    <Check className="w-4 h-4 text-green-400" />
                    <GoldLabel>
                      {t ? "PARTI MEGTALÁLVA" : "PARTY FOUND"}
                    </GoldLabel>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    {(() => {
                      const g = GAMES.find(
                        (gm) => gm.id === foundParty.game_type,
                      );
                      return g ? (
                        <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                          <Image
                            src={g.icon}
                            alt={g.name}
                            width={48}
                            height={48}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : null;
                    })()}
                    <div>
                      <p
                        className="font-black text-sm"
                        style={{
                          fontFamily: "'Cinzel', serif",
                          color: "#FFE566",
                        }}
                      >
                        {foundParty.name}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: "rgba(255,185,0,0.5)" }}
                      >
                        {GAMES.find((gm) => gm.id === foundParty.game_type)?.[
                          t ? "name" : "nameEn"
                        ] || foundParty.game_type}
                      </p>
                    </div>
                  </div>
                  <PrimaryBtn onClick={handleJoinParty} disabled={loading}>
                    {loading
                      ? t
                        ? "CSATLAKOZÁS..."
                        : "JOINING..."
                      : t
                        ? "BELÉPÉS A PARTIBA!"
                        : "JOIN PARTY!"}
                  </PrimaryBtn>
                </GCard>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    );

  // ══ GUEST LOBBY ══
  if (view === "guest-lobby" && currentParty) {
    const selGame = GAMES.find((g) => g.id === currentParty.game_type);
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden safe-area-top safe-area-bottom">
        <BG />
        <header className="relative z-10 flex items-center justify-between px-4 pt-5 pb-3">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{
              background: "rgba(15,6,0,0.55)",
              border: "1px solid rgba(34,197,94,0.3)",
              backdropFilter: "blur(8px)",
            }}
          >
            <Wifi className="w-3.5 h-3.5 text-green-400" />
            <span
              className="text-xs font-bold text-green-400"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              {t ? "CSATLAKOZVA" : "CONNECTED"}
            </span>
          </div>
          <ScreenTitle label={currentParty.name.toUpperCase()} />
          <div className="w-20" />
        </header>

        <main className="flex-1 overflow-y-auto px-4 pb-40 z-10 space-y-4 pt-2">
          {/* Game info */}
          <GCard>
            <div className="flex items-center gap-3">
              {selGame && (
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                  <Image
                    src={selGame.icon}
                    alt={selGame.name}
                    width={40}
                    height={40}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div>
                <p
                  className="text-xs font-black tracking-wider"
                  style={{
                    fontFamily: "'Cinzel', serif",
                    color: "rgba(255,185,0,0.5)",
                  }}
                >
                  {t ? "JÁTÉK" : "GAME"}
                </p>
                <p className="text-sm font-bold" style={{ color: "#FFE566" }}>
                  {selGame ? (t ? selGame.name : selGame.nameEn) : ""}
                </p>
              </div>
              <div className="ml-auto text-right">
                <p
                  className="text-[10px]"
                  style={{
                    color: "rgba(255,185,0,0.4)",
                    fontFamily: "'Cinzel', serif",
                  }}
                >
                  KÓD
                </p>
                <p
                  className="text-sm font-black"
                  style={{ fontFamily: "'Cinzel', serif", color: "#FFD700" }}
                >
                  {currentParty.code}
                </p>
              </div>
            </div>
          </GCard>

          {/* Members */}
          <GCard>
            <GoldLabel>
              {t ? "JÁTÉKOSOK" : "PLAYERS"} ({members.length})
            </GoldLabel>
            <div
              className="h-px mb-3"
              style={{
                background:
                  "linear-gradient(90deg, rgba(255,185,0,0.35), transparent)",
              }}
            />
            <div className="space-y-2">
              {members.map((m) => (
                <MemberRow
                  key={m.id}
                  m={m}
                  isHost={m.user_id === currentParty.host_id}
                  isMe={m.user_id === userId}
                />
              ))}
            </div>
          </GCard>

          {/* Waiting */}
          <GCard className="text-center">
            <RefreshCw
              className="w-6 h-6 mx-auto mb-2 animate-spin"
              style={{ color: "rgba(255,185,0,0.4)", animationDuration: "3s" }}
            />
            <p
              className="text-xs"
              style={{
                color: "rgba(255,185,0,0.5)",
                fontFamily: "'Cinzel', serif",
              }}
            >
              {t ? "VÁRD MEG A HOST INDÍTÁSÁT" : "WAITING FOR HOST TO START"}
            </p>
          </GCard>
        </main>

        <div
          className="fixed bottom-0 left-0 right-0 z-20 px-4 pb-6 pt-3 space-y-2"
          style={{
            background:
              "linear-gradient(to top, rgba(10,4,0,0.95) 0%, transparent 100%)",
          }}
        >
          <PrimaryBtn onClick={handleToggleReady}>
            {isReady ? (
              <>
                <Check className="w-4 h-4" style={{ color: "#4ade80" }} />
                {t ? "KÉSZ VAGYOK!" : "I'M READY!"}
              </>
            ) : t ? (
              "KÉSZ VAGYOK"
            ) : (
              "READY"
            )}
          </PrimaryBtn>
          <OutlineBtn onClick={handleLeaveParty} red>
            {t ? "KILÉPÉS A PARTIBÓL" : "LEAVE PARTY"}
          </OutlineBtn>
        </div>
      </div>
    );
  }

  return null;
}
