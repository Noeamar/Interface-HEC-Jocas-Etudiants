import { supabase } from "@/lib/supabase"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId, pairId, chosenOffer, reasoning, demographics } = body

    // Vérifier que la session existe
    const { data: session, error: sessionError } = await supabase
      .from("voting_sessions")
      .select("*")
      .eq("id", sessionId)
      .single()

    if (sessionError || !session) {
      return Response.json(
        { error: "Session not found" },
        { status: 404 }
      )
    }

    // Vérifier qu'il n'y a pas déjà un vote pour cette session et cette paire
    const { data: existingVote } = await supabase
      .from("votes")
      .select("*")
      .eq("session_id", sessionId)
      .eq("pair_id", pairId)
      .single()

    if (existingVote) {
      return Response.json(
        { error: "Vote already exists for this pair" },
        { status: 400 }
      )
    }

    // Enregistrer le vote
    const { data: vote, error: voteError } = await supabase
      .from("votes")
      .insert({
        session_id: sessionId,
        pair_id: pairId,
        chosen_offer: chosenOffer,
        choice_reasoning: reasoning || null,
        age_range: demographics?.ageRange || null,
        program: demographics?.program || null,
        gender: demographics?.gender || null,
      })
      .select()
      .single()

    if (voteError) {
      console.error("Error inserting vote:", voteError)
      return Response.json(
        { error: "Failed to save vote" },
        { status: 500 }
      )
    }

    // Mettre à jour la session comme complétée
    await supabase
      .from("voting_sessions")
      .update({ completed_at: new Date().toISOString() })
      .eq("id", sessionId)

    return Response.json({ success: true, vote })
  } catch (error) {
    console.error("Error in vote API:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
