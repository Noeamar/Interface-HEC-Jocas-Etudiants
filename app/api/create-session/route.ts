import { supabase } from "@/lib/supabase"
import { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    // Récupérer l'IP et le user agent
    const ip = request.headers.get("x-forwarded-for") || 
               request.headers.get("x-real-ip") || 
               "unknown"
    const userAgent = request.headers.get("user-agent") || "unknown"

    const { data: session, error } = await supabase
      .from("voting_sessions")
      .insert({
        ip_address: ip,
        user_agent: userAgent,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating session:", error)
      return Response.json(
        { error: "Failed to create session" },
        { status: 500 }
      )
    }

    return Response.json({ sessionId: session.id })
  } catch (error) {
    console.error("Error in create-session API:", error)
    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
