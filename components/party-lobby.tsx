"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  Users, 
  Copy, 
  Check, 
  Crown, 
  LogOut, 
  Play,
  Loader2,
  UserPlus,
  ArrowLeft,
  User
} from "lucide-react"
import type { GameType } from "@/lib/game-types"

interface PartyMember {
  id: string
  user_id: string
  is_ready: boolean
  profiles: {
    username: string
    avatar_url: string | null
  }
}

interface Party {
  id: string
  code: string
  host_id: string
  game_type: GameType | null
  status: string
  game_state: Record<string, unknown> | null
}

interface PartyLobbyProps {
  userId: string
  username: string
  onStartGame: (gameType: GameType, partyId: string, members: PartyMember[]) => void
  onLeave: () => void
}

const GAMES: { type: GameType; name: string; description: string; icon: string }[] = [
  { type: "kings-cup", name: "4 Király", description: "Klasszikus kártya játék", icon: "/icons/kings-cup.png" },
  { type: "ride-the-bus", name: "Busz", description: "Találd ki a kártyákat", icon: "/icons/ride-the-bus.png" },
  { type: "blackjack", name: "Blackjack", description: "21-es ivós verzió", icon: "/icons/blackjack.png" },
  { type: "charades", name: "Homlok Játék", description: "Találd ki mit mutatnak", icon: "/icons/charades.jpg" },
  { type: "taboo", name: "Egyszótagos", description: "Írd körül egyszótagúan", icon: "/icons/taboo.jpg" },
  { type: "rating-game", name: "Rangsorolós", description: "Találd ki a sorrendet", icon: "/icons/rating-game.jpg" },
]

