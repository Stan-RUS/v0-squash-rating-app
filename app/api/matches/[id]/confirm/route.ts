import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"
import {
  getKFactor,
  getMatchWeight,
  calculateEloChange,
} from "@/lib/elo"
import type { RatingSettings } from "@/lib/elo"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matchId } = await params
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await request.json()
  const { action, comment } = body as {
    action: "confirm" | "reject" | "dispute"
    comment?: string
  }

  if (!["confirm", "reject", "dispute"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  }

  // Get match
  const { data: match, error: matchError } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single()

  if (matchError || !match) {
    return NextResponse.json({ error: "Match not found" }, { status: 404 })
  }

  if (match.status !== "pending") {
    return NextResponse.json(
      { error: "Match is not pending" },
      { status: 400 }
    )
  }

  // Get current player
  const { data: currentPlayer } = await supabase
    .from("players")
    .select("*")
    .eq("user_id", user.id)
    .single()

  if (!currentPlayer) {
    return NextResponse.json({ error: "Player not found" }, { status: 404 })
  }

  // Verify responder is the opponent (not the creator)
  const isInvolved =
    currentPlayer.id === match.player_a_id ||
    currentPlayer.id === match.player_b_id
  const isCreator = currentPlayer.id === match.created_by_player_id

  if (!isInvolved || isCreator) {
    return NextResponse.json(
      { error: "Only the opponent can respond" },
      { status: 403 }
    )
  }

  // Record confirmation action
  await supabase.from("match_confirmations").insert({
    match_id: matchId,
    responder_player_id: currentPlayer.id,
    action,
    comment: comment || null,
  })

  if (action === "confirm") {
    // Update match status
    await supabase
      .from("matches")
      .update({ status: "confirmed" })
      .eq("id", matchId)

    // Get rating settings
    const { data: settings } = await supabase
      .from("rating_settings")
      .select("*")
      .eq("id", 1)
      .single()

    if (settings) {
      // Get both players
      const { data: playerA } = await supabase
        .from("players")
        .select("*")
        .eq("id", match.player_a_id)
        .single()

      const { data: playerB } = await supabase
        .from("players")
        .select("*")
        .eq("id", match.player_b_id)
        .single()

      if (playerA && playerB) {
        const kA = getKFactor(playerA, settings as unknown as RatingSettings)
        const matchWeight = getMatchWeight(
          match.match_type,
          settings as unknown as RatingSettings
        )

        const { deltaA, deltaB } = calculateEloChange(
          playerA.rating,
          playerB.rating,
          match.score_a_games,
          match.score_b_games,
          kA,
          matchWeight,
          settings.anti_boost_threshold,
          settings.anti_boost_strong_wins,
          settings.anti_boost_strong_loses
        )

        const newRatingA = playerA.rating + deltaA
        const newRatingB = playerB.rating + deltaB
        const aWon = match.score_a_games > match.score_b_games

        // Update player A
        await supabase
          .from("players")
          .update({
            rating: newRatingA,
            matches_count: playerA.matches_count + 1,
            wins: playerA.wins + (aWon ? 1 : 0),
            losses: playerA.losses + (aWon ? 0 : 1),
            calibration_matches_count: Math.min(
              playerA.calibration_matches_count + 1,
              settings.calibration_matches
            ),
            last_match_at: match.played_at,
          })
          .eq("id", playerA.id)

        // Update player B
        await supabase
          .from("players")
          .update({
            rating: newRatingB,
            matches_count: playerB.matches_count + 1,
            wins: playerB.wins + (aWon ? 0 : 1),
            losses: playerB.losses + (aWon ? 1 : 0),
            calibration_matches_count: Math.min(
              playerB.calibration_matches_count + 1,
              settings.calibration_matches
            ),
            last_match_at: match.played_at,
          })
          .eq("id", playerB.id)

        // Record rating history
        await supabase.from("rating_history").insert([
          {
            player_id: playerA.id,
            match_id: matchId,
            rating_before: playerA.rating,
            rating_after: newRatingA,
            delta: deltaA,
          },
          {
            player_id: playerB.id,
            match_id: matchId,
            rating_before: playerB.rating,
            rating_after: newRatingB,
            delta: deltaB,
          },
        ])
      }
    }

    // Notify creator
    const { data: creator } = await supabase
      .from("players")
      .select("user_id")
      .eq("id", match.created_by_player_id)
      .single()

    if (creator?.user_id) {
      await supabase.from("notifications").insert({
        user_id: creator.user_id,
        type: "match_confirmed",
        title: "Матч подтверждён",
        body: `${currentPlayer.name} подтвердил матч`,
        link: `/matches/${matchId}`,
      })
    }
  } else if (action === "reject") {
    await supabase
      .from("matches")
      .update({ status: "rejected" })
      .eq("id", matchId)

    const { data: creator } = await supabase
      .from("players")
      .select("user_id")
      .eq("id", match.created_by_player_id)
      .single()

    if (creator?.user_id) {
      await supabase.from("notifications").insert({
        user_id: creator.user_id,
        type: "match_rejected",
        title: "Матч отклонён",
        body: `${currentPlayer.name} отклонил матч${
          comment ? ": " + comment : ""
        }`,
        link: `/matches/${matchId}`,
      })
    }
  } else if (action === "dispute") {
    await supabase
      .from("matches")
      .update({ status: "disputed" })
      .eq("id", matchId)

    const { data: creator } = await supabase
      .from("players")
      .select("user_id")
      .eq("id", match.created_by_player_id)
      .single()

    if (creator?.user_id) {
      await supabase.from("notifications").insert({
        user_id: creator.user_id,
        type: "match_disputed",
        title: "Матч оспорен",
        body: `${currentPlayer.name} оспорил матч${
          comment ? ": " + comment : ""
        }`,
        link: `/matches/${matchId}`,
      })
    }
  }

  // Audit log
  await supabase.from("audit_log").insert({
    actor_user_id: user.id,
    entity_type: "match",
    entity_id: matchId,
    action: `match_${action}`,
    payload: { comment },
  })

  return NextResponse.json({ success: true, action })
}
