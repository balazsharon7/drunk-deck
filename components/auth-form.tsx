"use client";

import React from "react"

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Mail, Lock, User, Loader2 } from "lucide-react";

interface AuthFormProps {
  onSuccess: () => void;
  onBack: () => void;
  language: "hu" | "en";
}

const t = {
  hu: {
    login: "Bejelentkezés",
    register: "Regisztráció",
    email: "Email cím",
    password: "Jelszó",
    username: "Felhasználónév",
    loginBtn: "Bejelentkezés",
    registerBtn: "Regisztráció",
    noAccount: "Nincs még fiókod?",
    hasAccount: "Van már fiókod?",
    registerHere: "Regisztrálj itt",
    loginHere: "Jelentkezz be itt",
    checkEmail: "Ellenőrizd az email fiókodat!",
    confirmEmail: "Küldtünk egy megerősítő emailt. Kérjük kattints a linkre a folytatáshoz.",
    error: "Hiba történt",
    invalidCredentials: "Hibás email vagy jelszó",
    emailInUse: "Ez az email cím már használatban van",
    weakPassword: "A jelszónak legalább 6 karakternek kell lennie",
    back: "Vissza",
    orContinueWith: "vagy folytatás ezzel",
    continueWithGoogle: "Folytatás Google-lel",
    continueWithFacebook: "Folytatás Facebook-kal",
  },
  en: {
    login: "Login",
    register: "Register",
    email: "Email address",
    password: "Password",
    username: "Username",
    loginBtn: "Login",
    registerBtn: "Register",
    noAccount: "Don't have an account?",
    hasAccount: "Already have an account?",
    registerHere: "Register here",
    loginHere: "Login here",
    checkEmail: "Check your email!",
    confirmEmail: "We sent you a confirmation email. Please click the link to continue.",
    error: "An error occurred",
    invalidCredentials: "Invalid email or password",
    emailInUse: "This email is already in use",
    weakPassword: "Password must be at least 6 characters",
    back: "Back",
    orContinueWith: "or continue with",
    continueWithGoogle: "Continue with Google",
    continueWithFacebook: "Continue with Facebook",
  },
};

export function AuthForm({ onSuccess, onBack, language }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<'google' | 'facebook' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const texts = t[language];
  const supabase = createClient();

  const handleSocialLogin = async (provider: 'google' | 'facebook') => {
    setSocialLoading(provider);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin,
        },
      });

      if (error) {
        setError(error.message);
        setSocialLoading(null);
      }
    } catch {
      setError(texts.error);
      setSocialLoading(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          if (error.message.includes("Invalid login")) {
            setError(texts.invalidCredentials);
          } else {
            setError(error.message);
          }
        } else {
          onSuccess();
        }
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo:
              process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL ||
              window.location.origin,
            data: {
              username: username,
            },
          },
        });

        if (error) {
          if (error.message.includes("already registered")) {
            setError(texts.emailInUse);
          } else if (error.message.includes("password")) {
            setError(texts.weakPassword);
          } else {
            setError(error.message);
          }
        } else {
          setShowConfirmation(true);
        }
      }
    } catch {
      setError(texts.error);
    }

    setLoading(false);
  };

  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
        <Card className="w-full max-w-sm bg-zinc-900/50 border-zinc-800">
          <CardHeader className="text-center">
            <div className="relative w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden border-2 border-amber-500/30">
              <Image
                src="/logo.png"
                alt="Drunk Deck"
                fill
                className="object-cover scale-125"
              />
            </div>
            <CardTitle className="text-amber-400">{texts.checkEmail}</CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <Mail className="w-16 h-16 text-amber-500 mx-auto mb-4" />
            <p className="text-muted-foreground mb-6">{texts.confirmEmail}</p>
            <Button
              onClick={onBack}
              variant="outline"
              className="w-full bg-transparent"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {texts.back}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={onBack}
        className="absolute top-4 left-4"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        {texts.back}
      </Button>

      <Card className="w-full max-w-sm bg-zinc-900/50 border-zinc-800">
        <CardHeader className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-2 rounded-full overflow-hidden border-2 border-amber-500/30 shadow-lg shadow-amber-500/20">
            <Image
              src="/logo.png"
              alt="Drunk Deck"
              fill
              className="object-cover scale-125"
            />
          </div>
          <CardTitle className="text-amber-400">
            {isLogin ? texts.login : texts.register}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Social Login Buttons */}
          <div className="space-y-3 mb-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSocialLogin('google')}
              disabled={socialLoading !== null}
              className="w-full h-11 bg-white hover:bg-gray-100 text-gray-800 border-gray-300"
            >
              {socialLoading === 'google' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  {texts.continueWithGoogle}
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => handleSocialLogin('facebook')}
              disabled={socialLoading !== null}
              className="w-full h-11 bg-[#1877F2] hover:bg-[#166FE5] text-white border-[#1877F2]"
            >
              {socialLoading === 'facebook' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  {texts.continueWithFacebook}
                </>
              )}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-700"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-zinc-900 px-2 text-muted-foreground">
                {texts.orContinueWith}
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username">{texts.username}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="pl-10 bg-zinc-800 border-zinc-700"
                    placeholder={texts.username}
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">{texts.email}</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 bg-zinc-800 border-zinc-700"
                  placeholder="email@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{texts.password}</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 bg-zinc-800 border-zinc-700"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isLogin ? (
                texts.loginBtn
              ) : (
                texts.registerBtn
              )}
            </Button>
          </form>

          {/* Toggle Login/Register */}
          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isLogin ? texts.noAccount : texts.hasAccount}{" "}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
                className="text-amber-400 hover:text-amber-300 font-medium"
              >
                {isLogin ? texts.registerHere : texts.loginHere}
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
