"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"

export default function HomePage() {
  const router = useRouter()
  const [consent, setConsent] = useState(false)

  const handleStart = () => {
    if (consent) {
      router.push("/vote")
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">
            Étude sur les préférences d'emploi
          </h1>
          <div className="w-12 h-1 bg-red-600 mx-auto mb-4" />
          <p className="text-slate-600 text-lg">
            HEC Paris - Projet JOCAS
          </p>
        </div>

        <Card className="bg-white border-slate-200 mb-6">
          <CardHeader>
            <CardTitle className="text-slate-900">À propos de cette étude</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
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

        <Card className="bg-white border-slate-200">
          <CardHeader>
            <CardTitle className="text-slate-900">Consentement</CardTitle>
            <CardDescription>
              Veuillez lire et accepter pour continuer
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="consent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <Label htmlFor="consent" className="text-slate-700 cursor-pointer">
                  J'accepte de participer à cette étude et je comprends que mes réponses seront utilisées à des fins de recherche.
                  Je comprends également que je peux arrêter ma participation à tout moment.
                </Label>
              </div>
            </div>

            <Button
              onClick={handleStart}
              disabled={!consent}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 text-lg"
            >
              Commencer l'étude
            </Button>
          </CardContent>
        </Card>

        <footer className="mt-12 text-center text-slate-600 text-sm">
          <p>JOCAS - Plateforme d'analyse d'offres d'emploi | HEC Paris</p>
        </footer>
      </div>
    </div>
  )
}
