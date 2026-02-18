"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Language } from "@/lib/game-types";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  LogOut,
  User,
  Users,
  UserPlus,
  Check,
  X,
  Search,
  Trash2,
  Settings,
  Camera,
  MessageCircle,
  Send,
} from "lucide-react";

interface ProfileScreenProps {
  onBack: () => void;
  onLogout: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  userId: string;
}
interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
}
interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: "pending" | "accepted";
  profiles?: Profile;
}
interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  sender?: Profile;
}

// ── Shared Layout Shell ──
function Shell({
  children,
  header,
}: {
  children: React.ReactNode;
  header: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden safe-area-top safe-area-bottom">
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
      <div
        className="fixed inset-0 z-[1] pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px",
        }}
      />
      <header className="relative z-10 flex items-center justify-between px-4 pt-5 pb-3">
        {header}
      </header>
      <main className="flex-1 overflow-y-auto px-4 pb-8 z-10">
        <div className="max-w-md mx-auto">{children}</div>
      </main>
    </div>
  );
}

// ── Shared: Screen title ──
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

// ── Shared: Back button ──
function BackBtn({ onClick, label }: { onClick: () => void; label: string }) {
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

// ── Shared: Glass card ──
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

// ── Shared: Gold divider ──
function GoldDivider() {
  return (
    <div
      className="h-px my-1"
      style={{
        background:
          "linear-gradient(90deg, transparent, rgba(255,185,0,0.35), transparent)",
      }}
    />
  );
}

// ── Shared: Avatar circle ──
function AvatarCircle({
  avatarUrl,
  username,
  size = 40,
}: {
  avatarUrl?: string;
  username?: string;
  size?: number;
}) {
  return (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
      style={{
        width: size,
        height: size,
        background: "rgba(10,4,0,0.7)",
        border: "1px solid rgba(255,185,0,0.4)",
      }}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={username || ""}
          width={size}
          height={size}
          className="object-cover w-full h-full"
        />
      ) : (
        <User
          className="text-[#FFD700]"
          style={{ width: size * 0.45, height: size * 0.45 }}
        />
      )}
    </div>
  );
}

// ── Shared: Gold label ──
function GoldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs font-black tracking-widest mb-2"
      style={{
        fontFamily: "'Cinzel', serif",
        background: "linear-gradient(90deg, #FFE566, #FFB300)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
      }}
    >
      {children}
    </p>
  );
}

// ── Shared: Action row button ──
function ActionRow({
  icon,
  label,
  right,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  right?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between p-4 rounded-2xl transition-all active:scale-[0.98] group"
      style={{
        background: "rgba(15,6,0,0.55)",
        border: "1px solid rgba(255,185,0,0.2)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: "rgba(255,185,0,0.1)",
            border: "1px solid rgba(255,185,0,0.2)",
          }}
        >
          {icon}
        </div>
        <span
          className="font-bold text-sm text-[#FFE8A0]"
          style={{ fontFamily: "'Cinzel', serif" }}
        >
          {label}
        </span>
      </div>
      {right}
    </button>
  );
}

