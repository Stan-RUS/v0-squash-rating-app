"use client"

import React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Calendar,
  Swords,
  TrendingUp,
  TrendingDown,
  Loader2,
  ArrowLeft,
} from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { STATUS_LABELS, MATCH_TYPE_LABELS } from "@/lib/elo"
import { toast } from "sonner"

interface Player {
  id: string
  name: string
  rating: number
}

interface Match {
  id: string
  player_a_id: string
  player_b_id: string
  created_by_player_id: string
  match_type: string
  format: string
  score_a_games: number
  score_b_games: number
  games_details: { score_a: number; score_b: number }[] | null
  status: string
  played_at: string
  created_at: string
  confirm_deadline_at: string | null
  rating_a_at_time: number | null
  rating_b_at_time: number | null
  player_a: Player
  player_b: Player
}

interface Confirmation {
  id: string
  action: string
  comment: string | null
  created_at: string
  responder: { name: string }
}

interface RatingChange {
  player_id: string
  rating_before: number
  rating_after: number
  delta: number
}

export function MatchDetails({
  match,
  confirmations,
  ratingChanges,
  currentPlayer,
}: {
  match: Match
  confirmations: Confirmation[]
  ratingChanges: RatingChange[]
  currentPlayer: { id: string; role: string } | null
}) {
  const router = useRouter()
  const [comment, setComment] = useState("")
  const [loading, setLoading] = useState(false)

  const isInvolved =
    currentPlayer?.id === match.player_a_id ||
    currentPlayer?.id === match.player_b_id
  const isCreator = currentPlayer?.id === match.created_by_player_id
  const canRespond = match.status === "pending" && isInvolved && !isCreator

  const handleAction = async (action: "confirm" | "reject" | "dispute") => {
    setLoading(true)
    try {
      const res = await fetch(`/api/matches/${match.id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, comment: comment || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || "Ошибка")
        return
      }

      const messages: Record<string, string> = {
        confirm: "Матч подтверждён! Рейтинги обновлены.",
        reject: "Матч отклонён.",
        dispute: "Матч оспорен. Администратор рассмотрит спор.",
      }
      toast.success(messages[action])
      router.refresh()
    } catch {
      toast.error("Ошибка сети")
    } finally {
      setLoading(false)
    }
  }

  const aWon = match.score_a_games > match.score_b_games
  const ratingA = ratingChanges.find((r) => r.player_id === match.player_a_id)
  const ratingB = ratingChanges.find((r) => r.player_id === match.player_b_id)

  const statusConfig: Record<string, { color: string; icon: React.ReactNode }> = {
    pending: {
      color: "border-amber-500 text-amber-600 bg-amber-50",
      icon: <Calendar className="h-3.5 w-3.5" />,
    },
    confirmed: {
      color: "border-amber-500 text-amber-700 bg-amber-50",
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
    },
    rejected: {
      color: "border-red-500 text-red-600 bg-red-50",
      icon: <XCircle className="h-3.5 w-3.5" />,
    },
    disputed: {
      color: "border-orange-500 text-orange-600 bg-orange-50",
      icon: <AlertTriangle className="h-3.5 w-3.5" />,
    },
    voided: {
      color: "border-slate-400 text-slate-500 bg-slate-50",
      icon: <XCircle className="h-3.5 w-3.5" />,
    },
  }

  const config = statusConfig[match.status] ?? statusConfig.pending

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="h-8 w-8"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-bold text-foreground">Детали матча</h1>
      </div>

      {/* Main score card */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center justify-between mb-4">
            <Badge className={config.color + " gap-1"}>
              {config.icon}
              {STATUS_LABELS[match.status]}
            </Badge>
            <span className="text-sm text-muted-foreground">
              {MATCH_TYPE_LABELS[match.match_type]}
            </span>
          </div>

          <div className="flex items-center justify-center gap-4 sm:gap-8 py-4">
            <div className="flex flex-col items-center gap-1 flex-1">
              <Link
                href={`/players/${match.player_a.id}`}
                className="font-semibold text-foreground hover:text-primary text-center hover:underline underline-offset-4"
              >
                {match.player_a.name}
              </Link>
              {match.rating_a_at_time && (
                <span className="text-xs text-muted-foreground">
                  {match.rating_a_at_time}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`text-3xl sm:text-4xl font-bold tabular-nums ${
                  aWon ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {match.score_a_games}
              </span>
              <span className="text-xl text-muted-foreground">:</span>
              <span
                className={`text-3xl sm:text-4xl font-bold tabular-nums ${
                  !aWon ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {match.score_b_games}
              </span>
            </div>

            <div className="flex flex-col items-center gap-1 flex-1">
              <Link
                href={`/players/${match.player_b.id}`}
                className="font-semibold text-foreground hover:text-primary text-center hover:underline underline-offset-4"
              >
                {match.player_b.name}
              </Link>
              {match.rating_b_at_time && (
                <span className="text-xs text-muted-foreground">
                  {match.rating_b_at_time}
                </span>
              )}
            </div>
          </div>

          {/* Game details */}
          {match.games_details && match.games_details.length > 0 && (
            <div className="flex items-center justify-center gap-3 mt-2">
              {match.games_details.map((game, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="tabular-nums text-sm px-3 py-1"
                >
                  {game.score_a}
                  {":"}
                  {game.score_b}
                </Badge>
              ))}
            </div>
          )}

          <Separator className="my-4" />

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(match.played_at), "d MMMM yyyy, HH:mm", {
                locale: ru,
              })}
            </div>
            <span>
              {"Bo"}
              {match.format === "bo3" ? "3" : "?"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Rating changes */}
      {ratingChanges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Изменение рейтинга</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3">
              {[
                { player: match.player_a, change: ratingA },
                { player: match.player_b, change: ratingB },
              ].map(
                ({ player, change }) =>
                  change && (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <span className="font-medium text-sm">{player.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {change.rating_before}
                        </span>
                        <span className="text-muted-foreground">{"\u2192"}</span>
                        <span className="text-sm font-bold tabular-nums">
                          {change.rating_after}
                        </span>
                        <Badge
                          className={
                            change.delta >= 0
                              ? "bg-amber-100 text-amber-800 hover:bg-amber-100"
                              : "bg-red-100 text-red-700 hover:bg-red-100"
                          }
                        >
                          {change.delta >= 0 ? (
                            <TrendingUp className="h-3 w-3 mr-1" />
                          ) : (
                            <TrendingDown className="h-3 w-3 mr-1" />
                          )}
                          {change.delta > 0 ? "+" : ""}
                          {change.delta}
                        </Badge>
                      </div>
                    </div>
                  )
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation actions */}
      {canRespond && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg">Подтверждение</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Textarea
              placeholder="Комментарий (необязательно)..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={2}
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                className="flex-1 gap-1.5"
                onClick={() => handleAction("confirm")}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Подтвердить
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-1.5 border-destructive text-destructive hover:bg-destructive/5 bg-transparent"
                onClick={() => handleAction("reject")}
                disabled={loading}
              >
                <XCircle className="h-4 w-4" />
                Отклонить
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-1.5 border-amber-500 text-amber-600 hover:bg-amber-50 bg-transparent"
                onClick={() => handleAction("dispute")}
                disabled={loading}
              >
                <AlertTriangle className="h-4 w-4" />
                Оспорить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation history */}
      {confirmations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              История подтверждений
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {confirmations.map((conf) => {
                const actionIcons: Record<string, React.ReactNode> = {
                  confirm: (
                    <CheckCircle2 className="h-4 w-4 text-amber-600" />
                  ),
                  reject: <XCircle className="h-4 w-4 text-red-500" />,
                  dispute: (
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                  ),
                }
                const actionLabels: Record<string, string> = {
                  confirm: "подтвердил",
                  reject: "отклонил",
                  dispute: "оспорил",
                }
                return (
                  <div
                    key={conf.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="mt-0.5">
                      {actionIcons[conf.action]}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium">
                          {conf.responder.name}
                        </span>
                        {" "}
                        {actionLabels[conf.action]}
                        {" матч"}
                      </p>
                      {conf.comment && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {"\u00AB"}
                          {conf.comment}
                          {"\u00BB"}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(
                          new Date(conf.created_at),
                          "d MMM yyyy, HH:mm",
                          { locale: ru }
                        )}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
