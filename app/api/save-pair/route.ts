import { supabase } from "@/lib/supabase"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sessionId,
      offerA,
      offerB,
      jobTitle,
      company,
    } = body

    // Vérifier que les données sont présentes
    if (!offerA || !offerB || !offerA.text || !offerB.text) {
      return Response.json(
        { error: "Missing required offer data" },
        { status: 400 }
      )
    }

    const { data: pair, error } = await supabase
      .from("job_offer_pairs")
      .insert({
        session_id: sessionId,
        offer_a_text: offerA.text,
        offer_a_labels: offerA.labels || {},
        offer_a_salary_min: offerA.salary?.min || null,
        offer_a_salary_max: offerA.salary?.max || null,
        offer_b_text: offerB.text,
        offer_b_labels: offerB.labels || {},
        offer_b_salary_min: offerB.salary?.min || null,
        offer_b_salary_max: offerB.salary?.max || null,
        job_title: jobTitle || null,
        company_name: company || null,
      })
      .select()
      .single()

    if (error) {
      console.error("Error saving pair:", error)
      return Response.json(
        { error: "Failed to save pair" },
        { status: 500 }
      )
    }

    return Response.json({ pairId: pair.id })
  } catch (error) {
    console.error("Error in save-pair API:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
