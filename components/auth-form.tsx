'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Language } from '@/lib/game-types';
import { ArrowLeft, Mail, Lock, User, Wine } from 'lucide-react';
import Image from 'next/image';

interface AuthFormProps {
  onSuccess: () => void;
  onBack: () => void;
  language: Language;
}

export function AuthForm({ onSuccess, onBack, language }: AuthFormProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'email' | 'verify'>('email');

  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
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
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        });

        if (signUpError) throw signUpError;

        if (authData.user) {
          // Create profile immediately
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
              id: authData.user.id,
              username: username || email.split('@')[0],
              language: language
            }, {
              onConflict: 'id',
              ignoreDuplicates: false
            });

          if (profileError) {
            console.error('Profile creation error:', profileError);
            // Don't throw - profile will be created on next login
          }

          // Check if email confirmation is required
          if (authData.session) {
            // User is immediately logged in (email confirmation disabled)
            onSuccess();
          } else {
            // Email confirmation required
            setStep('verify');
            alert(language === 'hu' 
              ? 'Ellenőrizd az email fiókodat a megerősítéshez!'
              : 'Check your email for confirmation!');
          }
        }
      } else {
        // Sign in
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;

        // Make sure profile exists
        if (data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select()
            .eq('id', data.user.id)
            .single();

          if (!profile) {
            // Create profile if it doesn't exist
            await supabase
              .from('profiles')
              .insert({
                id: data.user.id,
                username: data.user.email?.split('@')[0] || 'User',
                language: language
              });
          }
        }

        onSuccess();
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      let errorMsg = err.message || (language === 'hu' ? 'Hiba történt' : 'An error occurred');
      
      // Translate common errors
      if (errorMsg.includes('Invalid login credentials')) {
        errorMsg = language === 'hu' ? 'Hibás email vagy jelszó' : 'Invalid email or password';
      } else if (errorMsg.includes('User already registered')) {
        errorMsg = language === 'hu' ? 'Ez az email cím már regisztrálva van' : 'This email is already registered';
      } else if (errorMsg.includes('Password should be at least')) {
        errorMsg = language === 'hu' ? 'A jelszónak legalább 6 karakter hosszúnak kell lennie' : 'Password must be at least 6 characters';
      }
      
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (step === 'verify') {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md luxury-card rounded-2xl p-8 text-center">
          <div className="w-20 h-20 rounded-full bg-gold/20 flex items-center justify-center mx-auto mb-4">
            <Mail className="w-10 h-10 text-gold" />
          </div>
          <h2 className="text-2xl font-bold text-golden mb-2">
            {language === 'hu' ? 'Ellenőrizd az emailedet' : 'Check your email'}
          </h2>
          <p className="text-gray-400 mb-6">
            {language === 'hu'
              ? 'Küldtünk egy megerősítő linket az email címedre. Kattints rá a regisztráció befejezéséhez.'
              : 'We sent a confirmation link to your email. Click it to complete registration.'}
          </p>
          <Button
            onClick={onBack}
            variant="outline"
            className="w-full bg-transparent border-gold/30 text-gold hover:bg-gold/10"
          >
            {language === 'hu' ? 'Vissza a főoldalra' : 'Back to home'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black flex flex-col safe-area-top safe-area-bottom">
      <header className="flex items-center justify-between p-4">
        <Button variant="ghost" onClick={onBack} className="text-gold gap-1 hover:bg-gold/10">
          <ArrowLeft className="w-4 h-4" />
          {language === 'hu' ? 'Vissza' : 'Back'}
        </Button>
        <div className="w-16" />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-32 h-32 mx-auto mb-4 relative">
              <Image
                src="/logo.png"
                alt="Drunk Deck Logo"
                width={128}
                height={128}
                className="object-contain"
              />
            </div>
            <h1 className="text-3xl font-black text-golden mb-2">Drunk Deck</h1>
            <p className="text-gray-400">
              {isSignUp
                ? (language === 'hu' ? 'Új fiók létrehozása' : 'Create new account')
                : (language === 'hu' ? 'Jelentkezz be' : 'Sign in')}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 luxury-card p-6 rounded-2xl">
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
                  className="bg-zinc-900 border-gold/30 text-white placeholder:text-gray-500"
                  required={isSignUp}
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
                className="bg-zinc-900 border-gold/30 text-white placeholder:text-gray-500"
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
                className="bg-zinc-900 border-gold/30 text-white placeholder:text-gray-500"
                minLength={6}
              />
              {isSignUp && (
                <p className="text-xs text-gray-500 mt-1">
                  {language === 'hu' ? 'Minimum 6 karakter' : 'Minimum 6 characters'}
                </p>
              )}
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 luxury-button font-bold"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>{language === 'hu' ? 'Betöltés...' : 'Loading...'}</span>
                </div>
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
                className="text-sm text-gold hover:text-gold/80 transition-colors"
              >
                {isSignUp
                  ? (language === 'hu' ? 'Van már fiókod? Jelentkezz be' : 'Have an account? Sign in')
                  : (language === 'hu' ? 'Nincs még fiókod? Regisztrálj' : "Don't have an account? Sign up")}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}