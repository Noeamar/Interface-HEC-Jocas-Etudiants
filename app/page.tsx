"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function HomePage() {
  const router = useRouter()
  const [consent, setConsent] = useState(false)
  const [clicked, setClicked] = useState(false)

  const handleStart = () => {
    if (consent && !clicked) {
      setClicked(true)
      router.push("/vote")
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Étude sur les préférences d'emploi
          </h1>
          <p className="text-gray-600 text-lg">
            HEC Paris - Projet JOCAS
          </p>
        </div>

        <Card className="bg-white border-gray-200 shadow-md mb-6">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-gray-900 font-semibold">À propos de cette étude</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-gray-700">
            <p>
              Cette étude vise à comprendre les préférences des étudiants HEC concernant les offres d'emploi.
              Vous allez être présenté(e) à deux offres d'emploi et devrez choisir celle que vous préférez.
            </p>
            <p>
              <strong>Durée estimée :</strong> 2-3 minutes
            </p>
            <p>
              <strong>Confidentialité :</strong> Vos réponses sont anonymes et seront utilisées uniquement à des fins de recherche.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border-gray-200 shadow-md">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-gray-900 font-semibold">Consentement</CardTitle>
            <CardDescription className="text-gray-600">
              Veuillez lire et accepter pour continuer
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 text-[#0C346B] focus:ring-[#0C346B] border-gray-300 rounded"
                />
                <Label htmlFor="consent" className="text-gray-700 cursor-pointer">
                  J'accepte de participer à cette étude et je comprends que mes réponses seront utilisées à des fins de recherche.
                  Je comprends également que je peux arrêter ma participation à tout moment.
                </Label>
              </div>
            </div>

            <button
              onClick={handleStart}
              disabled={!consent || clicked}
              className="w-full bg-[#0C346B] hover:bg-[#0a2a56] text-white h-12 text-lg shadow-sm font-medium rounded-md transition-all disabled:bg-[#0C346B] disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:bg-[#0C346B] disabled:pointer-events-none"
            >
              {clicked ? "Redirection en cours..." : "Commencer l'étude"}
            </button>
          </CardContent>
        </Card>

        <footer className="mt-12 text-center text-gray-600 text-sm">
          <p>JOCAS - Plateforme d'analyse d'offres d'emploi | HEC Paris</p>
        </footer>
      </div>
    </div>
  )
}
