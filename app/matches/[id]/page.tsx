import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import { Header } from "@/components/header"
import { MatchDetails } from "@/components/match-details"

export default async function MatchPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: match } = await supabase
    .from("matches")
    .select(
      "*, player_a:players!matches_player_a_id_fkey(*), player_b:players!matches_player_b_id_fkey(*)"
    )
    .eq("id", id)
    .single()

  if (!match) notFound()

  const { data: confirmations } = await supabase
    .from("match_confirmations")
    .select("*, responder:players!match_confirmations_responder_player_id_fkey(name)")
    .eq("match_id", id)
    .order("created_at", { ascending: true })

  const { data: ratingChanges } = await supabase
    .from("rating_history")
    .select("*")
    .eq("match_id", id)

  const {
    data: { user },
  } = await supabase.auth.getUser()

  let currentPlayer = null
  if (user) {
    const { data } = await supabase
      .from("players")
      .select("id, role")
      .eq("user_id", user.id)
      .single()
    currentPlayer = data
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-3xl px-4 py-8 w-full">
        <MatchDetails
          match={match}
          confirmations={confirmations ?? []}
          ratingChanges={ratingChanges ?? []}
          currentPlayer={currentPlayer}
        />
      </main>
    </div>
  )
}
