"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { AuthForm } from "@/components/auth-form";
import { Wifi, WifiOff } from "lucide-react";

interface WelcomeScreenProps {
  onContinueOffline: () => void;
  onLoginSuccess: () => void;
  language: "hu" | "en";
  setLanguage: (lang: "hu" | "en") => void;
}

const t = {
  hu: {
    welcome: "Drunk Deck",
    subtitle: "A legjobb ivós kártyajáték alkalmazás",
    loginBtn: "Bejelentkezés",
    offlineBtn: "Játék bejelentkezés nélkül",
    offlineNote: "Offline módban csak helyi játék érhető el",
    onlineNote: "Partik, barátok és online játék",
  },
  en: {
    welcome: "Drunk Deck",
    subtitle: "The ultimate drinking card game app",
    loginBtn: "Login / Register",
    offlineBtn: "Play without login",
    offlineNote: "In offline mode only local games are available",
    onlineNote: "Parties, friends and online play",
  },
};

export function WelcomeScreen({
  onContinueOffline,
  onLoginSuccess,
  language,
  setLanguage,
}: WelcomeScreenProps) {
  const [showAuth, setShowAuth] = useState(false);
  const texts = t[language];

  if (showAuth) {
    return (
      <AuthForm
        onSuccess={onLoginSuccess}
        onBack={() => setShowAuth(false)}
        language={language}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6 py-12 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-amber-600/5 rounded-full blur-3xl" />
      </div>


      {/* Main content */}
      <div className="flex flex-col items-center text-center z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="relative w-44 h-44 mb-4">
          <Image
            src="/logo.png"
            alt="Drunk Deck Logo"
            fill
            className="object-contain rounded-full"
            priority
          />
        </div>

        {/* Title */}
        <h1 className="text-4xl font-black text-golden mb-2">
          {texts.welcome}
        </h1>
        <p className="text-muted-foreground mb-10">{texts.subtitle}</p>

        {/* Buttons */}
        <div className="w-full space-y-3">
          {/* Login Button */}
          <Button
            onClick={() => setShowAuth(true)}
            className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-base rounded-xl shadow-lg shadow-amber-500/20"
          >
            <Wifi className="w-5 h-5 mr-2" />
            {texts.loginBtn}
          </Button>
          <p className="text-xs text-muted-foreground px-4">
            {texts.onlineNote}
          </p>

          {/* Divider */}
          <div className="flex items-center gap-4 py-4">
            <div className="flex-1 h-px bg-border/50" />
            <span className="text-muted-foreground/60 text-xs uppercase tracking-wider">
              {language === "hu" ? "vagy" : "or"}
            </span>
            <div className="flex-1 h-px bg-border/50" />
          </div>

          {/* Offline Button */}
          <Button
            onClick={onContinueOffline}
            variant="outline"
            className="w-full h-14 border border-border/50 hover:border-border text-base rounded-xl bg-transparent hover:bg-card/50"
          >
            <WifiOff className="w-5 h-5 mr-2 text-muted-foreground" />
            {texts.offlineBtn}
          </Button>
          <p className="text-xs text-muted-foreground/60 px-4">
            {texts.offlineNote}
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="absolute bottom-6 text-xs text-muted-foreground/40">
        Drunk Deck © 2025 - {language === "hu" ? "Felelősségteljesen igyál!" : "Drink responsibly!"}
      </p>
    </div>
  );
}
