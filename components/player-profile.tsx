"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Trophy,
  Swords,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
} from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"
import { ru } from "date-fns/locale"
import { STATUS_LABELS, MATCH_TYPE_LABELS } from "@/lib/elo"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

interface Player {
  id: string
  name: string
  bio: string | null
  rating: number
  wins: number
  losses: number
  matches_count: number
  calibration_matches_count: number
  last_match_at: string | null
  status_active: string
  created_at: string
}

interface RatingEntry {
  id: string
  rating_before: number
  rating_after: number
  delta: number
  created_at: string
}

interface MatchPlayer {
  id: string
  name: string
}

interface Match {
  id: string
  player_a_id: string
  player_b_id: string
  match_type: string
  score_a_games: number
  score_b_games: number
  status: string
  played_at: string
  player_a: MatchPlayer
  player_b: MatchPlayer
}

export function PlayerProfile({
  player,
  ratingHistory,
  recentMatches,
  position,
}: {
  player: Player
  ratingHistory: RatingEntry[]
  recentMatches: Match[]
  position: number
}) {
  const winRate =
    player.matches_count > 0
      ? Math.round((player.wins / player.matches_count) * 100)
      : 0

  const chartData = [
    { date: format(new Date(player.created_at), "dd.MM"), rating: 1500 },
    ...ratingHistory.map((entry) => ({
      date: format(new Date(entry.created_at), "dd.MM"),
      rating: entry.rating_after,
    })),
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <User className="h-8 w-8 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground">
              {player.name}
            </h1>
            {player.calibration_matches_count < 10 && (
              <Badge variant="outline">Калибровка</Badge>
            )}
            {player.status_active === "na" && (
              <Badge variant="secondary">Неактивен</Badge>
            )}
          </div>
          {player.bio && (
            <p className="text-muted-foreground text-sm mt-1">{player.bio}</p>
          )}
          <p className="text-muted-foreground text-xs mt-1">
            {"Участник с "}
            {format(new Date(player.created_at), "d MMMM yyyy", {
              locale: ru,
            })}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
              <Trophy className="h-3.5 w-3.5" />
              Позиция
            </div>
            <p className="text-xl font-bold">
              {"#"}
              {position}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Рейтинг
            </div>
            <p className="text-xl font-bold tabular-nums">{player.rating}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-1">
              <Swords className="h-3.5 w-3.5" />
              Матчи
            </div>
            <p className="text-xl font-bold tabular-nums">
              {player.matches_count}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-1.5 text-amber-600 text-xs mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Победы
            </div>
            <p className="text-xl font-bold tabular-nums">
              {player.wins}
              <span className="text-sm font-normal text-muted-foreground">
                {" (" + winRate + "%)"}
              </span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-1.5 text-red-500 text-xs mb-1">
              <TrendingDown className="h-3.5 w-3.5" />
              Поражения
            </div>
            <p className="text-xl font-bold tabular-nums">{player.losses}</p>
          </CardContent>
        </Card>
      </div>

      {chartData.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">История рейтинга</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis
                    domain={["dataMin - 50", "dataMax + 50"]}
                    tick={{ fontSize: 12 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rating"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "hsl(var(--primary))" }}
                    name="Рейтинг"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Последние матчи</CardTitle>
        </CardHeader>
        <CardContent>
          {recentMatches.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">
              Нет подтверждённых матчей
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {recentMatches.map((match) => {
                const isPlayerA = match.player_a_id === player.id
                const opponent = isPlayerA ? match.player_b : match.player_a
                const myScore = isPlayerA
                  ? match.score_a_games
                  : match.score_b_games
                const oppScore = isPlayerA
                  ? match.score_b_games
                  : match.score_a_games
                const won = myScore > oppScore

                return (
                  <Link
                    key={match.id}
                    href={`/matches/${match.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          won
                            ? "bg-amber-100 text-amber-800"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {won ? "W" : "L"}
                      </div>
                      <div>
                        <span className="text-sm font-medium">
                          {"vs "}
                          {opponent.name}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {MATCH_TYPE_LABELS[match.match_type]}
                          {" \u2022 "}
                          {format(new Date(match.played_at), "d MMM yyyy", {
                            locale: ru,
                          })}
                        </p>
                      </div>
                    </div>
                    <span className="font-bold tabular-nums text-sm">
                      {myScore}
                      {":"}
                      {oppScore}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
