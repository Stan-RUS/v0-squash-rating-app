import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { PlayerProfile } from "@/components/player-profile"

export default async function PlayerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .single()

  if (!player) notFound()

  const { data: ratingHistory } = await supabase
    .from("rating_history")
    .select("*")
    .eq("player_id", id)
    .order("created_at", { ascending: true })

  const { data: recentMatches } = await supabase
    .from("matches")
    .select(
      "*, player_a:players!matches_player_a_id_fkey(id, name), player_b:players!matches_player_b_id_fkey(id, name)"
    )
    .or(`player_a_id.eq.${id},player_b_id.eq.${id}`)
    .eq("status", "confirmed")
    .order("played_at", { ascending: false })
    .limit(20)

  // Get ranking position
  const { data: allPlayers } = await supabase
    .from("players")
    .select("id, rating")
    .order("rating", { ascending: false })

  const position = (allPlayers ?? []).findIndex((p) => p.id === id) + 1

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-5xl px-4 py-8 w-full">
        <PlayerProfile
          player={player}
          ratingHistory={ratingHistory ?? []}
          recentMatches={recentMatches ?? []}
          position={position}
        />
      </main>
    </div>
  )
}
