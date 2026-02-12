"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { getAvailableJobTitles } from "@/lib/offer-pairs"
import { markdownToHtml } from "@/lib/utils"

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
  const [loading, setLoading] = useState(false)
  const [loadingOfferA, setLoadingOfferA] = useState(false)
  const [loadingOfferB, setLoadingOfferB] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pairId, setPairId] = useState<string | null>(null)
  const [pair, setPair] = useState<OfferPair | null>(null)
  const [currentJobTitle, setCurrentJobTitle] = useState<string>("")
  const [currentCompany, setCurrentCompany] = useState<string>("")
  const [selectedOffer, setSelectedOffer] = useState<"A" | "B" | null>(null)
  const [reasoning, setReasoning] = useState("")
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>("")
  const [jobInput, setJobInput] = useState<string>("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [voteCount, setVoteCount] = useState(0)
  const [showJobSelector, setShowJobSelector] = useState(true)
  const [showThankYou, setShowThankYou] = useState(false)
  const [displayOfferAText, setDisplayOfferAText] = useState("")
  const [displayOfferBText, setDisplayOfferBText] = useState("")

  useEffect(() => {
    initializeSession()
  }, [])

  async function initializeSession() {
    try {
      // Créer une session seulement si elle n'existe pas déjà
      if (!sessionId) {
        const sessionRes = await fetch("/api/create-session", {
          method: "POST",
        })
        const sessionData = await sessionRes.json()
        setSessionId(sessionData.sessionId)
      }
      // Ne pas générer les offres immédiatement - attendre la sélection du job
    } catch (error) {
      console.error("Error initializing:", error)
      alert("Erreur lors de l'initialisation. Veuillez réessayer.")
    }
  }

  async function generateNewPair(jobTitle?: string) {
    try {
      setSelectedOffer(null)
      setReasoning("")
      setShowJobSelector(false)
      setLoadingOfferA(true)
      setLoadingOfferB(true)
      setDisplayOfferAText("")
      setDisplayOfferBText("")

      const jobToUse = jobTitle || selectedJobTitle
      if (!jobToUse) {
        alert("Veuillez sélectionner un titre de poste")
        setLoadingOfferA(false)
        setLoadingOfferB(false)
        setShowJobSelector(true)
        return
      }

      // Afficher immédiatement les cartes avec le titre du job
      setCurrentJobTitle(jobToUse)
      setPair({
        offerA: {
          text: "",
          labels: {},
          salary: { min: 0, max: 0 }
        },
        offerB: {
          text: "",
          labels: {},
          salary: { min: 0, max: 0 }
        },
        jobTitle: jobToUse,
        company: "",
        templateId: ""
      })

      const sessionToUse = sessionId

      // Générer une paire d'offres avec le job sélectionné (le thème sera choisi aléatoirement en arrière-plan)
      const pairRes = await fetch("/api/generate-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: jobToUse,
        }),
      })

      if (!pairRes.ok) {
        let errorMessage = "Erreur lors de la génération des offres"
        try {
          const errorData = await pairRes.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // Si la réponse n'est pas du JSON, utiliser le message par défaut
        }
        throw new Error(errorMessage)
      }

      const pairData = await pairRes.json()

      // Vérifier que les données sont valides
      if (!pairData.offerA || !pairData.offerB || !pairData.offerA.text || !pairData.offerB.text) {
        throw new Error("Les offres générées sont incomplètes")
      }
      
      setPair(prevPair => prevPair ? {
        ...prevPair,
        offerA: pairData.offerA,
        company: pairData.company,
        templateId: pairData.templateId
      } : null)
      setCurrentCompany(pairData.company)
      setLoadingOfferA(false)

      // Génération progressive du texte de l'offre A (par blocs de paragraphes)
      const paragraphsA = pairData.offerA.text.split(/\n\n+/).filter(Boolean)
      let indexA = 0
      const revealNextParagraphA = () => {
        setDisplayOfferAText((prev) =>
          indexA === 0 ? paragraphsA[0] : prev + "\n\n" + paragraphsA[indexA]
        )
        indexA++
        if (indexA < paragraphsA.length) {
          setTimeout(revealNextParagraphA, 250)
        }
      }
      if (paragraphsA.length > 0) {
        revealNextParagraphA()
      }

      // Mettre à jour l'offre B et générer son texte progressivement avec un léger décalage
      setTimeout(() => {
        setPair(prevPair => prevPair ? {
          ...prevPair,
          offerB: pairData.offerB
        } : null)
        setLoadingOfferB(false)

        const paragraphsB = pairData.offerB.text.split(/\n\n+/).filter(Boolean)
        let indexB = 0
        const revealNextParagraphB = () => {
          setDisplayOfferBText((prev) =>
            indexB === 0 ? paragraphsB[0] : prev + "\n\n" + paragraphsB[indexB]
          )
          indexB++
          if (indexB < paragraphsB.length) {
            setTimeout(revealNextParagraphB, 250)
          }
        }
        if (paragraphsB.length > 0) {
          revealNextParagraphB()
        }
      }, 500)

      // Sauvegarder la paire seulement si on a une session
      if (sessionToUse) {
        const saveRes = await fetch("/api/save-pair", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionToUse,
            offerA: pairData.offerA,
            offerB: pairData.offerB,
            jobTitle: pairData.jobTitle,
            company: pairData.company,
          }),
        })
        const saveData = await saveRes.json()
        setPairId(saveData.pairId)
      }
    } catch (error) {
      console.error("Error generating pair:", error)
      const errorMessage = error instanceof Error ? error.message : "Erreur lors de la génération des offres"
      alert(`Erreur: ${errorMessage}`)
      setLoadingOfferA(false)
      setLoadingOfferB(false)
      setShowJobSelector(true)
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
        setVoteCount(voteCount + 1)
        setSubmitting(false)
        // Afficher le message de remerciement
        setShowThankYou(true)
        // Après 2 secondes, réinitialiser et revenir au sélecteur de job
        setTimeout(() => {
          setShowThankYou(false)
          setShowJobSelector(true)
          setPair(null)
          setJobInput("")
          setSelectedJobTitle("")
          setCurrentJobTitle("")
          setCurrentCompany("")
          setSelectedOffer(null)
          setReasoning("")
          setLoadingOfferA(false)
          setLoadingOfferB(false)
        }, 2000)
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

  const jobTitles = getAvailableJobTitles()

  // Filtrer les suggestions basées sur l'input
  const filteredSuggestions = jobInput.trim() === ""
    ? jobTitles
    : jobTitles.filter(job =>
        job.title.toLowerCase().includes(jobInput.toLowerCase()) ||
        job.company.toLowerCase().includes(jobInput.toLowerCase())
      )

  const handleJobInputChange = (value: string) => {
    setJobInput(value)
    setShowSuggestions(true)
  }

  const handleSelectSuggestion = (jobTitle: string) => {
    setJobInput(jobTitle)
    setSelectedJobTitle(jobTitle)
    setShowSuggestions(false)
    generateNewPair(jobTitle)
  }

  const handleSubmitJob = () => {
    const jobToUse = jobInput.trim()
    if (jobToUse) {
      setSelectedJobTitle(jobToUse)
      generateNewPair(jobToUse)
    } else {
      alert("Veuillez entrer un titre de poste")
    }
  }

  // Afficher le sélecteur de job si aucune offre n'est chargée ou si on veut générer une nouvelle paire
  // Ne pas afficher pendant le message de remerciement
  if (showJobSelector && !pair && !showThankYou) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Quel type de poste vous intéresse ?
            </h1>
            <p className="text-gray-600 text-lg">
              Entrez le titre du poste qui vous intéresse pour voir les offres correspondantes
            </p>
          </div>

          <Card className="bg-white border-gray-200 shadow-md">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-gray-900 font-semibold">
                Titre de poste
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={jobInput}
                  onChange={(e) => handleJobInputChange(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
                    // Délai pour permettre le clic sur les suggestions
                    setTimeout(() => setShowSuggestions(false), 200)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && jobInput.trim()) {
                      e.preventDefault()
                      handleSubmitJob()
                    }
                  }}
                  placeholder="Ex: Consultant Junior, Analyste Finance, Chef de Projet..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0C346B] focus:border-transparent"
                />
                
                {/* Suggestions */}
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredSuggestions.map((job) => (
                      <button
                        key={job.title}
                        onClick={() => handleSelectSuggestion(job.title)}
                        className="w-full px-4 py-3 text-left hover:bg-[#0C346B] hover:text-white transition-all border-b border-gray-100 last:border-b-0 group"
                      >
                        <div className="font-semibold text-gray-900 group-hover:text-white transition-colors">{job.title}</div>
                        <div className="text-sm text-gray-600 group-hover:text-white/90 transition-colors">{job.company}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <Button
                onClick={handleSubmitJob}
                disabled={!jobInput.trim()}
                className="w-full h-12 text-lg disabled:bg-[#0C346B] disabled:opacity-70"
              >
                Générer les offres
              </Button>

              {jobTitles.length > 0 && (
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600 mb-2 font-medium">Suggestions :</p>
                  <div className="flex flex-wrap gap-2">
                    {jobTitles.map((job) => (
                      <button
                        key={job.title}
                        onClick={() => handleSelectSuggestion(job.title)}
                        className="px-4 py-2 text-sm bg-[#0C346B] text-white rounded-lg hover:bg-[#0a2a56] transition-all font-medium shadow-md hover:shadow-lg active:scale-95"
                      >
                        {job.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Si on affiche le message de remerciement, on l'affiche seul
  if (showThankYou && !pair && !loadingOfferA && !loadingOfferB) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="max-w-md mx-auto px-6">
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-lg">
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <span className="text-5xl">✓</span>
                <div>
                  <p className="font-semibold text-green-900 text-xl mb-2">
                    Merci pour votre vote !
                  </p>
                  <p className="text-sm text-green-700">
                    Votre préférence a été enregistrée.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Afficher les cartes seulement si on a une paire ou si on est en train de charger
  if (!pair && !loadingOfferA && !loadingOfferB) {
    return null // Ne rien afficher si on n'a pas de paire et qu'on ne charge pas
  }

  const displayPair = pair || {
    offerA: { text: "", labels: {}, salary: { min: 0, max: 0 } },
    offerB: { text: "", labels: {}, salary: { min: 0, max: 0 } },
    jobTitle: currentJobTitle || selectedJobTitle || "",
    company: currentCompany || "",
    templateId: ""
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-6">
        {/* Message de remerciement - affiché au-dessus de tout */}
        {showThankYou && (
          <div className="mb-6 flex justify-center animate-in fade-in slide-in-from-top-4 duration-300">
            <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">✓</span>
                  <div>
                    <p className="font-semibold text-green-900 text-lg">
                      Merci pour votre vote !
                    </p>
                    <p className="text-sm text-green-700">
                      Votre préférence a été enregistrée. Redirection...
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Quelle offre préférez-vous ?
          </h1>
          <p className="text-gray-600">
            {displayPair.jobTitle} {displayPair.company && `- ${displayPair.company}`}
            {(loadingOfferA || loadingOfferB) && (
              <span className="ml-2 text-sm text-gray-400">(Génération en cours...)</span>
            )}
          </p>
          {voteCount > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Vous avez déjà voté {voteCount} fois
            </p>
          )}
        </div>


        {/* Bouton pour générer de nouvelles offres */}
        <div className="mb-6 flex justify-center">
          <Button
            onClick={() => {
              setShowJobSelector(true)
              setPair(null)
              setJobInput("")
              setSelectedJobTitle("")
              setCurrentJobTitle("")
              setCurrentCompany("")
              setSelectedOffer(null)
              setReasoning("")
              setLoadingOfferA(false)
              setLoadingOfferB(false)
            }}
            variant="outline"
            className="border-[#0C346B] text-[#0C346B]"
          >
            Générer de nouvelles offres
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Offre A */}
          <Card className={`bg-white border-gray-200 shadow-md transition-all flex flex-col h-full ${
            selectedOffer === "A" ? "ring-2 ring-[#0C346B]" : ""
          }`}>
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-gray-900 font-semibold text-lg">
                Offre A
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 p-6">
              <div className="flex-1 space-y-4">
                {loadingOfferA ? (
                  <div className="space-y-3">
                    <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-5/6"></div>
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-4/6"></div>
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-5/6"></div>
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-3/6"></div>
                    <div className="flex items-center gap-2 pt-2">
                      <Spinner className="h-4 w-4" />
                      <span className="text-sm text-slate-500">Génération de l'offre...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div 
                      className="text-slate-700 text-sm leading-relaxed max-w-none [&_strong]:font-bold [&_strong]:text-slate-900 [&_ul]:my-2 [&_li]:mb-1 [&_p]:mb-2 [&_h3]:font-bold [&_h3]:text-base [&_h3]:mt-4 [&_h3]:mb-2"
                      dangerouslySetInnerHTML={{ 
                        __html: (displayOfferAText || displayPair.offerA.text) 
                          ? markdownToHtml(displayOfferAText || displayPair.offerA.text)
                          : "Aucune offre disponible"
                      }}
                    />
                    {displayPair.offerA.salary.min > 0 && (
                      <div className="pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-700 font-medium">
                          <strong className="text-[#0C346B]">Salaire:</strong> {displayPair.offerA.salary.min}€ - {displayPair.offerA.salary.max}€ / an
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="mt-auto pt-4 border-t border-gray-100">
                <Button
                  onClick={() => handleVote("A")}
                  disabled={submitting || selectedOffer !== null || loadingOfferA || loadingOfferB || !displayPair.offerA.text}
                  className="w-full disabled:bg-[#0C346B] disabled:opacity-70"
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
          <Card className={`bg-white border-gray-200 shadow-md transition-all flex flex-col h-full ${
            selectedOffer === "B" ? "ring-2 ring-[#0C346B]" : ""
          }`}>
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-gray-900 font-semibold text-lg">
                Offre B
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col flex-1 p-6">
              <div className="flex-1 space-y-4">
                {loadingOfferB ? (
                  <div className="space-y-3">
                    <div className="h-4 bg-slate-200 rounded animate-pulse"></div>
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-5/6"></div>
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-4/6"></div>
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-5/6"></div>
                    <div className="h-4 bg-slate-200 rounded animate-pulse w-3/6"></div>
                    <div className="flex items-center gap-2 pt-2">
                      <Spinner className="h-4 w-4" />
                      <span className="text-sm text-slate-500">Génération de l'offre...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div 
                      className="text-slate-700 text-sm leading-relaxed max-w-none [&_strong]:font-bold [&_strong]:text-slate-900 [&_ul]:my-2 [&_li]:mb-1 [&_p]:mb-2 [&_h3]:font-bold [&_h3]:text-base [&_h3]:mt-4 [&_h3]:mb-2"
                      dangerouslySetInnerHTML={{ 
                        __html: (displayOfferBText || displayPair.offerB.text) 
                          ? markdownToHtml(displayOfferBText || displayPair.offerB.text)
                          : "Aucune offre disponible"
                      }}
                    />
                    {displayPair.offerB.salary.min > 0 && (
                      <div className="pt-4 border-t border-gray-200">
                        <p className="text-sm text-gray-700 font-medium">
                          <strong className="text-[#0C346B]">Salaire:</strong> {displayPair.offerB.salary.min}€ - {displayPair.offerB.salary.max}€ / an
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="mt-auto pt-4 border-t border-gray-100">
                <Button
                  onClick={() => handleVote("B")}
                  disabled={submitting || selectedOffer !== null || loadingOfferA || loadingOfferB || !displayPair.offerB.text}
                  className="w-full disabled:bg-[#0C346B] disabled:opacity-70"
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
        <Card className="bg-white border-gray-200 shadow-md">
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-sm text-gray-900 font-semibold">
              Pourquoi ce choix ? (optionnel)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <textarea
              value={reasoning}
              onChange={(e) => setReasoning(e.target.value)}
              placeholder="Expliquez brièvement pourquoi vous préférez cette offre..."
              className="w-full p-3 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#0C346B] focus:border-transparent"
              rows={3}
              disabled={submitting || loadingOfferA || loadingOfferB}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
