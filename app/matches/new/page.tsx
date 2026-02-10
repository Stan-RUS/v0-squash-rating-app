import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Header } from "@/components/header"
import { MatchForm } from "@/components/match-form"

export default async function NewMatchPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: currentPlayer } = await supabase
    .from("players")
    .select("id, name, rating, role")
    .eq("user_id", user.id)
    .single()

  if (!currentPlayer) redirect("/auth/login")

  const isAdmin = currentPlayer.role === "admin"

  // For admins, fetch ALL players (including self) so they can pick both sides
  const { data: allPlayers } = await supabase
    .from("players")
    .select("id, name, rating")
    .order("name")

  // Non-admin opponents exclude the current player
  const opponents = (allPlayers ?? []).filter((p) => p.id !== currentPlayer.id)

  const { data: settings } = await supabase
    .from("rating_settings")
    .select("*")
    .eq("id", 1)
    .single()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-lg px-4 py-8 w-full">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Записать матч
        </h1>
        <MatchForm
          currentPlayer={currentPlayer}
          opponents={opponents}
          allPlayers={allPlayers ?? []}
          isAdmin={isAdmin}
          settings={settings}
        />
      </main>
    </div>
  )
}
