"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function MerciPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12">
      <div className="max-w-2xl mx-auto px-6">
        <Card className="bg-white border-slate-200">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl text-slate-900 mb-4">
              Merci pour votre participation ! 🙏
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-slate-700">
            <p>
              Votre réponse a été enregistrée avec succès. Vos données contribuent à notre recherche sur les préférences d'emploi des étudiants HEC.
            </p>
            <p>
              <strong>Confidentialité :</strong> Vos réponses sont anonymes et seront utilisées uniquement à des fins de recherche académique.
            </p>
            <p className="text-sm text-slate-600 pt-4 border-t border-slate-200">
              JOCAS - Plateforme d'analyse d'offres d'emploi | HEC Paris
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
