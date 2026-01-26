'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Language } from '@/lib/game-types';
import { Wine, Globe, LogIn, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

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
        // Sign up
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
          // Create profile
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
        // Sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;

        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || (language === 'hu' ? 'Hiba történt' : 'An error occurred'));
    } finally {
      setLoading(false);
    }
  };

  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-amber-950/10 to-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <Wine className="w-16 h-16 text-amber-400 mx-auto mb-4" />
            <h1 className="text-3xl font-black text-golden mb-2">Drunk Deck</h1>
            <p className="text-muted-foreground">
              {isSignUp 
                ? (language === 'hu' ? 'Új fiók létrehozása' : 'Create new account')
                : (language === 'hu' ? 'Jelentkezz be' : 'Sign in')}
            </p>
          </div>

          {/* Auth form */}
          <form onSubmit={handleAuth} className="space-y-4 bg-card/50 p-6 rounded-2xl border border-border/30">
            {isSignUp && (
              <div>
                <Label htmlFor="username" className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4" />
                  {language === 'hu' ? 'Felhasználónév' : 'Username'}
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={language === 'hu' ? 'Add meg a neved' : 'Enter your name'}
                  className="bg-background/50"
                />
              </div>
            )}

            <div>
              <Label htmlFor="email" className="flex items-center gap-2 mb-2">
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
                className="bg-background/50"
              />
            </div>

            <div>
              <Label htmlFor="password" className="flex items-center gap-2 mb-2">
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
                className="bg-background/50"
                minLength={6}
              />
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold"
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
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError('');
                }}
                className="text-sm text-amber-400 hover:text-amber-300"
              >
                {isSignUp
                  ? (language === 'hu' ? 'Van már fiókod? Jelentkezz be' : 'Have an account? Sign in')
                  : (language === 'hu' ? 'Nincs még fiókod? Regisztrálj' : "Don't have an account? Sign up")}
              </button>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/30" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  {language === 'hu' ? 'vagy' : 'or'}
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setShowAuth(false)}
              className="w-full bg-transparent border-border/50"
            >
              {language === 'hu' ? 'Vissza' : 'Back'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-amber-950/10 to-background flex flex-col items-center justify-center p-4 safe-area-top safe-area-bottom">
      <div className="w-full max-w-md text-center">
        {/* Logo and title */}
        <div className="mb-12">
          <Wine className="w-20 h-20 text-amber-400 mx-auto mb-6 animate-bounce" />
          <h1 className="text-5xl font-black text-golden mb-3 tracking-tight">
            Drunk Deck
          </h1>
          <p className="text-xl text-muted-foreground">
            {language === 'hu' ? 'A legjobb bulizós kártyajátékok' : 'The best party card games'}
          </p>
        </div>

        {/* Language selector */}
        <div className="mb-8 flex items-center justify-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <div className="flex gap-2">
            <button
              onClick={() => setLanguage('hu')}
              className={cn(
                'px-3 py-1 rounded-full text-sm font-medium transition-all',
                language === 'hu'
                  ? 'bg-amber-500 text-black'
                  : 'bg-card/50 text-muted-foreground hover:bg-card'
              )}
            >
              🇭🇺 HU
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={cn(
                'px-3 py-1 rounded-full text-sm font-medium transition-all',
                language === 'en'
                  ? 'bg-amber-500 text-black'
                  : 'bg-card/50 text-muted-foreground hover:bg-card'
              )}
            >
              🇬🇧 EN
            </button>
          </div>
        </div>

        {/* Action buttons */}
        <div className="space-y-3">
          <Button
            onClick={() => setShowAuth(true)}
            className="w-full h-14 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold text-lg gap-2"
          >
            <LogIn className="w-5 h-5" />
            {language === 'hu' ? 'Bejelentkezés / Regisztráció' : 'Sign in / Sign up'}
          </Button>

          <Button
            onClick={onContinueOffline}
            variant="outline"
            className="w-full h-14 bg-transparent border-border/50 text-amber-400 hover:bg-amber-500/10 font-bold text-lg gap-2"
          >
            {language === 'hu' ? 'Folytatás offline módban' : 'Continue offline'}
            <ArrowRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Features */}
        <div className="mt-12 grid grid-cols-3 gap-4 text-sm">
          <div className="p-3 rounded-xl bg-card/30">
            <span className="text-2xl mb-1 block">🎮</span>
            <p className="text-muted-foreground">
              {language === 'hu' ? '6+ játék' : '6+ games'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-card/30">
            <span className="text-2xl mb-1 block">👥</span>
            <p className="text-muted-foreground">
              {language === 'hu' ? 'Online party' : 'Online party'}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-card/30">
            <span className="text-2xl mb-1 block">🎉</span>
            <p className="text-muted-foreground">
              {language === 'hu' ? 'Ingyenes' : 'Free'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}