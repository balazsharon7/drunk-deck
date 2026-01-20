"use client";

import React from "react"

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import {
  ArrowLeft,
  Camera,
  Crown,
  LogOut,
  User,
  Settings,
  Star,
  Check,
} from "lucide-react";

interface ProfileScreenProps {
  onBack: () => void;
  onLogout: () => void;
  language: "hu" | "en";
  setLanguage: (lang: "hu" | "en") => void;
  userId: string;
}

const t = {
  hu: {
    profile: "Profil",
    username: "Felhasználónév",
    email: "Email",
    language: "Nyelv",
    hungarian: "Magyar",
    english: "Angol",
    premium: "Prémium",
    premiumDesc: "Korlátlan játékok, exkluzív módok, reklámok nélkül",
    subscribe: "Előfizetés",
    subscribed: "Aktív előfizetés",
    validUntil: "Érvényes:",
    logout: "Kijelentkezés",
    save: "Mentés",
    saved: "Mentve!",
    uploadPhoto: "Fotó feltöltése",
    monthlyPrice: "990 Ft / hó",
    yearlyPrice: "9 990 Ft / év",
    comingSoon: "Hamarosan...",
    stats: "Statisztikák",
    gamesPlayed: "Játszott játékok",
    partiesJoined: "Partik",
    friendsCount: "Barátok",
  },
  en: {
    profile: "Profile",
    username: "Username",
    email: "Email",
    language: "Language",
    hungarian: "Hungarian",
    english: "English",
    premium: "Premium",
    premiumDesc: "Unlimited games, exclusive modes, ad-free",
    subscribe: "Subscribe",
    subscribed: "Active subscription",
    validUntil: "Valid until:",
    logout: "Logout",
    save: "Save",
    saved: "Saved!",
    uploadPhoto: "Upload photo",
    monthlyPrice: "$4.99 / month",
    yearlyPrice: "$49.99 / year",
    comingSoon: "Coming soon...",
    stats: "Statistics",
    gamesPlayed: "Games played",
    partiesJoined: "Parties",
    friendsCount: "Friends",
  },
};

interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  language: string;
  is_premium: boolean;
  premium_until: string | null;
}

export function ProfileScreen({
  onBack,
  onLogout,
  language,
  setLanguage,
  userId,
}: ProfileScreenProps) {
  const texts = t[language];
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      
      // Get user email
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setEmail(user.email);
      }

      // Get profile
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (data) {
        setProfile(data);
        setUsername(data.username || "");
        setAvatarUrl(data.avatar_url);
        if (data.language) {
          setLanguage(data.language as "hu" | "en");
        }
      }
      setLoading(false);
    }

    loadProfile();
  }, [userId, supabase, setLanguage]);

  const handleSave = async () => {
    setSaving(true);
    
    const { error } = await supabase
      .from("profiles")
      .update({
        username,
        language,
        avatar_url: avatarUrl,
      })
      .eq("id", userId);

    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(fileName, file, { upsert: true });

    if (!uploadError) {
      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);
      
      setAvatarUrl(data.publicUrl);
    }
    setUploading(false);
  };

  const handleLanguageChange = (lang: "hu" | "en") => {
    setLanguage(lang);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border p-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-amber-400">{texts.profile}</h1>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-lg mx-auto">
        {/* Avatar & Username */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              {/* Avatar */}
              <div className="relative w-28 h-28">
                <div className="w-28 h-28 rounded-full bg-zinc-800 border-3 border-amber-500/50 overflow-hidden flex items-center justify-center shadow-lg shadow-amber-500/20">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl || "/placeholder.svg"}
                      alt="Avatar"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <User className="w-14 h-14 text-zinc-500" />
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-1 right-1 w-9 h-9 bg-amber-500 rounded-full flex items-center justify-center hover:bg-amber-600 transition-colors shadow-lg border-2 border-background"
                >
                  {uploading ? (
                    <div className="animate-spin w-4 h-4 border-2 border-black border-t-transparent rounded-full" />
                  ) : (
                    <Camera className="w-4 h-4 text-black" />
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

              {/* Username Input */}
              <div className="w-full space-y-2">
                <Label htmlFor="username">{texts.username}</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-zinc-800 border-zinc-700"
                  placeholder={texts.username}
                />
              </div>

              {/* Email (read-only) */}
              <div className="w-full space-y-2">
                <Label htmlFor="email">{texts.email}</Label>
                <Input
                  id="email"
                  value={email}
                  disabled
                  className="bg-zinc-800/50 border-zinc-700 text-muted-foreground"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Language Settings */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings className="w-4 h-4" />
              {texts.language}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={language === "hu" ? "default" : "outline"}
                onClick={() => handleLanguageChange("hu")}
                className={`flex-1 ${language === "hu" ? "bg-amber-500 hover:bg-amber-600 text-black" : ""}`}
              >
                🇭🇺 {texts.hungarian}
              </Button>
              <Button
                variant={language === "en" ? "default" : "outline"}
                onClick={() => handleLanguageChange("en")}
                className={`flex-1 ${language === "en" ? "bg-amber-500 hover:bg-amber-600 text-black" : ""}`}
              >
                🇬🇧 {texts.english}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Premium Section */}
        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-400">
              <Crown className="w-5 h-5" />
              {texts.premium}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{texts.premiumDesc}</p>

            {profile?.is_premium ? (
              <div className="flex items-center gap-2 text-green-400">
                <Check className="w-5 h-5" />
                <span>{texts.subscribed}</span>
                {profile.premium_until && (
                  <span className="text-xs text-muted-foreground ml-auto">
                    {texts.validUntil} {new Date(profile.premium_until).toLocaleDateString()}
                  </span>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Button
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold"
                  disabled
                >
                  <Star className="w-4 h-4 mr-2" />
                  {texts.subscribe} - {texts.comingSoon}
                </Button>
                <div className="flex justify-center gap-4 text-xs text-muted-foreground">
                  <span>{texts.monthlyPrice}</span>
                  <span>•</span>
                  <span>{texts.yearlyPrice}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
        >
          {saving ? (
            <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full" />
          ) : saved ? (
            <>
              <Check className="w-5 h-5 mr-2" />
              {texts.saved}
            </>
          ) : (
            texts.save
          )}
        </Button>

        {/* Logout Button */}
        <Button
          variant="outline"
          onClick={onLogout}
          className="w-full h-12 border-red-500/50 text-red-400 hover:bg-red-500/10 hover:text-red-300 bg-transparent"
        >
          <LogOut className="w-5 h-5 mr-2" />
          {texts.logout}
        </Button>
      </div>
    </div>
  );
}