export function PartyLobby({ userId, username, onStartGame, onLeave }: PartyLobbyProps) {
  const [party, setParty] = useState<Party | null>(null)
  const [members, setMembers] = useState<PartyMember[]>([])
  const [joinCode, setJoinCode] = useState("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null)

  const supabase = createClient()

  const fetchPartyData = useCallback(async (partyId: string) => {
    const { data: partyData } = await supabase
      .from("parties")
      .select("*")
      .eq("id", partyId)
      .single()

    if (partyData) {
      setParty(partyData)
      setSelectedGame(partyData.game_type)
    }

    const { data: membersData } = await supabase
      .from("party_members")
      .select(`
        id,
        user_id,
        is_ready,
        profiles (
          username,
          avatar_url
        )
      `)
      .eq("party_id", partyId)

    if (membersData) {
      setMembers(membersData as unknown as PartyMember[])
    }
  }, [supabase])

  const checkExistingParty = useCallback(async () => {
    const { data } = await supabase
      .from("party_members")
      .select("party_id")
      .eq("user_id", userId)
      .single()

    if (data?.party_id) {
      await fetchPartyData(data.party_id)
    }
  }, [supabase, userId, fetchPartyData])

  useEffect(() => {
    checkExistingParty()
  }, [checkExistingParty])

  useEffect(() => {
    if (!party?.id) return

    const channel = supabase
      .channel(`party:${party.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "party_members",
          filter: `party_id=eq.${party.id}`,
        },
        () => {
          fetchPartyData(party.id)
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "parties",
          filter: `id=eq.${party.id}`,
        },
        (payload) => {
          const updatedParty = payload.new as Party
          setParty(updatedParty)
          setSelectedGame(updatedParty.game_type)
          
          if (updatedParty.status === "playing" && updatedParty.game_type) {
            onStartGame(updatedParty.game_type, updatedParty.id, members)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [party?.id, supabase, fetchPartyData, onStartGame, members])

  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    let code = ""
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)]
    }
    return code
  }

  const createParty = async () => {
    setLoading(true)
    setError(null)

    try {
      const code = generateCode()
      
      const { data: partyData, error: partyError } = await supabase
        .from("parties")
        .insert({
          code,
          host_id: userId,
          status: "waiting",
        })
        .select()
        .single()

      if (partyError) throw partyError

      const { error: memberError } = await supabase
        .from("party_members")
        .insert({
          party_id: partyData.id,
          user_id: userId,
          is_ready: true,
        })

      if (memberError) throw memberError

      await fetchPartyData(partyData.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hiba történt")
    } finally {
      setLoading(false)
    }
  }

  const joinParty = async () => {
    if (!joinCode.trim()) return
    setLoading(true)
    setError(null)

    try {
      const { data: partyData, error: partyError } = await supabase
        .from("parties")
        .select("*")
        .eq("code", joinCode.toUpperCase())
        .eq("status", "waiting")
        .single()

      if (partyError || !partyData) {
        throw new Error("Party nem található vagy már elkezdődött")
      }

      const { data: existingMember } = await supabase
        .from("party_members")
        .select("id")
        .eq("party_id", partyData.id)
        .eq("user_id", userId)
        .single()

      if (existingMember) {
        await fetchPartyData(partyData.id)
        return
      }

      const { data: memberCount } = await supabase
        .from("party_members")
        .select("id", { count: "exact" })
        .eq("party_id", partyData.id)

      if (memberCount && memberCount.length >= 10) {
        throw new Error("A party tele van (max 10 játékos)")
      }

      const { error: memberError } = await supabase
        .from("party_members")
        .insert({
          party_id: partyData.id,
          user_id: userId,
          is_ready: false,
        })

      if (memberError) throw memberError

      await fetchPartyData(partyData.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hiba történt")
    } finally {
      setLoading(false)
    }
  }

  const leaveParty = async () => {
    if (!party) return
    setLoading(true)

    try {
      const isHost = party.host_id === userId

      await supabase
        .from("party_members")
        .delete()
        .eq("party_id", party.id)
        .eq("user_id", userId)

      if (isHost) {
        const remainingMembers = members.filter((m) => m.user_id !== userId)
        if (remainingMembers.length > 0) {
          await supabase
            .from("parties")
            .update({ host_id: remainingMembers[0].user_id })
            .eq("id", party.id)
        } else {
          await supabase.from("parties").delete().eq("id", party.id)
        }
      }

      setParty(null)
      setMembers([])
      onLeave()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hiba történt")
    } finally {
      setLoading(false)
    }
  }

  const copyCode = async () => {
    if (!party?.code) return
    await navigator.clipboard.writeText(party.code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selectGame = async (gameType: GameType) => {
    if (!party || party.host_id !== userId) return
    
    setSelectedGame(gameType)
    await supabase
      .from("parties")
      .update({ game_type: gameType })
      .eq("id", party.id)
  }

  const startGame = async () => {
    if (!party || !selectedGame || party.host_id !== userId) return
    
    await supabase
      .from("parties")
      .update({ status: "playing" })
      .eq("id", party.id)

    onStartGame(selectedGame, party.id, members)
  }

  const isHost = party?.host_id === userId

  // No party yet - show create/join screen
  if (!party) {
    return (
      <div className="min-h-screen bg-background p-4">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={onLeave}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-amber-400">Online Party</h1>
        </div>

        <div className="max-w-md mx-auto space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-amber-500/30 shadow-lg shadow-amber-500/20">
              <Image
                src="/logo.png"
                alt="Drunk Deck"
                width={96}
                height={96}
                className="object-cover scale-125"
              />
            </div>
          </div>

          <div className="text-center text-muted-foreground">
            Üdvözöllek, <span className="text-amber-400 font-semibold">{username}</span>!
          </div>

          {/* Create Party */}
          <Button
            onClick={createParty}
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black h-14 text-lg font-semibold rounded-2xl"
          >
            {loading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Crown className="h-5 w-5 mr-2" />
                Új Party létrehozása
              </>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">vagy</span>
            </div>
          </div>

          {/* Join Party */}
          <div className="space-y-3">
            <Input
              placeholder="Party kód (pl. ABC123)"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              className="text-center text-lg tracking-widest bg-zinc-900/50 border-zinc-700 uppercase h-14 rounded-2xl"
              maxLength={6}
            />
            <Button
              onClick={joinParty}
              disabled={loading || joinCode.length < 6}
              variant="outline"
              className="w-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10 h-12 rounded-2xl bg-transparent"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Csatlakozás
            </Button>
          </div>

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-xl text-center">
              {error}
            </p>
          )}
        </div>
      </div>
    )
  }

  // In party - show lobby
  return (
    <div className="min-h-screen bg-background p-4">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={leaveParty} disabled={loading}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-xl font-bold text-amber-400">Party Lobby</h1>
      </div>

      <div className="max-w-2xl mx-auto space-y-6">
        {/* Party Code */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="pt-6">
            <div className="text-center mb-2 text-sm text-muted-foreground">Party Kód</div>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl font-mono font-bold tracking-widest text-amber-400">
                {party.code}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={copyCode}
                className="border-amber-500/30 bg-transparent hover:bg-amber-500/10"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-center text-muted-foreground text-sm mt-2">
              Oszd meg a barátaiddal!
            </p>
          </CardContent>
        </Card>

        {/* Members */}
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-400" />
              Játékosok ({members.length}/10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-700 overflow-hidden flex items-center justify-center border border-amber-500/30">
                      {member.profiles?.avatar_url ? (
                        <Image
                          src={member.profiles.avatar_url || "/placeholder.svg"}
                          alt={member.profiles?.username || "Avatar"}
                          width={40}
                          height={40}
                          className="object-cover"
                        />
                      ) : (
                        <User className="w-5 h-5 text-zinc-400" />
                      )}
                    </div>
                    <span className="font-medium">
                      {member.profiles?.username || "Ismeretlen"}
                    </span>
                    {member.user_id === userId && (
                      <Badge variant="outline" className="text-xs border-amber-500/30 text-amber-400">
                        Te
                      </Badge>
                    )}
                  </div>
                  {party.host_id === member.user_id && (
                    <Crown className="h-5 w-5 text-amber-400" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Game Selection - Host only */}
        {isHost && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Válassz játékot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {GAMES.map((game) => (
                  <button
                    key={game.type}
                    onClick={() => selectGame(game.type)}
                    className={`p-3 rounded-xl text-left transition-all flex items-center gap-3 ${
                      selectedGame === game.type
                        ? "bg-amber-500/20 border-2 border-amber-500"
                        : "bg-zinc-800/50 border-2 border-transparent hover:border-amber-500/30"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-amber-500/30">
                      <Image
                        src={game.icon || "/placeholder.svg"}
                        alt={game.name}
                        width={48}
                        height={48}
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{game.name}</div>
                      <div className="text-xs text-muted-foreground">{game.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Selected game - Non-host */}
        {!isHost && selectedGame && (
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">
                Kiválasztott játék: <span className="text-amber-400 font-semibold">
                  {GAMES.find((g) => g.type === selectedGame)?.name}
                </span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Várakozás a host-ra...
              </p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={leaveParty}
            disabled={loading}
            className="flex-1 border-red-500/30 text-red-400 hover:bg-red-500/10 h-12 rounded-xl bg-transparent"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Kilépés
          </Button>
          
          {isHost && (
            <Button
              onClick={startGame}
              disabled={loading || !selectedGame || members.length < 2}
              className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black h-12 rounded-xl font-semibold"
            >
              <Play className="h-4 w-4 mr-2" />
              Játék indítása
            </Button>
          )}
        </div>

        {members.length < 2 && isHost && (
          <p className="text-sm text-muted-foreground text-center">
            Minimum 2 játékos szükséges a játék indításához
          </p>
        )}

        {error && (
          <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-xl text-center">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
