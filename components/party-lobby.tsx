"use client"

import { useState, useEffect, useCallback } from "react"
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
  UserPlus
} from "lucide-react"
import type { GameType } from "@/lib/game-types"

interface PartyMember {
  id: string
  user_id: string
  is_host: boolean
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
        is_host,
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
          is_host: true,
          is_ready: true,
        })

      if (memberError) throw memberError

      await fetchPartyData(partyData.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hiba tortent")
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
        throw new Error("Party nem talalhato vagy mar elkezdodott")
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
        throw new Error("A party tele van (max 10 jatekos)")
      }

      const { error: memberError } = await supabase
        .from("party_members")
        .insert({
          party_id: partyData.id,
          user_id: userId,
          is_host: false,
          is_ready: false,
        })

      if (memberError) throw memberError

      await fetchPartyData(partyData.id)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hiba tortent")
    } finally {
      setLoading(false)
    }
  }

  const leaveParty = async () => {
    if (!party) return
    setLoading(true)

    try {
      const isHost = members.find((m) => m.user_id === userId)?.is_host

      await supabase
        .from("party_members")
        .delete()
        .eq("party_id", party.id)
        .eq("user_id", userId)

      if (isHost) {
        const remainingMembers = members.filter((m) => m.user_id !== userId)
        if (remainingMembers.length > 0) {
          await supabase
            .from("party_members")
            .update({ is_host: true })
            .eq("id", remainingMembers[0].id)

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
      setError(err instanceof Error ? err.message : "Hiba tortent")
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

  const games: { type: GameType; name: string; description: string }[] = [
    { type: "kings-cup", name: "4 Kiraly", description: "Klasszikus kartya jatek" },
    { type: "ride-the-bus", name: "Busz", description: "Talalj a szinre es szamra" },
    { type: "blackjack", name: "Blackjack", description: "21-es ivasos verzio" },
  ]

  if (!party) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Card className="w-full max-w-md bg-card border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-foreground flex items-center justify-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Online Party
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center text-muted-foreground">
              Udvozollek, <span className="text-primary font-semibold">{username}</span>!
            </div>

            <Button
              onClick={createParty}
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-14 text-lg"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Crown className="h-5 w-5 mr-2" />
                  Uj Party letrehozasa
                </>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">vagy</span>
              </div>
            </div>

            <div className="space-y-3">
              <Input
                placeholder="Party kod (pl. ABC123)"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="text-center text-lg tracking-widest bg-background border-border text-foreground uppercase"
                maxLength={6}
              />
              <Button
                onClick={joinParty}
                disabled={loading || joinCode.length < 6}
                variant="outline"
                className="w-full border-border text-foreground hover:bg-accent h-12 bg-transparent"
              >
                <UserPlus className="h-5 w-5 mr-2" />
                Csatlakozas
              </Button>
            </div>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg text-center">
                {error}
              </p>
            )}

            <Button
              variant="ghost"
              onClick={onLeave}
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Vissza a fomenube
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card className="bg-card border-border">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl text-foreground">Party Kod</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center gap-3">
              <span className="text-4xl font-mono font-bold tracking-widest text-primary">
                {party.code}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={copyCode}
                className="border-border bg-transparent"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-center text-muted-foreground text-sm mt-2">
              Oszd meg ezt a kodot a barataidddal!
            </p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Jatekosok ({members.length}/10)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-background"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                      {member.profiles?.username?.[0]?.toUpperCase() || "?"}
                    </div>
                    <span className="text-foreground font-medium">
                      {member.profiles?.username || "Ismeretlen"}
                    </span>
                    {member.user_id === userId && (
                      <Badge variant="outline" className="text-xs">
                        Te
                      </Badge>
                    )}
                  </div>
                  {member.is_host && (
                    <Crown className="h-5 w-5 text-yellow-500" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {isHost && (
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg text-foreground">Valassz jatekot</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {games.map((game) => (
                  <button
                    key={game.type}
                    onClick={() => selectGame(game.type)}
                    className={`p-4 rounded-lg text-left transition-all ${
                      selectedGame === game.type
                        ? "bg-primary text-primary-foreground ring-2 ring-primary"
                        : "bg-background hover:bg-accent text-foreground"
                    }`}
                  >
                    <div className="font-semibold">{game.name}</div>
                    <div className={`text-sm ${selectedGame === game.type ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {game.description}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {!isHost && selectedGame && (
          <Card className="bg-card border-border">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">
                Valasztott jatek: <span className="text-primary font-semibold">
                  {games.find((g) => g.type === selectedGame)?.name}
                </span>
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Varakozas a host-ra...
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={leaveParty}
            disabled={loading}
            className="flex-1 border-border text-foreground hover:bg-destructive hover:text-destructive-foreground bg-transparent"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Kilepes
          </Button>
          
          {isHost && (
            <Button
              onClick={startGame}
              disabled={loading || !selectedGame || members.length < 2}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Play className="h-4 w-4 mr-2" />
              Jatek inditasa
            </Button>
          )}
        </div>

        {error && (
          <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg text-center">
            {error}
          </p>
        )}
      </div>
    </div>
  )
}
