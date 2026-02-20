"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Language } from "@/lib/game-types";
import { ArrowLeft, Mail, Lock, User } from "lucide-react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

interface AuthFormProps {
  onSuccess: () => void;
  onBack: () => void;
  language: Language;
}

export function AuthForm({ onSuccess, onBack, language }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"email" | "verify">("email");

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        const { data: authData, error: signUpError } =
          await supabase.auth.signUp({
            email,
            password,
            options: {
              data: { username: username || email.split("@")[0] },
              emailRedirectTo: `${window.location.origin}/auth/callback`,
            },
          });

        if (signUpError) throw signUpError;

        if (authData.user) {
          await supabase.from("profiles").upsert(
            {
              id: authData.user.id,
              username: username || email.split("@")[0],
              language,
            },
            { onConflict: "id", ignoreDuplicates: false },
          );

          if (authData.session) {
            onSuccess();
          } else {
            setStep("verify");
          }
        }
      } else {
        const { data, error: signInError } =
          await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        if (data.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select()
            .eq("id", data.user.id)
            .single();
          if (!profile) {
            await supabase.from("profiles").insert({
              id: data.user.id,
              username: data.user.email?.split("@")[0] || "User",
              language,
            });
          }
        }
        onSuccess();
      }
    } catch (err: any) {
      let errorMsg =
        err.message ||
        (language === "hu" ? "Hiba történt" : "An error occurred");
      if (errorMsg.includes("Invalid login credentials"))
        errorMsg =
          language === "hu"
            ? "Hibás email vagy jelszó"
            : "Invalid email or password";
      else if (errorMsg.includes("User already registered"))
        errorMsg =
          language === "hu"
            ? "Ez az email cím már regisztrálva van"
            : "This email is already registered";
      else if (errorMsg.includes("Password should be at least"))
        errorMsg =
          language === "hu"
            ? "A jelszónak legalább 6 karakter hosszúnak kell lennie"
            : "Password must be at least 6 characters";
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // ── Email verify screen ──
  if (step === "verify") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="fixed inset-0 z-0">
          <Image
            src="/images/hatter.png"
            alt="background"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/55 to-black/88" />
        </div>
        <GrainOverlay />

        <motion.div
          className="relative z-10 w-full max-w-sm text-center p-8 rounded-2xl"
          style={{
            background: "rgba(15,6,0,0.65)",
            border: "1px solid rgba(255,185,0,0.25)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          }}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{
              background: "rgba(255,185,0,0.12)",
              border: "1px solid rgba(255,185,0,0.3)",
            }}
          >
            <Mail className="w-8 h-8 text-[#FFD700]" />
          </div>
          <h2
            className="text-xl font-black tracking-widest mb-3"
            style={{
              fontFamily: "'Cinzel', serif",
              background:
                "linear-gradient(180deg, #FFE566 0%, #FFB300 60%, #CC8800 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {language === "hu" ? "ELLENŐRIZD AZ EMAILEDET" : "CHECK YOUR EMAIL"}
          </h2>
          <p
            className="text-sm mb-6"
            style={{ color: "rgba(255,220,150,0.65)" }}
          >
            {language === "hu"
              ? "Küldtünk egy megerősítő linket az email címedre."
              : "We sent a confirmation link to your email."}
          </p>
          <GoldButton
            onClick={onBack}
            label={language === "hu" ? "VISSZA A FŐOLDALRA" : "BACK TO HOME"}
          />
        </motion.div>
      </div>
    );
  }

  // ── Main auth form ──
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden safe-area-top safe-area-bottom">
      {/* Háttér */}
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
      <GrainOverlay />

      {/* Header */}
      <header className="relative z-10 flex items-center px-4 pt-5 pb-2 safe-area-top">
        <motion.button
          onClick={onBack}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
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
      </header>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-6 z-10">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <motion.div
            className="flex flex-col items-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative flex items-center justify-center mb-4">
              <div className="absolute w-48 h-24 rounded-full bg-[#FFB300]/20 blur-3xl pointer-events-none" />
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{
                  duration: 3.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="relative w-52 h-24"
              >
                <Image
                  src="/images/logo.png"
                  alt="Drunk Deck"
                  fill
                  className="object-contain drop-shadow-[0_0_20px_rgba(255,160,0,0.5)]"
                  priority
                />
              </motion.div>
            </div>

            {/* Felirat */}
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent to-[#FFB300]/40" />
              <p
                className="text-xs tracking-[0.35em] font-bold"
                style={{
                  fontFamily: "'Cinzel', serif",
                  color: "rgba(255,185,0,0.55)",
                }}
              >
                {isSignUp
                  ? language === "hu"
                    ? "REGISZTRÁCIÓ"
                    : "SIGN UP"
                  : language === "hu"
                    ? "BEJELENTKEZÉS"
                    : "SIGN IN"}
              </p>
              <div className="flex-1 h-px bg-gradient-to-l from-transparent to-[#FFB300]/40" />
            </div>
          </motion.div>

          {/* Form kártya */}
          <motion.form
            onSubmit={handleSubmit}
            className="w-full p-6 rounded-2xl space-y-4"
            style={{
              background: "rgba(15,6,0,0.60)",
              border: "1px solid rgba(255,185,0,0.2)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 8px 40px rgba(0,0,0,0.55)",
            }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <AnimatePresence>
              {isSignUp && (
                <motion.div
                  key="username"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <AuthField
                    id="username"
                    type="text"
                    icon={<User className="w-4 h-4 text-[#FFD700]" />}
                    label={language === "hu" ? "Felhasználónév" : "Username"}
                    value={username}
                    onChange={setUsername}
                    placeholder={
                      language === "hu" ? "Add meg a neved" : "Enter your name"
                    }
                    required={isSignUp}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <AuthField
              id="email"
              type="email"
              icon={<Mail className="w-4 h-4 text-[#FFD700]" />}
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="pelda@email.com"
              required
            />

            <AuthField
              id="password"
              type="password"
              icon={<Lock className="w-4 h-4 text-[#FFD700]" />}
              label={language === "hu" ? "Jelszó" : "Password"}
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              required
              hint={
                isSignUp
                  ? language === "hu"
                    ? "Minimum 6 karakter"
                    : "Minimum 6 characters"
                  : undefined
              }
              minLength={6}
            />

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3 rounded-xl text-sm text-center"
                  style={{
                    background: "rgba(180,30,30,0.15)",
                    border: "1px solid rgba(180,30,30,0.35)",
                    color: "#f87171",
                  }}
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Dekoratív vonal */}
            <div
              className="h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,185,0,0.3), transparent)",
              }}
            />

            {/* Submit gomb */}
            <div className="flex flex-col items-center gap-1 pt-1">
              <button
                type="submit"
                disabled={loading}
                className="relative w-full py-[14px] flex items-center justify-center transition-all"
                style={{
                  borderRadius: "12px",
                  background:
                    "linear-gradient(180deg, #1a0a00 0%, #0d0500 100%)",
                  border: "1px solid rgba(255,185,0,0.55)",
                  boxShadow:
                    "0 0 18px rgba(255,160,0,0.2), inset 0 1px 0 rgba(255,200,80,0.12)",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? (
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                      style={{
                        borderColor: "rgba(255,185,0,0.6)",
                        borderTopColor: "transparent",
                      }}
                    />
                    <span
                      className="text-sm font-black tracking-widest"
                      style={{
                        fontFamily: "'Cinzel', serif",
                        color: "rgba(255,185,0,0.6)",
                      }}
                    >
                      {language === "hu" ? "BETÖLTÉS..." : "LOADING..."}
                    </span>
                  </div>
                ) : (
                  <span
                    className="font-black tracking-[0.35em] text-sm"
                    style={{
                      fontFamily: "'Cinzel', serif",
                      background:
                        "linear-gradient(180deg, #FFE566 0%, #FFB300 60%, #CC8800 100%)",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {isSignUp
                      ? language === "hu"
                        ? "REGISZTRÁCIÓ"
                        : "SIGN UP"
                      : language === "hu"
                        ? "BEJELENTKEZÉS"
                        : "SIGN IN"}
                  </span>
                )}
              </button>
            </div>

            {/* Toggle sign in / sign up */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError("");
                }}
                className="text-xs font-semibold transition-all"
                style={{
                  color: "rgba(255,185,0,0.55)",
                  fontFamily: "'Cinzel', serif",
                  letterSpacing: "0.05em",
                }}
              >
                {isSignUp
                  ? language === "hu"
                    ? "Van már fiókod? Jelentkezz be"
                    : "Have an account? Sign in"
                  : language === "hu"
                    ? "Nincs még fiókod? Regisztrálj"
                    : "Don't have an account? Sign up"}
              </button>
            </div>
          </motion.form>
        </div>
      </main>
    </div>
  );
}

// ── Helper Components ──

function GrainOverlay() {
  return (
    <div
      className="fixed inset-0 z-[1] pointer-events-none opacity-[0.04]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "128px",
      }}
    />
  );
}

function GoldButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className="relative w-full py-[14px] flex items-center justify-center"
      style={{
        borderRadius: "12px",
        background: "linear-gradient(180deg, #1a0a00 0%, #0d0500 100%)",
        border: "1px solid rgba(255,185,0,0.55)",
        boxShadow: "0 0 18px rgba(255,160,0,0.2)",
      }}
    >
      <span
        className="font-black tracking-[0.35em] text-sm"
        style={{
          fontFamily: "'Cinzel', serif",
          background:
            "linear-gradient(180deg, #FFE566 0%, #FFB300 60%, #CC8800 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        {label}
      </span>
    </button>
  );
}

interface AuthFieldProps {
  id: string;
  type: string;
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  minLength?: number;
}

function AuthField({
  id,
  type,
  icon,
  label,
  value,
  onChange,
  placeholder,
  required,
  hint,
  minLength,
}: AuthFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className="flex items-center gap-2 text-xs font-bold tracking-widest"
        style={{ fontFamily: "'Cinzel', serif", color: "rgba(255,185,0,0.7)" }}
      >
        {icon}
        {label}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="h-11 text-sm"
        style={{
          background: "rgba(10,4,0,0.6)",
          border: "1px solid rgba(255,185,0,0.22)",
          borderRadius: "10px",
          color: "#FFE566",
          outline: "none",
        }}
      />
      {hint && (
        <p
          className="text-[10px]"
          style={{
            color: "rgba(255,185,0,0.35)",
            fontFamily: "'Cinzel', serif",
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}
