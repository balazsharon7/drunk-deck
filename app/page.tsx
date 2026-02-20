"use client";

import { useState, useEffect } from "react";
import { GameProvider, useGame } from "@/lib/game-context";
import { WelcomeScreen } from "@/components/welcome-screen";
import { HomeScreenNew } from "@/components/home-screen-new";
import { GameDetail } from "@/components/game-detail";
import { AuthForm } from "@/components/auth-form";
import { ProfileScreen } from "@/components/profile-screen";
import { PartyLobby } from "@/components/party-lobby";
import { KingsCup } from "@/components/games/kings-cup";
import { KingsCupMultiplayer } from "@/components/games/kings-cup-multiplayer";
import { RideTheBus } from "@/components/games/ride-the-bus";
import { Blackjack } from "@/components/games/blackjack";
import { Charades } from "@/components/games/charades";
import { Taboo } from "@/components/games/taboo";
import { RatingGame } from "@/components/games/rating-game";
import { createClient } from "@/lib/supabase/client";
import { GameInfo } from "@/lib/game-catalog";
import type { GameType } from "@/lib/game-types";
import type { User } from "@supabase/supabase-js";

type AppView =
  | "welcome"
  | "home"
  | "auth"
  | "profile"
  | "party"
  | "game-detail"
  | "game";

