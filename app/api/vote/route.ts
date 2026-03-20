import { supabase } from "@/lib/supabase"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sessionId,
      pairId,
      chosenOffer,
      reasoning,
      demographics,
      mode,
      wtpValues,
      criteriaScores,
    } = body

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
        "offer_a_labels, offer_a_salary_min, offer_a_salary_max, offer_b_labels, offer_b_salary_min, offer_b_salary_max, offer_c_labels, offer_c_salary_min, offer_c_salary_max, offer_d_labels, offer_d_salary_min, offer_d_salary_max, offer_e_labels, offer_e_salary_min, offer_e_salary_max"
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

    const labelsMap: Record<string, any> = {
      A: pair.offer_a_labels,
      B: pair.offer_b_labels,
      C: pair.offer_c_labels,
      D: pair.offer_d_labels,
      E: pair.offer_e_labels,
    }
    const salaryMinMap: Record<string, number | null> = {
      A: pair.offer_a_salary_min,
      B: pair.offer_b_salary_min,
      C: pair.offer_c_salary_min,
      D: pair.offer_d_salary_min,
      E: pair.offer_e_salary_min,
    }
    const salaryMaxMap: Record<string, number | null> = {
      A: pair.offer_a_salary_max,
      B: pair.offer_b_salary_max,
      C: pair.offer_c_salary_max,
      D: pair.offer_d_salary_max,
      E: pair.offer_e_salary_max,
    }

    const chosenLabels = labelsMap[chosenOffer] || null
    const chosenSalaryMin = salaryMinMap[chosenOffer] ?? null
    const chosenSalaryMax = salaryMaxMap[chosenOffer] ?? null

    // Définir une offre rejetée par défaut (autre que choisie si possible)
    const allKeys: Array<"A" | "B" | "C" | "D" | "E"> = ["A", "B", "C", "D", "E"]
    const rejectedKey = (allKeys.find((k) => k !== chosenOffer && labelsMap[k]) || chosenOffer) as
      | "A"
      | "B"
      | "C"
      | "D"
      | "E"

    const rejectedLabels = labelsMap[rejectedKey] || null
    const rejectedSalaryMin = salaryMinMap[rejectedKey] ?? null
    const rejectedSalaryMax = salaryMaxMap[rejectedKey] ?? null

    // Enregistrer le vote (offre choisie + offre rejetée pour analyses)
    const { data: vote, error: voteError } = await supabase
      .from("votes")
      .insert({
        session_id: sessionId,
        pair_id: pairId,
        chosen_offer: chosenOffer,
        mode: mode || "wtp",
        baseline_offer: null,
        choice_reasoning: reasoning || null,
        chosen_offer_labels: chosenLabels || {},
        chosen_offer_salary_min: chosenSalaryMin ?? null,
        chosen_offer_salary_max: chosenSalaryMax ?? null,
        rejected_offer_labels: rejectedLabels || {},
        rejected_offer_salary_min: rejectedSalaryMin ?? null,
        rejected_offer_salary_max: rejectedSalaryMax ?? null,
        wtp_salary_min_a: wtpValues?.A ?? null,
        wtp_salary_min_b: wtpValues?.B ?? null,
        wtp_salary_min_c: wtpValues?.C ?? null,
        wtp_salary_min_d: wtpValues?.D ?? null,
        wtp_salary_min_e: wtpValues?.E ?? null,
        criteria_scores_a: criteriaScores?.A ?? null,
        criteria_scores_b: criteriaScores?.B ?? null,
        criteria_scores_c: criteriaScores?.C ?? null,
        criteria_scores_d: criteriaScores?.D ?? null,
        criteria_scores_e: criteriaScores?.E ?? null,
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
