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

    // Récupérer la paire pour connaître les labels et salaires
    const { data: pair, error: pairError } = await supabase
      .from("job_offer_pairs")
      .select(
        "offer_a_labels, offer_a_salary_min, offer_a_salary_max, offer_b_labels, offer_b_salary_min, offer_b_salary_max"
      )
      .eq("id", pairId)
      .single()

    if (pairError || !pair) {
      console.error("Error fetching pair for vote:", pairError)
      return Response.json(
        { error: "Pair not found for vote" },
        { status: 404 }
      )
    }

    const isOfferA = chosenOffer === "A"
    const chosenLabels = isOfferA ? pair.offer_a_labels : pair.offer_b_labels
    const chosenSalaryMin = isOfferA ? pair.offer_a_salary_min : pair.offer_b_salary_min
    const chosenSalaryMax = isOfferA ? pair.offer_a_salary_max : pair.offer_b_salary_max
    const rejectedLabels = isOfferA ? pair.offer_b_labels : pair.offer_a_labels
    const rejectedSalaryMin = isOfferA ? pair.offer_b_salary_min : pair.offer_a_salary_min
    const rejectedSalaryMax = isOfferA ? pair.offer_b_salary_max : pair.offer_a_salary_max

    // Enregistrer le vote (offre choisie + offre rejetée pour analyses)
    const { data: vote, error: voteError } = await supabase
      .from("votes")
      .insert({
        session_id: sessionId,
        pair_id: pairId,
        chosen_offer: chosenOffer,
        choice_reasoning: reasoning || null,
        chosen_offer_labels: chosenLabels || {},
        chosen_offer_salary_min: chosenSalaryMin ?? null,
        chosen_offer_salary_max: chosenSalaryMax ?? null,
        rejected_offer_labels: rejectedLabels || {},
        rejected_offer_salary_min: rejectedSalaryMin ?? null,
        rejected_offer_salary_max: rejectedSalaryMax ?? null,
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

    // Ne pas marquer la session comme complétée pour permettre plusieurs votes
    // La session reste active pour permettre de continuer à voter

    return Response.json({ success: true, vote })
  } catch (error) {
    console.error("Error in vote API:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
