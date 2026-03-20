import { supabase } from "@/lib/supabase"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      sessionId,
      offers,
      jobTitle,
      company,
    } = body

    // Vérifier que les données sont présentes
    if (!offers || !Array.isArray(offers) || offers.length < 2) {
      return Response.json(
        { error: "Missing required offer data" },
        { status: 400 }
      )
    }

    const offerA = offers.find((o: any) => o.id === "A") || offers[0]
    const offerB = offers.find((o: any) => o.id === "B") || offers[1]
    const offerC = offers.find((o: any) => o.id === "C") || null
    const offerD = offers.find((o: any) => o.id === "D") || null
    const offerE = offers.find((o: any) => o.id === "E") || null

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
        offer_c_text: offerC?.text || null,
        offer_c_labels: offerC?.labels || null,
        offer_c_salary_min: offerC?.salary?.min || null,
        offer_c_salary_max: offerC?.salary?.max || null,
        offer_d_text: offerD?.text || null,
        offer_d_labels: offerD?.labels || null,
        offer_d_salary_min: offerD?.salary?.min || null,
        offer_d_salary_max: offerD?.salary?.max || null,
        offer_e_text: offerE?.text || null,
        offer_e_labels: offerE?.labels || null,
        offer_e_salary_min: offerE?.salary?.min || null,
        offer_e_salary_max: offerE?.salary?.max || null,
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
