"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  AlertTriangle,
  Shield,
  Settings,
  FileText,
  Users,
  Loader2,
  Save,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { format } from "date-fns"
import { ru } from "date-fns/locale"
import { MATCH_TYPE_LABELS } from "@/lib/elo"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

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
  created_at: string
  player_a: MatchPlayer
  player_b: MatchPlayer
}

interface AuditEntry {
  id: string
  actor_user_id: string | null
  entity_type: string
  entity_id: string | null
  action: string
  payload: Record<string, unknown> | null
  created_at: string
}

interface PlayerRow {
  id: string
  name: string
  rating: number
  role: string
  matches_count: number
  status_active: string
  user_id: string
}

interface RatingSettingsData {
  starting_rating: number
  k_calibration: number
  k_normal: number
  k_veteran: number
  calibration_matches: number
  veteran_matches: number
  veteran_rating: number
  weight_friendly: number
  weight_ladder: number
  weight_league: number
  weight_tournament_group: number
  weight_tournament_playoffs: number
  weight_final: number
  anti_boost_threshold: number
  anti_boost_strong_wins: number
  anti_boost_strong_loses: number
  inactivity_days: number
  return_k_multiplier: number
  return_matches: number
  max_match_age_days: number
  anti_duplicate_hours: number
  pending_expiry_days: number
}