function GameRouter() {
  const { currentGame, setCurrentGame, language, setLanguage } =
    useGame();
  const [view, setView] = useState<AppView>("welcome");
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState<string>("");
  const [isOnlineMode, setIsOnlineMode] = useState(false);
  const [isOnlineGame, setIsOnlineGame] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<GameInfo | null>(null);
  const [partyId, setPartyId] = useState<string | null>(null);
  const [partyMembers, setPartyMembers] = useState<
    Array<{ id: string; name: string; avatar: string; isHost: boolean }>
  >([]);

  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, language")
          .eq("id", user.id)
          .single();

        if (profile?.username) {
          setUsername(profile.username);
        } else if (user.email) {
          setUsername(user.email.split("@")[0]);
        } else {
          // Anonymous user without profile yet
          setUsername("Vendeg");
        }
        if (profile?.language) {
          setLanguage(profile.language as "hu" | "en");
        }
        setIsOnlineMode(true);
        setView("home");
      }
      setLoading(false);
    };

    checkUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("username, language")
          .eq("id", session.user.id)
          .single();

        if (profile?.username) {
          setUsername(profile.username);
        }
        if (profile?.language) {
          setLanguage(profile.language as "hu" | "en");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, setLanguage]);

  const handleContinueOffline = () => {
    setIsOnlineMode(false);
    setView("home");
  };

  const handleLoginSuccess = () => {
    setIsOnlineMode(true);
    setView("home");
  };

  const handleSelectGame = (game: GameInfo) => {
    setSelectedGame(game);
    setView("game-detail");
  };

  const handleStartGame = () => {
    if (selectedGame) {
      setCurrentGame(selectedGame.id as GameType);
      setIsOnlineGame(false);
      setView("game");
    }
  };

  const handleGoOnline = () => {
    console.log(
      "[v0] handleGoOnline called, user:",
      !!user,
      "isOnlineMode:",
      isOnlineMode,
    );
    if (user) {
      console.log("[v0] Navigating to party view");
      setView("party");
    } else {
      console.log("[v0] No user, navigating to auth");
      setView("auth");
    }
  };

  const handleOpenProfile = () => {
    setView("profile");
  };

  const handleLogin = () => {
    setView("auth");
  };

  const handleAuthSuccess = () => {
    setIsOnlineMode(true);
    setView("home");
  };

  const handleAuthBack = () => {
    setView("welcome");
  };

  const handleProfileBack = () => {
    setView("home");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setIsOnlineMode(false);
    setView("welcome");
  };

  const handlePartyLeave = () => {
    setView("home");
  };

  const handlePartyStartGame = (
    gameType: GameType,
    partyIdParam: string,
    members: { user_id: string; profiles: { username: string } }[],
  ) => {
    setCurrentGame(gameType);
    setIsOnlineGame(true);
    setPartyId(partyIdParam);

    const partyPlayers = members.map((m, index) => ({
      id: m.user_id,
      name: m.profiles?.username || `Jatekos ${index + 1}`,
      avatar: ["🎮", "🎲", "🃏", "🍺", "🎯", "🎪", "🎭", "🎨"][index % 8],
      isHost: index === 0,
    }));
    setPartyMembers(partyPlayers);

    setView("game");
  };

  const handleBack = () => {
    if (view === "game") {
      setCurrentGame(null);
      if (isOnlineGame) {
        setView("party");
      } else if (selectedGame) {
        setView("game-detail");
      } else {
        setView("home");
      }
    } else if (view === "game-detail") {
      setSelectedGame(null);
      setView("home");
    } else {
      setView("home");
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-10 h-10 border-3 border-gold border-t-transparent rounded-full" />
      </div>
    );
  }

  // Welcome screen
  if (view === "welcome") {
    return <WelcomeScreen onContinue={handleContinueOffline} />;
  }

  // Auth view
  if (view === "auth") {
    return (
      <AuthForm
        onSuccess={handleAuthSuccess}
        onGuestSuccess={() => {
          setIsOnlineMode(true);
          setView("party");
        }}
        onBack={handleAuthBack}
        language={language}
      />
    );
  }

  // Profile view
  if (view === "profile" && user) {
    return (
      <ProfileScreen
        onBack={handleProfileBack}
        onLogout={handleLogout}
        language={language}
        setLanguage={setLanguage}
        userId={user.id}
      />
    );
  }

  // Party lobby view
  console.log("[v0] Current view:", view, "user:", !!user);
  if (view === "party" && user) {
    return (
      <PartyLobby
        userId={user.id}
        username={username || user.email?.split("@")[0] || "Játékos"}
        onStartGame={handlePartyStartGame}
        onLeave={handlePartyLeave}
      />
    );
  }

  // Game detail view
  if (view === "game-detail" && selectedGame) {
    return (
      <GameDetail
        game={selectedGame}
        onBack={handleBack}
        onStartGame={handleStartGame}
      />
    );
  }

  // Game views
  if (view === "game" && currentGame) {
    // Multiplayer Kings Cup
    if (currentGame === "kings-cup" && isOnlineGame && partyId && user) {
      return (
        <KingsCupMultiplayer
          partyId={partyId}
          playerId={user.id}
          playerName={username || user.email?.split("@")[0] || "Jatekos"}
          isHost={partyMembers[0]?.id === user.id}
          initialPlayers={partyMembers}
          onBack={handleBack}
        />
      );
    }
    // Local Kings Cup
    if (currentGame === "kings-cup") {
      return <KingsCup onBack={handleBack} />;
    }
    if (currentGame === "ride-the-bus") {
      return <RideTheBus onBack={handleBack} />;
    }
    if (currentGame === "blackjack") {
      return <Blackjack onBack={handleBack} />;
    }
    if (currentGame === "charades") {
      return <Charades onBack={handleBack} />;
    }
    if (currentGame === "taboo") {
      return <Taboo onBack={handleBack} />;
    }
    if (currentGame === "rating-game") {
      return <RatingGame onBack={handleBack} />;
    }
  }

  // Home view - new design
  return (
    <HomeScreenNew
      onSelectGame={handleSelectGame}
      onOpenProfile={isOnlineMode ? handleOpenProfile : undefined}
      onLogin={!isOnlineMode ? handleLogin : undefined}
      onOpenParty={handleGoOnline}
      isOnline={isOnlineMode}
      user={user}
    />
  );
}

export default function Page() {
  return (
    <GameProvider>
      <GameRouter />
    </GameProvider>
  );
}
