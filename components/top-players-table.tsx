import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Player {
  id: string
  name: string
  rating: number
  wins: number
  losses: number
  matches_count: number
}

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

export function TopPlayersTable({ players }: { players: Player[] }) {
  if (players.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        Пока нет зарегистрированных игроков
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">#</TableHead>
            <TableHead>Игрок</TableHead>
            <TableHead className="text-right">Рейтинг</TableHead>
            <TableHead className="text-right hidden sm:table-cell">
              Матчи
            </TableHead>
            <TableHead className="text-right hidden sm:table-cell">
              В/П
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {players.map((player, i) => (
            <TableRow key={player.id} className="hover:bg-muted/50">
              <TableCell>
                <PositionBadge position={i + 1} />
              </TableCell>
              <TableCell>
                <Link
                  href={`/players/${player.id}`}
                  className="font-medium text-foreground hover:text-primary hover:underline underline-offset-4"
                >
                  {player.name}
                </Link>
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
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
