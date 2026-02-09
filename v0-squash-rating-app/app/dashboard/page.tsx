import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Header } from "@/components/header"
import { DashboardContent } from "@/components/dashboard-content"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: player } = await supabase
    .from("players")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!player) redirect("/auth/login")

  const { data: recentMatches } = await supabase
    .from("matches")
    .select(
      "*, player_a:players!matches_player_a_id_fkey(id, name), player_b:players!matches_player_b_id_fkey(id, name)"
    )
    .or(`player_a_id.eq.${player.id},player_b_id.eq.${player.id}`)
    .order("created_at", { ascending: false })
    .limit(10)

  const { data: pendingMatches } = await supabase
    .from("matches")
    .select(
      "*, player_a:players!matches_player_a_id_fkey(id, name), player_b:players!matches_player_b_id_fkey(id, name)"
    )
    .eq("status", "pending")
    .or(`player_a_id.eq.${player.id},player_b_id.eq.${player.id}`)
    .neq("created_by_player_id", player.id)
    .order("created_at", { ascending: false })

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20)

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-5xl px-4 py-8 w-full">
        <DashboardContent
          player={player}
          recentMatches={recentMatches ?? []}
          pendingMatches={pendingMatches ?? []}
          notifications={notifications ?? []}
        />
      </main>
    </div>
  )
}
