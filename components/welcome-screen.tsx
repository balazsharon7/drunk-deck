'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Language } from '@/lib/game-types';
import { Globe, LogIn, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import Image from 'next/image';

interface WelcomeScreenProps {
  onContinueOffline: () => void;
  onLoginSuccess: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
}

export function WelcomeScreen({ 
  onContinueOffline, 
  onLoginSuccess,
  language,
  setLanguage 
}: WelcomeScreenProps) {
  const [showAuth, setShowAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              username: username || email.split('@')[0]
            }
          }
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          const { error: profileError } = await supabase
            .from('profiles')
            .insert({
              id: authData.user.id,
              username: username || email.split('@')[0],
              language: language
            });

          if (profileError) throw profileError;

          onLoginSuccess();
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;

        onLoginSuccess();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : (language === 'hu' ? 'Hiba történt' : 'An error occurred');
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (showAuth) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 texture-overlay safe-area-top safe-area-bottom">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-24 h-24 relative mx-auto mb-4">
              <Image
                src="/logo.png"
                alt="Drunk Deck"
                fill
                className="object-contain"
              />
            </div>
            <h1 className="text-3xl font-black text-golden mb-2">Drunk Deck</h1>
            <p className="text-muted-foreground">
              {isSignUp 
                ? (language === 'hu' ? 'Új fiók létrehozása' : 'Create new account')
                : (language === 'hu' ? 'Jelentkezz be' : 'Sign in')}
            </p>
          </div>

          {/* Auth form */}
          <form onSubmit={handleAuth} className="space-y-4">
            <div className="game-card-frame p-6 space-y-4">
              {isSignUp && (
                <div>
                  <Label htmlFor="username" className="flex items-center gap-2 mb-2 text-gold">
                    <User className="w-4 h-4" />
                    {language === 'hu' ? 'Felhasználónév' : 'Username'}
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={language === 'hu' ? 'Add meg a neved' : 'Enter your name'}
                    className="bg-background/50 border-gold/30 focus:border-gold"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="email" className="flex items-center gap-2 mb-2 text-gold">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="pelda@email.com"
                  className="bg-background/50 border-gold/30 focus:border-gold"
                />
              </div>

              <div>
                <Label htmlFor="password" className="flex items-center gap-2 mb-2 text-gold">
                  <Lock className="w-4 h-4" />
                  {language === 'hu' ? 'Jelszó' : 'Password'}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="bg-background/50 border-gold/30 focus:border-gold"
                  minLength={6}
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm">
                  {error}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 btn-gold rounded-xl"
            >
              {loading ? (
                <span>{language === 'hu' ? 'Betöltés...' : 'Loading...'}</span>
              ) : (
                <>
                  {isSignUp
                    ? (language === 'hu' ? 'Regisztráció' : 'Sign up')
                    : (language === 'hu' ? 'Bejelentkezés' : 'Sign in')}
                </>
              )}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
                className="text-sm text-gold hover:text-gold-light transition-colors"
              >
                {isSignUp
                  ? (language === 'hu' ? 'Van már fiókod? Jelentkezz be' : 'Have an account? Sign in')
                  : (language === 'hu' ? 'Nincs még fiókod? Regisztrálj' : "Don't have an account? Sign up")}
              </button>
            </div>

            <div className="relative py-2">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-gold/30 to-transparent" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-4 text-muted-foreground">
                  {language === 'hu' ? 'vagy' : 'or'}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAuth(false)}
              className="w-full h-12 btn-gold-outline rounded-xl"
            >
              {language === 'hu' ? 'Vissza' : 'Back'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 texture-overlay safe-area-top safe-area-bottom">
      <div className="w-full max-w-sm text-center">
        {/* Logo and title */}
        <div className="mb-10">
          <div className="header-frame rounded-2xl p-8 mb-6 relative overflow-hidden">
            {/* Corner ornaments */}
            <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-gold opacity-50" />
            <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-gold opacity-50" />
            <div className="absolute bottom-3 left-3 w-6 h-6 border-b-2 border-l-2 border-gold opacity-50" />
            <div className="absolute bottom-3 right-3 w-6 h-6 border-b-2 border-r-2 border-gold opacity-50" />
            
            <div className="relative w-36 h-36 mx-auto animate-float">
              <Image
                src="/logo.png"
                alt="Drunk Deck"
                fill
                className="object-contain drop-shadow-[0_0_30px_rgba(212,175,55,0.4)]"
                priority
              />
            </div>
          </div>
          
          <h1 className="text-4xl font-black text-golden-shine mb-3 tracking-tight">
            DRUNK DECK
          </h1>
          
          {/* Decorative divider */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-16 h-[1px] bg-gradient-to-r from-transparent to-gold" />
            <span className="text-gold text-lg">{"♠ ♥ ♣ ♦"}</span>
            <div className="w-16 h-[1px] bg-gradient-to-l from-transparent to-gold" />
          </div>
          
          <p className="text-muted-foreground text-lg">
            {language === 'hu' ? 'A legjobb bulizós kártyajátékok' : 'The best party card games'}
          </p>
        </div>

        {/* Language selector */}
        <div className="mb-8 flex items-center justify-center gap-3">
          <Globe className="w-4 h-4 text-gold" />
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage('hu')}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all border-2',
                language === 'hu'
                  ? 'bg-gold text-background border-gold'
                  : 'bg-transparent text-gold border-gold/30 hover:border-gold'
              )}
            >
              HU
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={cn(
                'px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider transition-all border-2',
                language === 'en'
                  ? 'bg-gold text-background border-gold'
                  : 'bg-transparent text-gold border-gold/30 hover:border-gold'
              )}
            >
              EN
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <button
            onClick={() => setShowAuth(true)}
            className="w-full h-14 btn-gold rounded-xl flex items-center justify-center gap-3 text-base"
          >
            <LogIn className="w-5 h-5" />
            {language === 'hu' ? 'Bejelentkezés / Regisztráció' : 'Sign in / Sign up'}
          </button>

          <button
            onClick={onContinueOffline}
            className="w-full h-14 btn-gold-outline rounded-xl flex items-center justify-center gap-3 text-base"
          >
            {language === 'hu' ? 'Folytatás offline módban' : 'Continue offline'}
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        {/* Features */}
        <div className="mt-10 grid grid-cols-3 gap-3">
          {[
            { icon: "🎮", text: language === 'hu' ? '6+ játék' : '6+ games' },
            { icon: "👥", text: language === 'hu' ? 'Online party' : 'Online party' },
            { icon: "🎉", text: language === 'hu' ? 'Ingyenes' : 'Free' },
          ].map((feature, i) => (
            <div key={i} className="game-card-frame p-3 text-center">
              <span className="text-2xl mb-1 block">{feature.icon}</span>
              <p className="text-gold/70 text-xs font-medium">{feature.text}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
