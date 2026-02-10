import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Verify admin
  const { data: player } = await supabase
    .from("players")
    .select("role")
    .eq("user_id", user.id)
    .single()

  if (!player || player.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await request.json()
  const { matchId, action, comment } = body as {
    matchId: string
    action: "void" | "confirm_admin"
    comment?: string
  }

  if (!matchId || !["void", "confirm_admin"].includes(action)) {
    return NextResponse.json({ error: "Invalid params" }, { status: 400 })
  }

  const newStatus = action === "void" ? "voided" : "confirmed"

  await supabase
    .from("matches")
    .update({ status: newStatus })
    .eq("id", matchId)

  await supabase.from("audit_log").insert({
    actor_user_id: user.id,
    entity_type: "match",
    entity_id: matchId,
    action: `admin_${action}`,
    payload: { comment },
  })

  // Notify both players
  const { data: match } = await supabase
    .from("matches")
    .select(
      "player_a:players!matches_player_a_id_fkey(user_id, name), player_b:players!matches_player_b_id_fkey(user_id, name)"
    )
    .eq("id", matchId)
    .single()

  if (match) {
    const players = [match.player_a, match.player_b] as {
      user_id: string
      name: string
    }[]
    for (const p of players) {
      if (p?.user_id) {
        await supabase.from("notifications").insert({
          user_id: p.user_id,
          type: "dispute_resolved",
          title: "Спор разрешён",
          body: `Администратор ${
            action === "void" ? "аннулировал" : "подтвердил"
          } матч`,
          link: `/matches/${matchId}`,
        })
      }
    }
  }

  return NextResponse.json({ success: true })
}