export function AdminPanel({
  disputedMatches,
  pendingMatches,
  settings,
  auditLog,
  allPlayers,
  currentUserId,
}: {
  disputedMatches: Match[]
  pendingMatches: Match[]
  settings: RatingSettingsData | null
  auditLog: AuditEntry[]
  allPlayers: PlayerRow[]
  currentUserId: string
}) {
  const router = useRouter()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Админ-панель</h1>
      </div>

      <Tabs defaultValue="disputes">
        <TabsList className="flex-wrap">
          <TabsTrigger value="disputes" className="gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Споры
            {disputedMatches.length > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 px-1 text-xs">
                {disputedMatches.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="players" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            Игроки
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" />
            Настройки
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <FileText className="h-3.5 w-3.5" />
            Аудит
          </TabsTrigger>
        </TabsList>

        <TabsContent value="disputes" className="mt-4">
          <DisputesTab
            disputedMatches={disputedMatches}
            pendingMatches={pendingMatches}
          />
        </TabsContent>

        <TabsContent value="players" className="mt-4">
          <PlayersTab players={allPlayers} currentUserId={currentUserId} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <SettingsTab settings={settings} />
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <AuditTab auditLog={auditLog} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function DisputesTab({
  disputedMatches,
  pendingMatches,
}: {
  disputedMatches: Match[]
  pendingMatches: Match[]
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const handleVoid = async (matchId: string) => {
    setLoading(matchId)
    const supabase = createClient()
    await supabase
      .from("matches")
      .update({ status: "voided" })
      .eq("id", matchId)
    await supabase.from("audit_log").insert({
      actor_user_id: (await supabase.auth.getUser()).data.user?.id,
      entity_type: "match",
      entity_id: matchId,
      action: "admin_void_match",
    })
    toast.success("Матч аннулирован")
    router.refresh()
    setLoading(null)
  }

  return (
    <div className="flex flex-col gap-4">
      {disputedMatches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg text-destructive gap-2 flex items-center">
              <AlertTriangle className="h-4 w-4" />
              Оспоренные матчи
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-2">
              {disputedMatches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-orange-200 bg-orange-50"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {match.player_a.name}
                      {" vs "}
                      {match.player_b.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {match.score_a_games}
                      {":"}
                      {match.score_b_games}
                      {" \u2022 "}
                      {MATCH_TYPE_LABELS[match.match_type]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/matches/${match.id}`}>
                      <Button variant="outline" size="sm">
                        Детали
                      </Button>
                    </Link>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleVoid(match.id)}
                      disabled={loading === match.id}
                    >
                      {loading === match.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        "Аннулировать"
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {"Ожидающие матчи ("}
            {pendingMatches.length}
            {")"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingMatches.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-4">
              Нет ожидающих матчей
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {pendingMatches.map((match) => (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {match.player_a.name}
                      {" vs "}
                      {match.player_b.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {match.score_a_games}
                      {":"}
                      {match.score_b_games}
                      {" \u2022 "}
                      {format(new Date(match.created_at), "d MMM", {
                        locale: ru,
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/matches/${match.id}`}>
                      <Button variant="outline" size="sm">
                        Просмотр
                      </Button>
                    </Link>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleVoid(match.id)}
                      disabled={loading === match.id}
                    >
                      {loading === match.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <XCircle className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PlayersTab({
  players,
  currentUserId,
}: {
  players: PlayerRow[]
  currentUserId: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)

  const toggleRole = async (playerId: string, currentRole: string) => {
    setLoading(playerId)
    const supabase = createClient()
    const newRole = currentRole === "admin" ? "player" : "admin"
    await supabase
      .from("players")
      .update({ role: newRole })
      .eq("id", playerId)
    await supabase.from("audit_log").insert({
      actor_user_id: (await supabase.auth.getUser()).data.user?.id,
      entity_type: "player",
      entity_id: playerId,
      action: `set_role_${newRole}`,
    })
    toast.success(`Роль обновлена: ${newRole}`)
    router.refresh()
    setLoading(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {"Все игроки ("}
          {players.length}
          {")"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Игрок</TableHead>
                <TableHead className="text-right">Рейтинг</TableHead>
                <TableHead className="text-right hidden sm:table-cell">
                  Матчи
                </TableHead>
                <TableHead className="text-center">Роль</TableHead>
                <TableHead className="text-right">Действия</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Link
                      href={`/players/${p.id}`}
                      className="font-medium hover:text-primary hover:underline underline-offset-4"
                    >
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold">
                    {p.rating}
                  </TableCell>
                  <TableCell className="text-right tabular-nums hidden sm:table-cell">
                    {p.matches_count}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge
                      variant={p.role === "admin" ? "default" : "secondary"}
                    >
                      {p.role === "admin" ? "Админ" : "Игрок"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {p.user_id !== currentUserId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleRole(p.id, p.role)}
                        disabled={loading === p.id}
                      >
                        {loading === p.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : p.role === "admin" ? (
                          "Убрать админа"
                        ) : (
                          "Сделать админом"
                        )}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}

function SettingsTab({ settings }: { settings: RatingSettingsData | null }) {
  const router = useRouter()
  const [form, setForm] = useState<RatingSettingsData>(
    settings ?? {
      starting_rating: 1500,
      k_calibration: 40,
      k_normal: 24,
      k_veteran: 16,
      calibration_matches: 10,
      veteran_matches: 50,
      veteran_rating: 1800,
      weight_friendly: 1.0,
      weight_ladder: 1.1,
      weight_league: 1.2,
      weight_tournament_group: 1.3,
      weight_tournament_playoffs: 1.5,
      weight_final: 1.7,
      anti_boost_threshold: 250,
      anti_boost_strong_wins: 0.6,
      anti_boost_strong_loses: 1.3,
      inactivity_days: 45,
      return_k_multiplier: 1.2,
      return_matches: 5,
      max_match_age_days: 7,
      anti_duplicate_hours: 6,
      pending_expiry_days: 14,
    }
  )
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("rating_settings")
      .update(form)
      .eq("id", 1)

    if (error) {
      toast.error("Ошибка: " + error.message)
    } else {
      await supabase.from("audit_log").insert({
        actor_user_id: (await supabase.auth.getUser()).data.user?.id,
        entity_type: "rating_settings",
        entity_id: null,
        action: "update_settings",
        payload: form as unknown as Record<string, unknown>,
      })
      toast.success("Настройки сохранены")
      router.refresh()
    }
    setSaving(false)
  }

  const updateField = (key: keyof RatingSettingsData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: parseFloat(value) || 0 }))
  }

  const fields: {
    group: string
    items: { key: keyof RatingSettingsData; label: string }[]
  }[] = [
    {
      group: "Базовые",
      items: [
        { key: "starting_rating", label: "Стартовый рейтинг" },
        { key: "k_calibration", label: "K-фактор (калибровка)" },
        { key: "k_normal", label: "K-фактор (обычный)" },
        { key: "k_veteran", label: "K-фактор (ветеран)" },
        { key: "calibration_matches", label: "Калибровочных матчей" },
        { key: "veteran_matches", label: "Матчей для ветерана" },
        { key: "veteran_rating", label: "Рейтинг для ветерана" },
      ],
    },
    {
      group: "Весовые коэффициенты",
      items: [
        { key: "weight_friendly", label: "Товарищеский" },
        { key: "weight_ladder", label: "Лестница" },
        { key: "weight_league", label: "Лига" },
        { key: "weight_tournament_group", label: "Турнир (группа)" },
        { key: "weight_tournament_playoffs", label: "Турнир (плей-офф)" },
        { key: "weight_final", label: "Финал" },
      ],
    },
    {
      group: "Анти-буст",
      items: [
        { key: "anti_boost_threshold", label: "Порог (разница рейтинга)" },
        { key: "anti_boost_strong_wins", label: "Множитель сильный побеждает" },
        { key: "anti_boost_strong_loses", label: "Множитель сильный проигрывает" },
      ],
    },
    {
      group: "Прочее",
      items: [
        { key: "inactivity_days", label: "Дней до неактивности" },
        { key: "return_k_multiplier", label: "Множитель K при возврате" },
        { key: "return_matches", label: "Матчей для возврата" },
        { key: "max_match_age_days", label: "Макс. давность матча (дни)" },
        { key: "anti_duplicate_hours", label: "Анти-дубликат (часы)" },
        { key: "pending_expiry_days", label: "Срок ожидания (дни)" },
      ],
    },
  ]

  return (
    <div className="flex flex-col gap-4">
      {fields.map((group) => (
        <Card key={group.group}>
          <CardHeader>
            <CardTitle className="text-lg">{group.group}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {group.items.map((item) => (
                <div key={item.key} className="flex flex-col gap-1.5">
                  <Label className="text-sm">{item.label}</Label>
                  <Input
                    type="number"
                    step="any"
                    value={form[item.key]}
                    onChange={(e) => updateField(item.key, e.target.value)}
                    className="tabular-nums"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
      <Button onClick={handleSave} disabled={saving} className="gap-1.5">
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Save className="h-4 w-4" />
            Сохранить настройки
          </>
        )}
      </Button>
    </div>
  )
}

function AuditTab({ auditLog }: { auditLog: AuditEntry[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Журнал аудита</CardTitle>
      </CardHeader>
      <CardContent>
        {auditLog.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-4">
            Журнал пуст
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {auditLog.map((entry) => (
              <div
                key={entry.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50"
              >
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <Badge variant="outline" className="mr-2 text-xs">
                      {entry.entity_type}
                    </Badge>
                    <span className="font-medium">{entry.action}</span>
                  </p>
                  {entry.entity_id && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {"ID: "}
                      {entry.entity_id}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {format(new Date(entry.created_at), "d MMM yyyy, HH:mm:ss", {
                      locale: ru,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
