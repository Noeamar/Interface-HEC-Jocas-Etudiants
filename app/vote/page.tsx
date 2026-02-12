"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

interface OfferPair {
  offerA: {
    text: string
    labels: any
    salary: { min: number; max: number }
  }
  offerB: {
    text: string
    labels: any
    salary: { min: number; max: number }
  }
  jobTitle: string
  company: string
  templateId: string
}

export default function VotePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pairId, setPairId] = useState<string | null>(null)
  const [pair, setPair] = useState<OfferPair | null>(null)
  const [selectedOffer, setSelectedOffer] = useState<"A" | "B" | null>(null)
  const [reasoning, setReasoning] = useState("")

  useEffect(() => {
    initializeSession()
  }, [])

  async function initializeSession() {
    try {
      // Créer une session
      const sessionRes = await fetch("/api/create-session", {
        method: "POST",
      })
      const sessionData = await sessionRes.json()
      setSessionId(sessionData.sessionId)

      // Générer une paire d'offres
      const pairRes = await fetch("/api/generate-pair", {
        method: "POST",
      })
      const pairData = await pairRes.json()
      setPair(pairData)

      // Sauvegarder la paire
      const saveRes = await fetch("/api/save-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: sessionData.sessionId,
          offerA: pairData.offerA,
          offerB: pairData.offerB,
          jobTitle: pairData.jobTitle,
          company: pairData.company,
        }),
      })
      const saveData = await saveRes.json()
      setPairId(saveData.pairId)

      setLoading(false)
    } catch (error) {
      console.error("Error initializing:", error)
      alert("Erreur lors du chargement. Veuillez réessayer.")
    }
  }

  async function handleVote(chosenOffer: "A" | "B") {
    if (!sessionId || !pairId) return

    setSubmitting(true)
    setSelectedOffer(chosenOffer)

    try {
      const response = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          pairId,
          chosenOffer,
          reasoning: reasoning || null,
        }),
      })

      if (response.ok) {
        router.push("/merci")
      } else {
        const error = await response.json()
        alert(`Erreur: ${error.error}`)
        setSubmitting(false)
        setSelectedOffer(null)
      }
    } catch (error) {
      console.error("Error voting:", error)
      alert("Erreur lors de l'enregistrement du vote.")
      setSubmitting(false)
      setSelectedOffer(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner className="mx-auto mb-4" />
          <p className="text-slate-600">Chargement des offres...</p>
        </div>
      </div>
    )
  }

  if (!pair) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-red-600">Erreur lors du chargement des offres</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Quelle offre préférez-vous ?
          </h1>
          <p className="text-slate-600">
            {pair.jobTitle} - {pair.company}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Offre A */}
          <Card className={`bg-white border-slate-200 transition-all ${
            selectedOffer === "A" ? "ring-2 ring-blue-600" : ""
          }`}>
            <CardHeader>
              <CardTitle className="text-slate-900">Offre A</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {pair.offerA.text}
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    <strong>Salaire:</strong> {pair.offerA.salary.min}€ - {pair.offerA.salary.max}€ / an
                  </p>
                </div>
                <Button
                  onClick={() => handleVote("A")}
                  disabled={submitting || selectedOffer !== null}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {submitting && selectedOffer === "A" ? (
                    <>
                      <Spinner className="mr-2" />
                      Enregistrement...
                    </>
                  ) : (
                    "Je préfère l'offre A"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Offre B */}
          <Card className={`bg-white border-slate-200 transition-all ${
            selectedOffer === "B" ? "ring-2 ring-blue-600" : ""
          }`}>
            <CardHeader>
              <CardTitle className="text-slate-900">Offre B</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                  {pair.offerB.text}
                </div>
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-sm text-slate-600">
                    <strong>Salaire:</strong> {pair.offerB.salary.min}€ - {pair.offerB.salary.max}€ / an
                  </p>
                </div>
                <Button
                  onClick={() => handleVote("B")}
                  disabled={submitting || selectedOffer !== null}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {submitting && selectedOffer === "B" ? (
                    <>
                      <Spinner className="mr-2" />
                      Enregistrement...
                    </>
                  ) : (
                    "Je préfère l'offre B"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Optionnel : Champ de raisonnement */}
        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-sm text-slate-900">
              Pourquoi ce choix ? (optionnel)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Expliquez brièvement pourquoi vous préférez cette offre..."
              className="w-full p-3 border border-slate-300 rounded-md text-slate-700"
              rows={3}
              disabled={submitting}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
