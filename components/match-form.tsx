"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Loader2, Check, ChevronsUpDown, Swords } from "lucide-react"
import { cn } from "@/lib/utils"
import { MATCH_TYPE_LABELS } from "@/lib/elo"
import { toast } from "sonner"

interface PlayerOption {
  id: string
  name: string
  rating: number
}

interface RatingSettings {
  pending_expiry_days: number
  anti_duplicate_hours: number
}

export function MatchForm({
  currentPlayer,
  opponents,
  allPlayers,
  isAdmin,
  settings,
}: {
  currentPlayer: PlayerOption
  opponents: PlayerOption[]
  allPlayers: PlayerOption[]
  isAdmin: boolean
  settings: RatingSettings | null
}) {
  const router = useRouter()
  // Admin mode: select both players
  const [playerAId, setPlayerAId] = useState("")
  const [playerBId, setPlayerBId] = useState("")
  const [playerAOpen, setPlayerAOpen] = useState(false)
  const [playerBOpen, setPlayerBOpen] = useState(false)
  // Regular mode: select opponent only
  const [opponentId, setOpponentId] = useState("")
  const [opponentOpen, setOpponentOpen] = useState(false)

  const [matchType, setMatchType] = useState("friendly")
  const [scoreA, setScoreA] = useState<number | null>(null)
  const [scoreB, setScoreB] = useState<number | null>(null)
  const [games, setGames] = useState<
    { scoreA: string; scoreB: string }[]
  >([
    { scoreA: "", scoreB: "" },
    { scoreA: "", scoreB: "" },
    { scoreA: "", scoreB: "" },
  ])
  const [loading, setLoading] = useState(false)

  // Resolve the actual players based on mode
  const effectivePlayerA = isAdmin
    ? allPlayers.find((p) => p.id === playerAId)
    : currentPlayer
  const effectivePlayerB = isAdmin
    ? allPlayers.find((p) => p.id === playerBId)
    : opponents.find((p) => p.id === opponentId)

  // Filter options so admin can't pick the same player twice
  const playerAOptions = allPlayers
  const playerBOptions = allPlayers.filter((p) => p.id !== playerAId)

  const handleScoreSelect = (a: number, b: number) => {
    setScoreA(a)
    setScoreB(b)
  }

  const totalGames = scoreA !== null && scoreB !== null ? (scoreA + scoreB) : 0

  const handleSubmit = async () => {
    if (isAdmin) {
      if (!playerAId || !playerBId) {
        toast.error("Выберите обоих игроков")
        return
      }
    } else {
      if (!opponentId) {
        toast.error("Выберите соперника")
        return
      }
    }
    if (scoreA === null || scoreB === null) {
      toast.error("Выберите счёт по играм")
      return
    }

    // Validate game details
    const gameDetails = games.slice(0, totalGames).map((g) => ({
      score_a: parseInt(g.scoreA) || 0,
      score_b: parseInt(g.scoreB) || 0,
    }))

    const validGames = gameDetails.every(
      (g) => g.score_a >= 0 && g.score_b >= 0 && (g.score_a > 0 || g.score_b > 0)
    )

    if (!validGames && totalGames > 0) {
      toast.error("Заполните счёт по геймам")
      return
    }

    setLoading(true)

    const supabase = createClient()

    const finalPlayerAId = isAdmin ? playerAId : currentPlayer.id
    const finalPlayerBId = isAdmin ? playerBId : opponentId

    const expiryDays = settings?.pending_expiry_days ?? 14
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + expiryDays)

    // Admin-created matches are auto-confirmed
    const matchStatus = isAdmin ? "confirmed" : "pending"

    const { data: match, error } = await supabase
      .from("matches")
      .insert({
        player_a_id: finalPlayerAId,
        player_b_id: finalPlayerBId,
        created_by_player_id: currentPlayer.id,
        match_type: matchType,
        score_a_games: scoreA,
        score_b_games: scoreB,
        games_details: gameDetails.length > 0 ? gameDetails : null,
        status: matchStatus,
        confirm_deadline_at: deadline.toISOString(),
        rating_a_at_time: effectivePlayerA?.rating ?? 1500,
        rating_b_at_time: effectivePlayerB?.rating ?? 1500,
        admin_created: isAdmin,
        confirmed_at: isAdmin ? new Date().toISOString() : null,
      })
      .select("id")
      .single()

    if (error) {
      toast.error("Ошибка: " + error.message)
      setLoading(false)
      return
    }

    // If admin-created and confirmed, update ratings
    if (isAdmin && effectivePlayerA && effectivePlayerB) {
      const { calculateElo, getKFactor } = await import("@/lib/elo")
      const kA = getKFactor(matchType, effectivePlayerA.rating)
      const kB = getKFactor(matchType, effectivePlayerB.rating)
      const resultA = scoreA > scoreB ? 1 : scoreA < scoreB ? 0 : 0.5
      const { newRatingA, newRatingB } = calculateElo(
        effectivePlayerA.rating,
        effectivePlayerB.rating,
        resultA,
        kA,
        kB
      )

      await supabase
        .from("matches")
        .update({
          rating_a_change: newRatingA - effectivePlayerA.rating,
          rating_b_change: newRatingB - effectivePlayerB.rating,
        })
        .eq("id", match.id)

      await supabase
        .from("players")
        .update({ rating: newRatingA })
        .eq("id", finalPlayerAId)

      await supabase
        .from("players")
        .update({ rating: newRatingB })
        .eq("id", finalPlayerBId)

      toast.success("Матч записан и подтверждён. Рейтинги обновлены.")
    } else {
      // Create notification for opponent (non-admin flow)
      if (effectivePlayerB) {
        const { data: oppPlayer } = await supabase
          .from("players")
          .select("user_id")
          .eq("id", finalPlayerBId)
          .single()

        if (oppPlayer?.user_id) {
          await supabase.from("notifications").insert({
            user_id: oppPlayer.user_id,
            type: "match_pending",
            title: "Новый матч для подтверждения",
            body: `${currentPlayer.name} записал матч: ${scoreA}:${scoreB}`,
            link: `/matches/${match.id}`,
          })
        }
      }

      toast.success("Матч записан! Ожидает подтверждения соперника.")
    }

    router.push("/dashboard")
    router.refresh()
  }

  const scoreOptions = [
    { a: 2, b: 0, label: "2 : 0" },
    { a: 2, b: 1, label: "2 : 1" },
    { a: 1, b: 2, label: "1 : 2" },
    { a: 0, b: 2, label: "0 : 2" },
  ]

  const renderPlayerSelector = (
    label: string,
    placeholder: string,
    selectedId: string,
    setSelectedId: (id: string) => void,
    open: boolean,
    setOpen: (open: boolean) => void,
    options: PlayerOption[]
  ) => {
    const selected = options.find((p) => p.id === selectedId)
    return (
      <div className="flex flex-col gap-2">
        <Label>{label}</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="justify-between h-10 bg-transparent"
            >
              {selected ? (
                <span className="flex items-center gap-2">
                  {selected.name}
                  <Badge variant="secondary" className="text-xs">
                    {selected.rating}
                  </Badge>
                </span>
              ) : (
                <span className="text-muted-foreground">
                  {placeholder}
                </span>
              )}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start">
            <Command>
              <CommandInput placeholder="Поиск..." />
              <CommandList>
                <CommandEmpty>Не найдено</CommandEmpty>
                <CommandGroup>
                  {options.map((p) => (
                    <CommandItem
                      key={p.id}
                      value={p.name}
                      onSelect={() => {
                        setSelectedId(p.id)
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedId === p.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <span className="flex-1">{p.name}</span>
                      <Badge variant="secondary" className="text-xs ml-2">
                        {p.rating}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  const isPlayersSelected = isAdmin
    ? !!(playerAId && playerBId)
    : !!opponentId

  return (
    <div className="flex flex-col gap-5">
      {/* Admin badge */}
      {isAdmin && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-3 pb-3">
            <p className="text-sm text-center text-primary font-medium">
              {"Режим администратора: матч будет автоматически подтверждён"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Player selection */}
      {isAdmin ? (
        <>
          {renderPlayerSelector(
            "Игрок A",
            "Выберите игрока A...",
            playerAId,
            setPlayerAId,
            playerAOpen,
            setPlayerAOpen,
            playerAOptions
          )}
          {renderPlayerSelector(
            "Игрок B",
            "Выберите игрока B...",
            playerBId,
            setPlayerBId,
            playerBOpen,
            setPlayerBOpen,
            playerBOptions
          )}
        </>
      ) : (
        renderPlayerSelector(
          "Соперник",
          "Выберите соперника...",
          opponentId,
          setOpponentId,
          opponentOpen,
          setOpponentOpen,
          opponents
        )
      )}

      {/* Match type */}
      <div className="flex flex-col gap-2">
        <Label>Тип матча</Label>
        <Select value={matchType} onValueChange={setMatchType}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(MATCH_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Score (bo3) */}
      <div className="flex flex-col gap-2">
        <Label>Счёт по играм (best of 3)</Label>
        <div className="grid grid-cols-4 gap-2">
          {scoreOptions.map((opt) => (
            <Button
              key={opt.label}
              type="button"
              variant={
                scoreA === opt.a && scoreB === opt.b ? "default" : "outline"
              }
              className={cn(
                "h-12 text-base font-bold tabular-nums",
                scoreA === opt.a && scoreB === opt.b
                  ? ""
                  : "hover:border-primary"
              )}
              onClick={() => handleScoreSelect(opt.a, opt.b)}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Game details */}
      {totalGames > 0 && (
        <div className="flex flex-col gap-3">
          <Label>
            {"Счёт по геймам (необязательно)"}
          </Label>
          {games.slice(0, totalGames).map((game, idx) => (
            <Card key={idx}>
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground w-14 shrink-0">
                    {"Игра "}
                    {idx + 1}
                  </span>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    placeholder={effectivePlayerA?.name.split(" ")[0] ?? "Игрок A"}
                    value={game.scoreA}
                    onChange={(e) => {
                      const updated = [...games]
                      updated[idx] = { ...updated[idx], scoreA: e.target.value }
                      setGames(updated)
                    }}
                    className="text-center tabular-nums h-9"
                  />
                  <span className="text-muted-foreground font-bold">:</span>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    placeholder={effectivePlayerB?.name.split(" ")[0] ?? "Игрок B"}
                    value={game.scoreB}
                    onChange={(e) => {
                      const updated = [...games]
                      updated[idx] = { ...updated[idx], scoreB: e.target.value }
                      setGames(updated)
                    }}
                    className="text-center tabular-nums h-9"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Submit */}
      <Button
        size="lg"
        className="w-full gap-2"
        onClick={handleSubmit}
        disabled={loading || !isPlayersSelected || scoreA === null || scoreB === null}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Swords className="h-4 w-4" />
            Записать матч
          </>
        )}
      </Button>

      {effectivePlayerA && effectivePlayerB && scoreA !== null && scoreB !== null && (
        <Card className="bg-muted/50">
          <CardContent className="pt-4 pb-4">
            <p className="text-sm text-center text-muted-foreground">
              {effectivePlayerA.name}
              {" ("}
              {effectivePlayerA.rating}
              {") "}
              <span className="font-bold text-foreground">
                {scoreA}
                {" : "}
                {scoreB}
              </span>
              {" "}
              {effectivePlayerB.name}
              {" ("}
              {effectivePlayerB.rating}
              {")"}
            </p>
            <p className="text-xs text-center text-muted-foreground mt-1">
              {isAdmin
                ? "Матч будет автоматически подтверждён администратором"
                : `Матч будет отправлен ${effectivePlayerB.name} для подтверждения`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
