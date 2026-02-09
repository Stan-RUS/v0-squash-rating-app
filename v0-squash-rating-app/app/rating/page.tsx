import { createClient } from "@/lib/supabase/server"
import { Header } from "@/components/header"
import { RatingTable } from "@/components/rating-table"

export default async function RatingPage() {
  const supabase = await createClient()

  const { data: players } = await supabase
    .from("players")
    .select(
      "id, name, rating, wins, losses, matches_count, calibration_matches_count, last_match_at, status_active"
    )
    .order("rating", { ascending: false })

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 mx-auto max-w-5xl px-4 py-8 w-full">
        <h1 className="text-2xl font-bold text-foreground mb-6">
          Полный рейтинг
        </h1>
        <RatingTable players={players ?? []} />
      </main>
    </div>
  )
}
