import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Header } from "@/components/header"
import { AdminPanel } from "@/components/admin-panel"

export default async function AdminPage() {
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

  if (!player || player.role !== "admin") redirect("/dashboard")

  const { data: disputedMatches } = await supabase
    .from("matches")
    .select(
      "*, player_a:players!matches_player_a_id_fkey(id, name), player_b:players!matches_player_b_id_fkey(id, name)"
    )
    .eq("status", "disputed")
    .order("created_at", { ascending: false })

  const { data: pendingMatches } = await supabase
    .from("matches")
    .select(
      "*, player_a:players!matches_player_a_id_fkey(id, name), player_b:players!matches_player_b_id_fkey(id, name)"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(20)

  const { data: settings } = await supabase
    .from("rating_settings")
    .select("*")
    .eq("id", 1)
    .single()

  const { data: auditLog } = await supabase
    .from("audit_log")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50)

  const { data: allPlayers } = await supabase
    .from("players")
    .select("id, name, rating, role, matches_count, status_active, user_id, is_player")
    .order("rating", { ascending: false })

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-5xl px-4 py-8 w-full">
        <AdminPanel
          disputedMatches={disputedMatches ?? []}
          pendingMatches={pendingMatches ?? []}
          settings={settings}
          auditLog={auditLog ?? []}
          allPlayers={allPlayers ?? []}
          currentUserId={user.id}
        />
      </main>
    </div>
  )
}
