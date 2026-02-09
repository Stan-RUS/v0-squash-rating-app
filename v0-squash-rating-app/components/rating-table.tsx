"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, ArrowUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatDistanceToNow } from "date-fns"
import { ru } from "date-fns/locale"

interface Player {
  id: string
  name: string
  rating: number
  wins: number
  losses: number
  matches_count: number
  calibration_matches_count: number
  last_match_at: string | null
  status_active: string
}

type SortField = "rating" | "matches_count" | "wins" | "name"

function PositionBadge({ position }: { position: number }) {
  if (position === 1)
    return (
      <Badge className="bg-amber-500 text-amber-950 hover:bg-amber-500 font-bold min-w-7 justify-center">
        1
      </Badge>
    )
  if (position === 2)
    return (
      <Badge className="bg-slate-400 text-slate-950 hover:bg-slate-400 font-bold min-w-7 justify-center">
        2
      </Badge>
    )
  if (position === 3)
    return (
      <Badge className="bg-amber-700 text-amber-50 hover:bg-amber-700 font-bold min-w-7 justify-center">
        3
      </Badge>
    )
  return (
    <span className="text-muted-foreground font-medium text-sm pl-1.5">
      {position}
    </span>
  )
}

export function RatingTable({ players }: { players: Player[] }) {
  const [search, setSearch] = useState("")
  const [sortField, setSortField] = useState<SortField>("rating")
  const [sortAsc, setSortAsc] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>("all")

  const filtered = useMemo(() => {
    let list = [...players]

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((p) => p.name.toLowerCase().includes(q))
    }

    if (statusFilter !== "all") {
      list = list.filter((p) => p.status_active === statusFilter)
    }

    list.sort((a, b) => {
      let cmp = 0
      if (sortField === "name") {
        cmp = a.name.localeCompare(b.name, "ru")
      } else {
        cmp = (a[sortField] ?? 0) - (b[sortField] ?? 0)
      }
      return sortAsc ? cmp : -cmp
    })

    return list
  }, [players, search, sortField, sortAsc, statusFilter])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все</SelectItem>
            <SelectItem value="active">Активные</SelectItem>
            <SelectItem value="na">Неактивные</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-14">#</TableHead>
              <TableHead>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 -ml-2 h-8"
                  onClick={() => toggleSort("name")}
                >
                  Игрок
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 -mr-2 h-8 ml-auto"
                  onClick={() => toggleSort("rating")}
                >
                  Рейтинг
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-right hidden sm:table-cell">
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 -mr-2 h-8 ml-auto"
                  onClick={() => toggleSort("matches_count")}
                >
                  Матчи
                  <ArrowUpDown className="h-3 w-3" />
                </Button>
              </TableHead>
              <TableHead className="text-right hidden sm:table-cell">
                В/П
              </TableHead>
              <TableHead className="text-right hidden md:table-cell">
                Посл. матч
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Игроки не найдены
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((player, i) => (
                <TableRow key={player.id} className="hover:bg-muted/50">
                  <TableCell>
                    <PositionBadge position={i + 1} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/players/${player.id}`}
                        className="font-medium text-foreground hover:text-primary hover:underline underline-offset-4"
                      >
                        {player.name}
                      </Link>
                      {player.calibration_matches_count < 10 && (
                        <Badge variant="outline" className="text-xs">
                          Калибровка
                        </Badge>
                      )}
                      {player.status_active === "na" && (
                        <Badge variant="secondary" className="text-xs">
                          Неактивен
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold tabular-nums">
                    {player.rating}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground hidden sm:table-cell tabular-nums">
                    {player.matches_count}
                  </TableCell>
                  <TableCell className="text-right hidden sm:table-cell tabular-nums">
                    <span className="text-amber-600">{player.wins}</span>
                    {"/"}
                    <span className="text-red-500">{player.losses}</span>
                  </TableCell>
                  <TableCell className="text-right hidden md:table-cell text-muted-foreground text-sm">
                    {player.last_match_at
                      ? formatDistanceToNow(new Date(player.last_match_at), {
                          addSuffix: true,
                          locale: ru,
                        })
                      : "\u2014"}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        {"Всего игроков: "}
        {filtered.length}
      </p>
    </div>
  )
}
