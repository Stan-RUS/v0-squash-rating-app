"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Trophy,
  Swords,
  TrendingUp,
  TrendingDown,
  Plus,
  Clock,
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"
import { STATUS_LABELS, MATCH_TYPE_LABELS } from "@/lib/elo"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

interface Player {
  id: string
  name: string
  rating: number
  wins: number
  losses: number
  matches_count: number
  calibration_matches_count: number
  role: string
}

interface MatchPlayer {
  id: string
  name: string
}

interface Match {
  id: string
  player_a_id: string
  player_b_id: string
  created_by_player_id: string
  match_type: string
  score_a_games: number
  score_b_games: number
  status: string
  played_at: string
  created_at: string
  player_a: MatchPlayer
  player_b: MatchPlayer
}

interface Notification {
  id: string
  type: string
  title: string
  body: string
  link: string | null
  read: boolean
  created_at: string
}

export function DashboardContent({
  player,
  recentMatches,
  pendingMatches,
  notifications,
}: {
  player: Player
  recentMatches: Match[]
  pendingMatches: Match[]
  notifications: Notification[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const defaultTab = searchParams.get("tab") || "overview"
  const winRate =
    player.matches_count > 0
      ? Math.round((player.wins / player.matches_count) * 100)
      : 0

  const markNotificationRead = async (id: string) => {
    const supabase = createClient()
    await supabase.from("notifications").update({ read: true }).eq("id", id)
    router.refresh()
  }

  const markAllRead = async () => {
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false)
    toast.success("Все уведомления отмечены как прочитанные")
    router.refresh()
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {"Привет, "}
            {player.name}
          </h1>
          <p className="text-muted-foreground text-sm">
            {player.calibration_matches_count < 10
              ? `Калибровка: ${player.calibration_matches_count}/10 матчей`
              : "Рейтинг активен"}
          </p>
        </div>
        <Link href="/matches/new">
          <Button className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Новый матч</span>
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Trophy className="h-4 w-4" />
              Рейтинг
            </div>
            <p className="text-2xl font-bold tabular-nums">{player.rating}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <Swords className="h-4 w-4" />
              Матчи
            </div>
            <p className="text-2xl font-bold tabular-nums">
              {player.matches_count}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-amber-600 text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              Победы
            </div>
            <p className="text-2xl font-bold tabular-nums">{player.wins}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
              <TrendingDown className="h-4 w-4" />
              {"Винрейт"}
            </div>
            <p className="text-2xl font-bold tabular-nums">{winRate}%</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="pending" className="gap-1.5">
            Входящие
            {pendingMatches.length > 0 && (
              <Badge
                variant="destructive"
                className="h-5 min-w-5 px-1 text-xs"
              >
                {pendingMatches.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="h-5 min-w-5 px-1 text-xs"
              >
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Последние матчи</CardTitle>
            </CardHeader>
            <CardContent>
              {recentMatches.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  У вас ещё нет матчей.{" "}
                  <Link href="/matches/new" className="text-primary underline underline-offset-4">
                    Записать первый матч
                  </Link>
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {recentMatches.map((match) => (
                    <MatchRow
                      key={match.id}
                      match={match}
                      currentPlayerId={player.id}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Ожидают подтверждения
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingMatches.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  Нет матчей, ожидающих вашего подтверждения
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {pendingMatches.map((match) => (
                    <Link
                      key={match.id}
                      href={`/matches/${match.id}`}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">
                          {match.player_a.name}
                          {" vs "}
                          {match.player_b.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {match.score_a_games}
                          {":"}
                          {match.score_b_games}
                          {" \u2022 "}
                          {MATCH_TYPE_LABELS[match.match_type]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="border-amber-500 text-amber-600"
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          Ожидает
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Уведомления</CardTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllRead}
                  className="text-xs"
                >
                  Прочитать все
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4 text-center">
                  Нет уведомлений
                </p>
              ) : (
                <div className="flex flex-col gap-1">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
                        notif.read
                          ? "opacity-60"
                          : "bg-primary/5 hover:bg-primary/10"
                      }`}
                      onClick={() => {
                        if (!notif.read) markNotificationRead(notif.id)
                        if (notif.link) router.push(notif.link)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          if (!notif.read) markNotificationRead(notif.id)
                          if (notif.link) router.push(notif.link)
                        }
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="mt-0.5">
                        <NotificationIcon type={notif.type} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{notif.title}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {notif.body}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(notif.created_at), {
                            addSuffix: true,
                            locale: ru,
                          })}
                        </p>
                      </div>
                      {!notif.read && (
                        <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case "match_confirmed":
      return <CheckCircle2 className="h-4 w-4 text-amber-600" />
    case "match_rejected":
      return <XCircle className="h-4 w-4 text-destructive" />
    case "match_disputed":
      return <AlertTriangle className="h-4 w-4 text-amber-500" />
    default:
      return <Bell className="h-4 w-4 text-muted-foreground" />
  }
}

function MatchRow({
  match,
  currentPlayerId,
}: {
  match: Match
  currentPlayerId: string
}) {
  const isPlayerA = match.player_a_id === currentPlayerId
  const opponent = isPlayerA ? match.player_b : match.player_a
  const myScore = isPlayerA ? match.score_a_games : match.score_b_games
  const oppScore = isPlayerA ? match.score_b_games : match.score_a_games
  const won = myScore > oppScore

  const statusColor: Record<string, string> = {
    pending: "border-amber-500 text-amber-600",
    confirmed: "border-amber-500 text-amber-700",
    rejected: "border-red-500 text-red-600",
    disputed: "border-orange-500 text-orange-600",
    voided: "border-slate-400 text-slate-500",
  }

  return (
    <Link
      href={`/matches/${match.id}`}
      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
            won
              ? "bg-amber-100 text-amber-800"
              : "bg-red-100 text-red-700"
          }`}
        >
          {won ? "W" : "L"}
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">
            {"vs "}
            {opponent.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {MATCH_TYPE_LABELS[match.match_type]}
            {" \u2022 "}
            {formatDistanceToNow(new Date(match.played_at), {
              addSuffix: true,
              locale: ru,
            })}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-bold tabular-nums text-sm">
          {myScore}
          {":"}
          {oppScore}
        </span>
        <Badge
          variant="outline"
          className={statusColor[match.status] ?? ""}
        >
          {STATUS_LABELS[match.status]}
        </Badge>
      </div>
    </Link>
  )
}
