import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { TopPlayersTable } from "@/components/top-players-table"

export default async function HomePage() {
  const supabase = await createClient()

  const { data: topPlayers } = await supabase
    .from("players")
    .select("id, name, rating, wins, losses, matches_count")
    .eq("is_player", true)
    .order("rating", { ascending: false })
    .limit(10)

  const { count: totalPlayers } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true })
    .eq("is_player", true)

  const { count: totalMatches } = await supabase
    .from("matches")
    .select("*", { count: "exact", head: true })
    .eq("status", "confirmed")

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <HeroSection
          totalPlayers={totalPlayers ?? 0}
          totalMatches={totalMatches ?? 0}
        />
        <section className="mx-auto max-w-5xl px-4 py-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground">
              Топ-10 игроков
            </h2>
            <a
              href="/rating"
              className="text-sm text-primary hover:underline underline-offset-4"
            >
              {"Полный рейтинг \u2192"}
            </a>
          </div>
          <TopPlayersTable players={topPlayers ?? []} />
        </section>
      </main>
      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        {"Squash Rating \u00A9 "}
        {new Date().getFullYear()}
      </footer>
    </div>
  )
}