// ── Main component ──
export function ProfileScreen({
  onBack,
  onLogout,
  language,
  setLanguage,
  userId,
}: ProfileScreenProps) {
  const [view, setView] = useState<
    "profile" | "friends" | "add-friend" | "messages" | "chat"
  >("profile");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friendship[]>([]);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedFriend, setSelectedFriend] = useState<Profile | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    loadProfile();
    loadFriends();
    loadMessages();
  }, [userId]);

  useEffect(() => {
    const channel = supabase
      .channel("messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${userId}`,
        },
        () => {
          loadMessages();
          if (selectedFriend) loadChatMessages(selectedFriend.id);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, selectedFriend]);

  const loadProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url, language")
      .eq("id", userId)
      .single();
    if (data) {
      setUsername(data.username);
      setAvatarUrl(data.avatar_url);
      if (data.language) setLanguage(data.language as Language);
    }
  };
  const loadFriends = async () => {
    const { data: a } = await supabase
      .from("friendships")
      .select(
        `id,user_id,friend_id,status,profiles:friend_id(id,username,avatar_url)`,
      )
      .eq("user_id", userId)
      .eq("status", "accepted");
    const { data: b } = await supabase
      .from("friendships")
      .select(
        `id,user_id,friend_id,status,profiles:user_id(id,username,avatar_url)`,
      )
      .eq("friend_id", userId)
      .eq("status", "accepted");
    setFriends([...(a || []), ...(b || [])]);
    const { data: p } = await supabase
      .from("friendships")
      .select(
        `id,user_id,friend_id,status,profiles:user_id(id,username,avatar_url)`,
      )
      .eq("friend_id", userId)
      .eq("status", "pending");
    setPendingRequests(p || []);
  };
  const loadMessages = async () => {
    const { data } = await supabase
      .from("messages")
      .select(
        `id,sender_id,receiver_id,message,created_at,sender:profiles!messages_sender_id_fkey(id,username,avatar_url)`,
      )
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });
    setMessages(data || []);
  };
  const loadChatMessages = async (friendId: string) => {
    const { data } = await supabase
      .from("messages")
      .select(
        `id,sender_id,receiver_id,message,created_at,sender:profiles!messages_sender_id_fkey(id,username,avatar_url)`,
      )
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${userId})`,
      )
      .order("created_at", { ascending: true });
    setChatMessages(data || []);
  };
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert(language === "hu" ? "Max 2MB!" : "Max 2MB!");
      return;
    }
    setUploading(true);
    try {
      const fileName = `${userId}-${Date.now()}.${file.name.split(".").pop()}`;
      const { error: ue } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });
      if (ue) throw ue;
      const { data: ud } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);
      await supabase
        .from("profiles")
        .update({ avatar_url: ud.publicUrl })
        .eq("id", userId);
      setAvatarUrl(ud.publicUrl);
    } catch (e) {
      console.error(e);
    } finally {
      setUploading(false);
    }
  };
  const handleUpdateLanguage = async (l: Language) => {
    await supabase.from("profiles").update({ language: l }).eq("id", userId);
    setLanguage(l);
  };
  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("id,username,avatar_url")
      .ilike("username", `%${searchQuery}%`)
      .neq("id", userId)
      .limit(10);
    setSearchResults(data || []);
    setLoading(false);
  };
  const handleSendFriendRequest = async (fid: string) => {
    const { data: ex } = await supabase
      .from("friendships")
      .select()
      .or(
        `and(user_id.eq.${userId},friend_id.eq.${fid}),and(user_id.eq.${fid},friend_id.eq.${userId})`,
      )
      .single();
    if (ex) {
      alert(language === "hu" ? "Már ismerősök!" : "Already friends!");
      return;
    }
    await supabase
      .from("friendships")
      .insert({ user_id: userId, friend_id: fid, status: "pending" });
    setSearchQuery("");
    setSearchResults([]);
  };
  const handleAcceptRequest = async (id: string) => {
    await supabase
      .from("friendships")
      .update({ status: "accepted" })
      .eq("id", id);
    await loadFriends();
  };
  const handleRejectRequest = async (id: string) => {
    await supabase.from("friendships").delete().eq("id", id);
    await loadFriends();
  };
  const handleRemoveFriend = async (id: string) => {
    await supabase.from("friendships").delete().eq("id", id);
    await loadFriends();
  };
  const handleOpenChat = (f: Profile) => {
    setSelectedFriend(f);
    loadChatMessages(f.id);
    setView("chat");
  };
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedFriend) return;
    const { error } = await supabase
      .from("messages")
      .insert({
        sender_id: userId,
        receiver_id: selectedFriend.id,
        message: newMessage.trim(),
      });
    if (!error) {
      setNewMessage("");
      await loadChatMessages(selectedFriend.id);
    }
  };

  const hu = language === "hu";

  // ══ PROFILE VIEW ══
  if (view === "profile")
    return (
      <Shell
        header={
          <>
            <BackBtn onClick={onBack} label={hu ? "Vissza" : "Back"} />
            <ScreenTitle label={hu ? "PROFIL" : "PROFILE"} />
            <div className="w-20" />
          </>
        }
      >
        <motion.div
          className="space-y-4 pt-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          {/* Avatar */}
          <div className="flex flex-col items-center pt-2 pb-2">
            <div className="relative mb-3">
              <div className="absolute inset-0 rounded-full bg-[#FFB300]/20 blur-2xl scale-150 pointer-events-none" />
              <div
                className="relative w-28 h-28 rounded-full overflow-hidden"
                style={{
                  border: "2px solid rgba(255,185,0,0.5)",
                  boxShadow: "0 0 24px rgba(255,160,0,0.25)",
                }}
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={username}
                    width={112}
                    height={112}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: "rgba(10,4,0,0.8)" }}
                  >
                    <User className="w-12 h-12 text-[#FFD700]" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full flex items-center justify-center transition-all"
                style={{
                  background:
                    "linear-gradient(180deg, #FFE566 0%, #FFB300 60%, #CC8800 100%)",
                  border: "2px solid rgba(10,4,0,0.8)",
                }}
              >
                {uploading ? (
                  <div
                    className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                    style={{
                      borderColor: "rgba(20,8,0,0.7)",
                      borderTopColor: "transparent",
                    }}
                  />
                ) : (
                  <Camera className="w-4 h-4 text-[#1a0800]" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <h2
              className="text-xl font-black tracking-wider"
              style={{
                fontFamily: "'Cinzel', serif",
                background:
                  "linear-gradient(180deg, #FFE566 0%, #FFB300 60%, #CC8800 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {username}
            </h2>
            <span
              className="text-[10px] tracking-[0.35em] mt-1"
              style={{
                color: "rgba(255,185,0,0.45)",
                fontFamily: "'Cinzel', serif",
              }}
            >
              {hu ? "AKTÍV FELHASZNÁLÓ" : "ACTIVE USER"}
            </span>
          </div>

          <GoldDivider />

          {/* Action rows */}
          <div className="space-y-2.5">
            <ActionRow
              icon={<Users className="w-4 h-4 text-[#FFD700]" />}
              label={hu ? "Ismerősök" : "Friends"}
              onClick={() => setView("friends")}
              right={
                <div className="flex items-center gap-2">
                  {pendingRequests.length > 0 && (
                    <span
                      className="text-xs font-black px-2 py-0.5 rounded-full"
                      style={{
                        background: "rgba(180,30,30,0.25)",
                        border: "1px solid rgba(180,30,30,0.4)",
                        color: "#f87171",
                        fontFamily: "'Cinzel', serif",
                      }}
                    >
                      {pendingRequests.length}
                    </span>
                  )}
                  <span
                    className="text-sm font-black text-[#FFD700]"
                    style={{ fontFamily: "'Cinzel', serif" }}
                  >
                    {friends.length}
                  </span>
                </div>
              }
            />
            <ActionRow
              icon={<MessageCircle className="w-4 h-4 text-[#FFD700]" />}
              label={hu ? "Üzenetek" : "Messages"}
              onClick={() => setView("messages")}
              right={
                <span
                  className="text-sm font-black text-[#FFD700]"
                  style={{ fontFamily: "'Cinzel', serif" }}
                >
                  {messages.length}
                </span>
              }
            />
          </div>

          {/* Language */}
          <GCard>
            <div className="flex items-center gap-2 mb-3">
              <Settings className="w-4 h-4 text-[#FFD700]" />
              <GoldLabel>{hu ? "NYELV" : "LANGUAGE"}</GoldLabel>
            </div>
            <GoldDivider />
            <div className="flex gap-2 mt-3">
              {(["hu", "en"] as Language[]).map((l) => (
                <button
                  key={l}
                  onClick={() => handleUpdateLanguage(l)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-black tracking-wider transition-all"
                  style={{
                    fontFamily: "'Cinzel', serif",
                    ...(language === l
                      ? {
                          background:
                            "linear-gradient(180deg, #FFE566 0%, #FFB300 60%, #CC8800 100%)",
                          color: "#1a0800",
                          border: "1px solid #FFD700",
                        }
                      : {
                          background: "rgba(10,4,0,0.5)",
                          color: "rgba(255,185,0,0.55)",
                          border: "1px solid rgba(255,185,0,0.2)",
                        }),
                  }}
                >
                  {l === "hu" ? "🇭🇺 Magyar" : "🇬🇧 English"}
                </button>
              ))}
            </div>
          </GCard>

          {/* Logout */}
          <button
            onClick={onLogout}
            className="w-full py-[13px] flex items-center justify-center gap-2 rounded-xl transition-all"
            style={{
              background: "rgba(180,30,30,0.1)",
              border: "1px solid rgba(180,30,30,0.35)",
              backdropFilter: "blur(8px)",
            }}
          >
            <LogOut className="w-4 h-4 text-red-400" />
            <span
              className="text-sm font-black tracking-widest text-red-400"
              style={{ fontFamily: "'Cinzel', serif" }}
            >
              {hu ? "KIJELENTKEZÉS" : "LOGOUT"}
            </span>
          </button>
        </motion.div>
      </Shell>
    );

  // ══ FRIENDS VIEW ══
  if (view === "friends")
    return (
      <Shell
        header={
          <>
            <BackBtn
              onClick={() => setView("profile")}
              label={hu ? "Vissza" : "Back"}
            />
            <ScreenTitle label={hu ? "ISMERŐSÖK" : "FRIENDS"} />
            <button
              onClick={() => setView("add-friend")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl z-10"
              style={{
                background: "rgba(15,6,0,0.55)",
                border: "1px solid rgba(255,185,0,0.3)",
                backdropFilter: "blur(8px)",
              }}
            >
              <UserPlus className="w-4 h-4 text-[#FFD700]" />
            </button>
          </>
        }
      >
        <motion.div
          className="space-y-4 pt-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Pending requests */}
          {pendingRequests.length > 0 && (
            <GCard>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className="text-xs font-black px-2 py-0.5 rounded-full"
                  style={{
                    background: "rgba(180,30,30,0.25)",
                    border: "1px solid rgba(180,30,30,0.4)",
                    color: "#f87171",
                    fontFamily: "'Cinzel', serif",
                  }}
                >
                  {pendingRequests.length}
                </span>
                <GoldLabel>
                  {hu ? "FÜGGŐ KÉRÉSEK" : "PENDING REQUESTS"}
                </GoldLabel>
              </div>
              <GoldDivider />
              <div className="space-y-2 mt-3">
                {pendingRequests.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-1"
                  >
                    <div className="flex items-center gap-3">
                      <AvatarCircle
                        avatarUrl={r.profiles?.avatar_url}
                        username={r.profiles?.username}
                        size={38}
                      />
                      <span className="text-sm font-bold text-[#FFE8A0]">
                        {r.profiles?.username || "Unknown"}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptRequest(r.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{
                          background: "rgba(34,197,94,0.15)",
                          border: "1px solid rgba(34,197,94,0.3)",
                        }}
                      >
                        <Check className="w-4 h-4 text-green-400" />
                      </button>
                      <button
                        onClick={() => handleRejectRequest(r.id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{
                          background: "rgba(180,30,30,0.15)",
                          border: "1px solid rgba(180,30,30,0.3)",
                        }}
                      >
                        <X className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </GCard>
          )}

          {/* Friends list */}
          <GCard>
            <GoldLabel>
              {hu ? "ISMERŐSÖK" : "FRIENDS"} ({friends.length})
            </GoldLabel>
            <GoldDivider />
            {friends.length === 0 ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <Users className="w-10 h-10 text-[#FFD700] opacity-30" />
                <p
                  className="text-xs"
                  style={{
                    color: "rgba(255,185,0,0.4)",
                    fontFamily: "'Cinzel', serif",
                  }}
                >
                  {hu ? "Még nincs ismerősöd" : "No friends yet"}
                </p>
                <button
                  onClick={() => setView("add-friend")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
                  style={{
                    fontFamily: "'Cinzel', serif",
                    color: "#FFD700",
                    background: "rgba(255,185,0,0.08)",
                    border: "1px dashed rgba(255,185,0,0.3)",
                  }}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {hu ? "Ismerős hozzáadása" : "Add friend"}
                </button>
              </div>
            ) : (
              <div className="space-y-2 mt-3">
                {friends.map((f) => {
                  const fp = f.profiles;
                  return (
                    <div
                      key={f.id}
                      className="flex items-center justify-between py-1"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <AvatarCircle
                          avatarUrl={fp?.avatar_url}
                          username={fp?.username}
                          size={38}
                        />
                        <span className="text-sm font-bold text-[#FFE8A0]">
                          {fp?.username || "Unknown"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => fp && handleOpenChat(fp)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{
                            background: "rgba(255,185,0,0.1)",
                            border: "1px solid rgba(255,185,0,0.25)",
                          }}
                        >
                          <MessageCircle className="w-4 h-4 text-[#FFD700]" />
                        </button>
                        <button
                          onClick={() => handleRemoveFriend(f.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{
                            background: "rgba(180,30,30,0.15)",
                            border: "1px solid rgba(180,30,30,0.3)",
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GCard>
        </motion.div>
      </Shell>
    );

  // ══ ADD FRIEND VIEW ══
  if (view === "add-friend")
    return (
      <Shell
        header={
          <>
            <BackBtn
              onClick={() => setView("friends")}
              label={hu ? "Vissza" : "Back"}
            />
            <ScreenTitle label={hu ? "KERESÉS" : "SEARCH"} />
            <div className="w-20" />
          </>
        }
      >
        <motion.div
          className="space-y-4 pt-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Search bar */}
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearchUsers()}
              placeholder={
                hu
                  ? "Keress felhasználónév alapján..."
                  : "Search by username..."
              }
              className="flex-1 h-11 text-sm"
              style={{
                background: "rgba(10,4,0,0.6)",
                border: "1px solid rgba(255,185,0,0.25)",
                borderRadius: "10px",
                color: "#FFE566",
              }}
            />
            <button
              onClick={handleSearchUsers}
              disabled={loading || !searchQuery.trim()}
              className="px-4 rounded-xl flex items-center justify-center transition-all"
              style={{
                background: "linear-gradient(180deg, #1a0a00 0%, #0d0500 100%)",
                border: "1px solid rgba(255,185,0,0.5)",
                boxShadow: "0 0 12px rgba(255,160,0,0.15)",
              }}
            >
              <Search className="w-5 h-5 text-[#FFD700]" />
            </button>
          </div>

          {/* Results */}
          <AnimatePresence>
            {searchResults.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <GCard>
                  <GoldLabel>{hu ? "TALÁLATOK" : "RESULTS"}</GoldLabel>
                  <GoldDivider />
                  <div className="space-y-2 mt-3">
                    {searchResults.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between py-1"
                      >
                        <div className="flex items-center gap-3">
                          <AvatarCircle
                            avatarUrl={u.avatar_url}
                            username={u.username}
                            size={38}
                          />
                          <span className="text-sm font-bold text-[#FFE8A0]">
                            {u.username}
                          </span>
                        </div>
                        <button
                          onClick={() => handleSendFriendRequest(u.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold"
                          style={{
                            fontFamily: "'Cinzel', serif",
                            color: "#FFD700",
                            background: "rgba(255,185,0,0.08)",
                            border: "1px solid rgba(255,185,0,0.25)",
                          }}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          {hu ? "Hozzáadás" : "Add"}
                        </button>
                      </div>
                    ))}
                  </div>
                </GCard>
              </motion.div>
            )}
            {searchQuery.trim() && searchResults.length === 0 && !loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <GCard>
                  <p
                    className="text-center text-xs py-4"
                    style={{
                      color: "rgba(255,185,0,0.4)",
                      fontFamily: "'Cinzel', serif",
                    }}
                  >
                    {hu ? "Nincs találat" : "No results"}
                  </p>
                </GCard>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </Shell>
    );

  // ══ MESSAGES VIEW ══
  if (view === "messages") {
    const byFriend = messages.reduce(
      (acc, msg) => {
        const fid = msg.sender_id === userId ? msg.receiver_id : msg.sender_id;
        if (!acc[fid]) acc[fid] = [];
        acc[fid].push(msg);
        return acc;
      },
      {} as { [k: string]: Message[] },
    );

    return (
      <Shell
        header={
          <>
            <BackBtn
              onClick={() => setView("profile")}
              label={hu ? "Vissza" : "Back"}
            />
            <ScreenTitle label={hu ? "ÜZENETEK" : "MESSAGES"} />
            <div className="w-20" />
          </>
        }
      >
        <motion.div
          className="space-y-2.5 pt-2"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {Object.entries(byFriend).map(([fid, msgs]) => {
            const last = msgs[0];
            const friend =
              last.sender_id === userId ? { id: fid } : last.sender;
            return (
              <button
                key={fid}
                onClick={() => friend && handleOpenChat(friend as Profile)}
                className="w-full text-left active:scale-[0.98] transition-all"
              >
                <GCard className="flex items-center gap-3">
                  <AvatarCircle
                    avatarUrl={
                      "avatar_url" in (friend || {})
                        ? (friend as Profile).avatar_url
                        : undefined
                    }
                    username={
                      "username" in (friend || {})
                        ? (friend as Profile).username
                        : undefined
                    }
                    size={44}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-[#FFE8A0]">
                      {"username" in (friend || {})
                        ? (friend as Profile).username
                        : "Unknown"}
                    </p>
                    <p
                      className="text-xs truncate mt-0.5"
                      style={{ color: "rgba(255,220,150,0.5)" }}
                    >
                      {last.message}
                    </p>
                  </div>
                  <MessageCircle className="w-4 h-4 text-[#FFD700] opacity-60 flex-shrink-0" />
                </GCard>
              </button>
            );
          })}
          {Object.keys(byFriend).length === 0 && (
            <GCard>
              <div className="flex flex-col items-center py-6 gap-3">
                <MessageCircle className="w-10 h-10 text-[#FFD700] opacity-30" />
                <p
                  className="text-xs"
                  style={{
                    color: "rgba(255,185,0,0.4)",
                    fontFamily: "'Cinzel', serif",
                  }}
                >
                  {hu ? "Nincs még üzeneted" : "No messages yet"}
                </p>
              </div>
            </GCard>
          )}
        </motion.div>
      </Shell>
    );
  }

  // ══ CHAT VIEW ══
  if (view === "chat" && selectedFriend)
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden safe-area-top safe-area-bottom">
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

        {/* Header */}
        <header className="relative z-10 flex items-center justify-between px-4 pt-5 pb-3">
          <BackBtn
            onClick={() => setView("messages")}
            label={hu ? "Vissza" : "Back"}
          />
          <div className="flex items-center gap-2 absolute left-1/2 -translate-x-1/2">
            <AvatarCircle
              avatarUrl={selectedFriend.avatar_url}
              username={selectedFriend.username}
              size={28}
            />
            <span
              className="text-sm font-black tracking-wider"
              style={{
                fontFamily: "'Cinzel', serif",
                background: "linear-gradient(180deg, #FFE566, #FFB300)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              {selectedFriend.username}
            </span>
          </div>
          <div className="w-20" />
        </header>

        {/* Messages */}
        <main className="flex-1 overflow-y-auto px-4 py-3 z-10">
          <div className="max-w-md mx-auto space-y-3 pb-4">
            {chatMessages.map((msg) => {
              const isMe = msg.sender_id === userId;
              return (
                <div
                  key={msg.id}
                  className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className="max-w-[75%] px-4 py-2.5 rounded-2xl"
                    style={
                      isMe
                        ? {
                            background:
                              "linear-gradient(135deg, #FFE566, #FFB300)",
                            borderBottomRightRadius: 4,
                          }
                        : {
                            background: "rgba(15,6,0,0.7)",
                            border: "1px solid rgba(255,185,0,0.2)",
                            backdropFilter: "blur(10px)",
                            borderBottomLeftRadius: 4,
                          }
                    }
                  >
                    <p
                      className="text-sm"
                      style={{ color: isMe ? "#1a0800" : "#FFE8A0" }}
                    >
                      {msg.message}
                    </p>
                    <p
                      className="text-[10px] mt-1"
                      style={{
                        color: isMe
                          ? "rgba(26,8,0,0.55)"
                          : "rgba(255,185,0,0.4)",
                      }}
                    >
                      {new Date(msg.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </main>

        {/* Input */}
        <div
          className="relative z-10 px-4 pb-6 pt-2"
          style={{
            background:
              "linear-gradient(to top, rgba(10,4,0,0.95) 0%, transparent 100%)",
          }}
        >
          <div className="flex gap-2 max-w-md mx-auto">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              placeholder={hu ? "Írj üzenetet..." : "Type a message..."}
              className="flex-1 h-11 text-sm"
              style={{
                background: "rgba(10,4,0,0.6)",
                border: "1px solid rgba(255,185,0,0.25)",
                borderRadius: "10px",
                color: "#FFE566",
              }}
            />
            <button
              onClick={handleSendMessage}
              disabled={!newMessage.trim()}
              className="px-4 rounded-xl flex items-center justify-center transition-all"
              style={{
                background: newMessage.trim()
                  ? "linear-gradient(180deg, #1a0a00 0%, #0d0500 100%)"
                  : "rgba(15,6,0,0.4)",
                border: `1px solid ${newMessage.trim() ? "rgba(255,185,0,0.55)" : "rgba(255,185,0,0.15)"}`,
              }}
            >
              <Send
                className="w-5 h-5"
                style={{
                  color: newMessage.trim() ? "#FFD700" : "rgba(255,185,0,0.3)",
                }}
              />
            </button>
          </div>
        </div>
      </div>
    );

  return null;
}
