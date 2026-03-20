"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { getAvailableJobTitles } from "@/lib/offer-pairs"
import { markdownToHtml } from "@/lib/utils"
import type { LabelSet } from "@/lib/types"

type OfferId = "A" | "B" | "C" | "D" | "E"

interface Offer {
  id: OfferId
  text: string
  labels: LabelSet
  salary: { min: number; max: number }
}

interface OfferSet {
  offers: Offer[]
  jobTitle: string
  company: string
  templateId: string
}

const CRITERIA_KEYS: (keyof LabelSet)[] = [
  "DIVERSITY",
  "REMUNERATION_BENEFITS",
  "PROFESSIONAL_OPPORTUNITIES",
  "CULTURE_VALUES",
  "LEADERSHIP",
  "WORK_LIFE_BALANCE",
]

const CRITERIA_LABELS: Record<keyof LabelSet, string> = {
  DIVERSITY: "Diversité & inclusion",
  REMUNERATION_BENEFITS: "Rémunération & avantages",
  PROFESSIONAL_OPPORTUNITIES: "Opportunités de carrière",
  CULTURE_VALUES: "Culture & valeurs",
  LEADERSHIP: "Leadership & vision",
  WORK_LIFE_BALANCE: "Équilibre vie pro/perso",
}

const PAIR_DELTA_SYSTEM_CHOICES = [-10000, -5000, 0, 5000, 10000, 15000, 20000]
const PAIR_DELTA_STEP_EUR = 1000

export default function VotePage() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [pairId, setPairId] = useState<string | null>(null)
  const [offerSet, setOfferSet] = useState<OfferSet | null>(null)

  const [currentJobTitle, setCurrentJobTitle] = useState<string>("")
  const [currentCompany, setCurrentCompany] = useState<string>("")
  const [selectedJobTitle, setSelectedJobTitle] = useState<string>("")
  const [jobInput, setJobInput] = useState<string>("")

  const [offerCount, setOfferCount] = useState<number>(3)
  const [activeTab, setActiveTab] = useState<"wtp" | "criteria" | "pairDelta">("wtp")

  const [selectedOffer, setSelectedOffer] = useState<OfferId | null>(null)
  const [reasoning, setReasoning] = useState("")
  const [voteCount, setVoteCount] = useState(0)

  // Expérience "par paires + delta" (2 offres A/B)
  const [pairDeltaStep, setPairDeltaStep] = useState<"choosePreferred" | "chooseDelta" | "followup">(
    "choosePreferred"
  )
  const [pairDeltaMode, setPairDeltaMode] = useState<"system" | "student">("system")
  const [systemDelta, setSystemDelta] = useState<number>(0)
  const [studentDelta, setStudentDelta] = useState<number>(5000)
  const [pairDeltaAcceptedPreferred, setPairDeltaAcceptedPreferred] = useState<boolean | null>(null)

  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showJobSelector, setShowJobSelector] = useState(true)
  const [showThankYou, setShowThankYou] = useState(false)

  const [loadingOffers, setLoadingOffers] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [displayTexts, setDisplayTexts] = useState<Record<OfferId, string>>({
    A: "",
    B: "",
    C: "",
    D: "",
    E: "",
  })

  const [wtpValues, setWtpValues] = useState<Record<OfferId, number>>({
    A: 60000,
    B: 60000,
    C: 60000,
    D: 60000,
    E: 60000,
  })

  const [criteriaValues, setCriteriaValues] = useState<Record<OfferId, Partial<LabelSet>>>({
    A: {},
    B: {},
    C: {},
    D: {},
    E: {},
  })

  useEffect(() => {
    initializeSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (activeTab === "pairDelta") {
      setSelectedOffer(null)
      setPairDeltaStep("choosePreferred")
      setPairDeltaMode("system")
      setSystemDelta(0)
      setPairDeltaAcceptedPreferred(null)
      setStudentDelta(5000)
    }
  }, [activeTab])

  async function initializeSession() {
    try {
      if (!sessionId) {
        const sessionRes = await fetch("/api/create-session", { method: "POST" })
        const sessionData = await sessionRes.json()
        setSessionId(sessionData.sessionId)
      }
    } catch (error) {
      console.error("Error initializing:", error)
      alert("Erreur lors de l'initialisation. Veuillez réessayer.")
    }
  }

  function resetOfferStates() {
    setOfferSet(null)
    setSelectedOffer(null)
    setReasoning("")
    setDisplayTexts({ A: "", B: "", C: "", D: "", E: "" })
    setWtpValues({ A: 60000, B: 60000, C: 60000, D: 60000, E: 60000 })
    setCriteriaValues({ A: {}, B: {}, C: {}, D: {}, E: {} })
    setPairDeltaStep("choosePreferred")
    setPairDeltaMode("system")
    setSystemDelta(0)
    setStudentDelta(5000)
    setPairDeltaAcceptedPreferred(null)
  }

  async function generateOffers(jobTitle?: string) {
    try {
      const jobToUse = (jobTitle || selectedJobTitle || jobInput).trim()
      if (!jobToUse) {
        alert("Veuillez sélectionner un titre de poste")
        return
      }

      setShowJobSelector(false)
      setLoadingOffers(true)
      resetOfferStates()
      setCurrentJobTitle(jobToUse)

      // Evite la race condition: lors du 1er rendu, sessionId peut encore être null
      let sessionToUse = sessionId
      if (!sessionToUse) {
        const sessionRes = await fetch("/api/create-session", { method: "POST" })
        const sessionData = await sessionRes.json()
        sessionToUse = sessionData.sessionId
        setSessionId(sessionToUse)
      }

      const effectiveOfferCount = activeTab === "pairDelta" ? 2 : offerCount
      const ids: OfferId[] = ["A", "B", "C", "D", "E"].slice(0, effectiveOfferCount)

      const pairRes = await fetch("/api/generate-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle: jobToUse,
          offerCount: effectiveOfferCount,
        }),
      })

      if (!pairRes.ok) {
        let errorMessage = "Erreur lors de la génération des offres"
        try {
          const errorData = await pairRes.json()
          errorMessage = errorData.error || errorMessage
        } catch {
          // ignore
        }
        throw new Error(errorMessage)
      }

      const pairData = await pairRes.json()
      if (!pairData.offers || !Array.isArray(pairData.offers) || pairData.offers.length < 2) {
        throw new Error("Les offres générées sont incomplètes")
      }

      const offers: Offer[] = (pairData.offers as Offer[])
        .filter((o) => ids.includes(o.id))
        .slice(0, ids.length)

      setOfferSet({
        offers,
        jobTitle: pairData.jobTitle,
        company: pairData.company,
        templateId: pairData.templateId,
      })
      setCurrentCompany(pairData.company)

      // Progressive text reveal par offre
      setDisplayTexts({ A: "", B: "", C: "", D: "", E: "" })
      offers.forEach((offer, index) => {
        const paragraphs = offer.text.split(/\n\n+/).filter(Boolean)
        if (paragraphs.length === 0) return

        let i = 0
        const reveal = () => {
          setDisplayTexts((prev) => ({
            ...prev,
            [offer.id]: i === 0 ? paragraphs[0] : `${prev[offer.id]}\n\n${paragraphs[i]}`,
          }))
          i++
          if (i < paragraphs.length) {
            setTimeout(reveal, 250)
          }
        }
        setTimeout(reveal, 200 * index)
      })

      // Sauvegarder la paire seulement si on a une session
      if (sessionToUse) {
        const saveRes = await fetch("/api/save-pair", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId: sessionToUse,
            offers,
            jobTitle: pairData.jobTitle,
            company: pairData.company,
          }),
        })
        const saveData = await saveRes.json()
        setPairId(saveData.pairId)
      }
    } catch (error) {
      console.error("Error generating offers:", error)
      const errorMessage =
        error instanceof Error ? error.message : "Erreur lors de la génération des offres"
      alert(`Erreur: ${errorMessage}`)
      setShowJobSelector(true)
    } finally {
      setLoadingOffers(false)
    }
  }

  async function handleVote(chosenOffer: OfferId) {
    if (!sessionId || !pairId || !offerSet) return

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
          mode: activeTab,
          wtpValues: activeTab === "wtp" ? wtpValues : undefined,
          criteriaScores: activeTab === "criteria" ? criteriaValues : undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Erreur lors de l'enregistrement du vote")
      }

      setVoteCount((prev) => prev + 1)
      setSubmitting(false)
      setShowThankYou(true)

      setTimeout(() => {
        setShowThankYou(false)
        setShowJobSelector(true)
        resetOfferStates()
        setCurrentJobTitle("")
        setCurrentCompany("")
        setSelectedJobTitle("")
        setJobInput("")
      }, 2000)
    } catch (error) {
      console.error("Error voting:", error)
      const errorMessage =
        error instanceof Error ? error.message : "Erreur lors de l'enregistrement du vote."
      alert(errorMessage)
      setSubmitting(false)
      setSelectedOffer(null)
    }
  }

  async function submitPairDeltaVote(acceptedPreferred: boolean) {
    if (!sessionId || !pairId || !offerSet || !selectedOffer) return
    if (selectedOffer !== "A" && selectedOffer !== "B") return

    const offerA = offerSet.offers.find((o) => o.id === "A") || null
    const offerB = offerSet.offers.find((o) => o.id === "B") || null
    if (!offerA || !offerB) return

    const preferredOffer = selectedOffer === "A" ? offerA : offerB
    const alternativeOffer = preferredOffer.id === "A" ? offerB : offerA

    const deltaChosen = pairDeltaMode === "system" ? systemDelta : studentDelta
    const adjustedAlternativeSalaryMin = alternativeOffer.salary.min + deltaChosen

    // Si l'étudiant maintient sa préférence pour l'offre initiale (acceptedPreferred=true),
    // alors l'alternative doit nécessiter un salaire légèrement plus élevé.
    const alternativeRequiredMin = acceptedPreferred
      ? adjustedAlternativeSalaryMin + PAIR_DELTA_STEP_EUR
      : adjustedAlternativeSalaryMin

    const wtpOverride: Partial<Record<OfferId, number>> = {
      [preferredOffer.id]: preferredOffer.salary.min,
      [alternativeOffer.id]: alternativeRequiredMin,
    }

    setSubmitting(true)
    try {
      const response = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          pairId,
          chosenOffer: preferredOffer.id,
          reasoning: reasoning || null,
          mode: "wtp",
          wtpValues: wtpOverride,
          criteriaScores: undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Erreur lors de l'enregistrement du vote")
      }

      setVoteCount((prev) => prev + 1)
      setSubmitting(false)
      setShowThankYou(true)

      setTimeout(() => {
        setShowThankYou(false)
        setShowJobSelector(true)
        resetOfferStates()
        setCurrentJobTitle("")
        setCurrentCompany("")
        setSelectedJobTitle("")
        setJobInput("")
        setPairId(null)
      }, 2000)
    } catch (error) {
      console.error("Error voting (pairDelta):", error)
      const errorMessage =
        error instanceof Error ? error.message : "Erreur lors de l'enregistrement du vote."
      alert(errorMessage)
      setSubmitting(false)
    }
  }

  const jobTitles = getAvailableJobTitles()

  const filteredSuggestions = jobInput.trim() === ""
    ? jobTitles
    : jobTitles.filter((job) =>
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
    generateOffers(jobTitle)
  }

  const handleSubmitJob = () => {
    const jobToUse = jobInput.trim()
    if (jobToUse) {
      setSelectedJobTitle(jobToUse)
      generateOffers(jobToUse)
    } else {
      alert("Veuillez entrer un titre de poste")
    }
  }

  if (showJobSelector && !offerSet && !showThankYou) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="max-w-4xl mx-auto px-6">
          <div className="mb-6 flex justify-center gap-4">
            <button
              type="button"
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                activeTab === "wtp"
                  ? "bg-[#0C346B] text-white shadow"
                  : "bg-white text-gray-700 border border-gray-300"
              }`}
              onClick={() => setActiveTab("wtp")}
            >
              Préférences & salaire
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                activeTab === "criteria"
                  ? "bg-[#0C346B] text-white shadow"
                  : "bg-white text-gray-700 border border-gray-300"
              }`}
              onClick={() => setActiveTab("criteria")}
            >
              Importance des critères
            </button>
            <button
              type="button"
              className={`px-4 py-2 rounded-full text-sm font-medium ${
                activeTab === "pairDelta"
                  ? "bg-[#0C346B] text-white shadow"
                  : "bg-white text-gray-700 border border-gray-300"
              }`}
              onClick={() => setActiveTab("pairDelta")}
            >
              Paires & delta
            </button>
          </div>
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
            <CardContent className="p-6 space-y-6">
              <div className="relative">
                <input
                  type="text"
                  value={jobInput}
                  onChange={(e) => handleJobInputChange(e.target.value)}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => {
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

                {showSuggestions && filteredSuggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredSuggestions.map((job) => (
                      <button
                        key={job.title}
                        onClick={() => handleSelectSuggestion(job.title)}
                        className="w-full px-4 py-3 text-left hover:bg-[#0C346B] hover:text-white transition-all border-b border-gray-100 last:border-b-0 group"
                      >
                        <div className="font-semibold text-gray-900 group-hover:text-white transition-colors">
                          {job.title}
                        </div>
                        <div className="text-sm text-gray-600 group-hover:text-white/90 transition-colors">
                          {job.company}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-end justify-between gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Nombre d'offres à comparer
                  </label>
                  <select
                    value={activeTab === "pairDelta" ? 2 : offerCount}
                    onChange={(e) => {
                      if (activeTab === "pairDelta") return
                      setOfferCount(Number(e.target.value))
                    }}
                    disabled={activeTab === "pairDelta"}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 disabled:opacity-60"
                  >
                    {[2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n} offres
                      </option>
                    ))}
                  </select>
                  {activeTab === "pairDelta" && (
                    <p className="text-[11px] text-gray-500 mt-1">
                      Expérience paire : fixée à 2 offres
                    </p>
                  )}
                </div>

                <Button
                  onClick={handleSubmitJob}
                  disabled={!jobInput.trim()}
                  className="flex-1 h-12 text-lg disabled:bg-[#0C346B] disabled:opacity-70"
                >
                  Générer les offres
                </Button>
              </div>

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

  if (showThankYou && !offerSet && !loadingOffers) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 flex items-center justify-center">
        <div className="max-w-md mx-auto px-6">
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 shadow-lg">
            <CardContent className="p-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <span className="text-5xl">✓</span>
                <div>
                  <p className="font-semibold text-green-900 text-xl mb-2">
                    Merci pour votre participation !
                  </p>
                  <p className="text-sm text-green-700">
                    Vos réponses ont bien été enregistrées.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!offerSet && !loadingOffers) {
    return null
  }

  const displayOffers = offerSet || {
    offers: [],
    jobTitle: currentJobTitle || selectedJobTitle || "",
    company: currentCompany || "",
    templateId: "",
  }

  const effectiveOfferCount = activeTab === "pairDelta" ? 2 : offerCount
  const visibleOffers = displayOffers.offers.slice(0, effectiveOfferCount)

  // Expérience paire A/B (pairDelta)
  const pairOfferA = visibleOffers.find((o) => o.id === "A") || visibleOffers[0]
  const pairOfferB = visibleOffers.find((o) => o.id === "B") || visibleOffers[1] || visibleOffers[0]
  const pairPreferredOffer =
    selectedOffer === "A" ? pairOfferA : selectedOffer === "B" ? pairOfferB : null
  const pairAlternativeOffer =
    pairPreferredOffer && pairOfferA && pairOfferB
      ? pairPreferredOffer.id === pairOfferA.id
        ? pairOfferB
        : pairOfferA
      : null
  const pairDeltaChosen = pairDeltaMode === "system" ? systemDelta : studentDelta

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-6">
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

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Comparez ces offres
          </h1>
          <p className="text-gray-600">
            {displayOffers.jobTitle} {displayOffers.company && `- ${displayOffers.company}`}
            {loadingOffers && (
              <span className="ml-2 text-sm text-gray-400">(Génération en cours...)</span>
            )}
          </p>
          {voteCount > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Vous avez déjà complété {voteCount} tâche(s)
            </p>
          )}
        </div>

        <div className="mb-6 flex justify-center gap-4">
          <button
            type="button"
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              activeTab === "wtp"
                ? "bg-[#0C346B] text-white shadow"
                : "bg-white text-gray-700 border border-gray-300"
            }`}
            onClick={() => setActiveTab("wtp")}
          >
            Préférences & salaire
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              activeTab === "criteria"
                ? "bg-[#0C346B] text-white shadow"
                : "bg-white text-gray-700 border border-gray-300"
            }`}
            onClick={() => setActiveTab("criteria")}
          >
            Importance des critères
          </button>
          <button
            type="button"
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              activeTab === "pairDelta"
                ? "bg-[#0C346B] text-white shadow"
                : "bg-white text-gray-700 border border-gray-300"
            }`}
            onClick={() => setActiveTab("pairDelta")}
          >
            Paires & delta
          </button>
        </div>

        <div className="mb-6 flex justify-center">
          <Button
            onClick={() => {
              setShowJobSelector(true)
              resetOfferStates()
              setCurrentJobTitle("")
              setCurrentCompany("")
              setSelectedJobTitle("")
              setJobInput("")
            }}
            variant="outline"
            className="border-[#0C346B] text-[#0C346B]"
          >
            Générer de nouvelles offres
          </Button>
        </div>

        <div className={`grid gap-6 mb-6 ${visibleOffers.length >= 3 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
          {visibleOffers.map((offer) => (
            <Card
              key={offer.id}
              className={`bg-white border-gray-200 shadow-md transition-all flex flex-col h-full ${
                selectedOffer === offer.id ? "ring-2 ring-[#0C346B]" : ""
              }`}
            >
              <CardHeader className="border-b border-gray-100 flex flex-col gap-1">
                <CardTitle className="text-gray-900 font-semibold text-lg">
                  Offre {offer.id}
                </CardTitle>
                {offer.salary.min > 0 && (
                  <p className="text-xs text-gray-600">
                    Salaire proposé : {offer.salary.min}€ - {offer.salary.max}€ / an
                  </p>
                )}
              </CardHeader>
              <CardContent className="flex flex-col flex-1 p-6">
                <div className="flex-1 space-y-4">
                  {loadingOffers ? (
                    <div className="space-y-3">
                      <div className="h-4 bg-slate-200 rounded animate-pulse" />
                      <div className="h-4 bg-slate-200 rounded animate-pulse w-5/6" />
                      <div className="h-4 bg-slate-200 rounded animate-pulse w-4/6" />
                      <div className="h-4 bg-slate-200 rounded animate-pulse w-5/6" />
                      <div className="h-4 bg-slate-200 rounded animate-pulse w-3/6" />
                      <div className="flex items-center gap-2 pt-2">
                        <Spinner className="h-4 w-4" />
                        <span className="text-sm text-slate-500">Génération de l'offre...</span>
                      </div>
                    </div>
                  ) : (
                    <div
                      className="text-slate-700 text-sm leading-relaxed max-w-none [&_strong]:font-bold [&_strong]:text-slate-900 [&_ul]:my-2 [&_li]:mb-1 [&_p]:mb-2 [&_h3]:font-bold [&_h3]:text-base [&_h3]:mt-4 [&_h3]:mb-2"
                      dangerouslySetInnerHTML={{
                        __html: (displayTexts[offer.id] || offer.text)
                          ? markdownToHtml(displayTexts[offer.id] || offer.text)
                          : "Aucune offre disponible",
                      }}
                    />
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                  {activeTab === "pairDelta" ? (
                    pairDeltaStep === "choosePreferred" ? (
                      <Button
                        onClick={() => {
                          setSelectedOffer(offer.id)
                          setPairDeltaStep("chooseDelta")
                          if (pairDeltaMode === "system") {
                            const pick =
                              PAIR_DELTA_SYSTEM_CHOICES[
                                Math.floor(Math.random() * PAIR_DELTA_SYSTEM_CHOICES.length)
                              ]
                            setSystemDelta(pick)
                          }
                        }}
                        disabled={submitting || loadingOffers || !offer.text}
                        className="w-full disabled:bg-[#0C346B] disabled:opacity-70"
                      >
                        Je préfère l'offre {offer.id}
                      </Button>
                    ) : (
                      <p className="text-xs text-gray-600">
                        Offre préférée : {selectedOffer ? `Offre ${selectedOffer}` : "—"}
                      </p>
                    )
                  ) : (
                    <>
                      {activeTab === "wtp" ? (
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Salaire minimum pour accepter cette offre
                          </label>
                          <input
                            type="range"
                            min={30000}
                            max={120000}
                            step={1000}
                            value={wtpValues[offer.id]}
                            onChange={(e) =>
                              setWtpValues((prev) => ({
                                ...prev,
                                [offer.id]: Number(e.target.value),
                              }))
                            }
                            disabled={submitting || loadingOffers}
                            className="w-full accent-[#0C346B]"
                          />
                          <p className="text-[11px] text-gray-600 mt-1">
                            Salaire minimum indiqué : {wtpValues[offer.id]} € / an
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {CRITERIA_KEYS.map((key) => (
                            <div key={key} className="mb-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="block text-xs font-medium text-gray-700">
                                  {CRITERIA_LABELS[key]}
                                </span>
                                <span className="text-xs font-semibold text-gray-700">
                                  {(criteriaValues[offer.id]?.[key] ?? 5)}/10
                                </span>
                              </div>
                              <input
                                type="range"
                                min={1}
                                max={10}
                                step={1}
                                value={criteriaValues[offer.id]?.[key] ?? 5}
                                onChange={(e) =>
                                  setCriteriaValues((prev) => ({
                                    ...prev,
                                    [offer.id]: {
                                      ...(prev[offer.id] || {}),
                                      [key]: Number(e.target.value),
                                    },
                                  }))
                                }
                                disabled={submitting || loadingOffers}
                                className="w-full accent-[#0C346B]"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <Button
                        onClick={() => handleVote(offer.id)}
                        disabled={
                          submitting ||
                          loadingOffers ||
                          !offer.text ||
                          selectedOffer !== null
                        }
                        className="w-full disabled:bg-[#0C346B] disabled:opacity-70"
                      >
                        {submitting && selectedOffer === offer.id ? (
                          <>
                            <Spinner className="mr-2" />
                            Enregistrement...
                          </>
                        ) : (
                          `Je préfère l'offre ${offer.id}`
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {activeTab === "pairDelta" && offerSet && (
          <Card className="bg-white border-gray-200 shadow-md mb-6">
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="text-sm text-gray-900 font-semibold">
                Expérience par paires : seuil delta
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {pairDeltaStep === "choosePreferred" && (
                <p className="text-sm text-gray-700">
                  Commence par choisir l'offre préférée ({pairOfferA?.id} vs {pairOfferB?.id}) puis définis un delta de salaire pour l'offre alternative.
                </p>
              )}

              {pairDeltaStep === "chooseDelta" && (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-900">
                      Delta de salaire appliqué à l'offre alternative (en € / an)
                    </p>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant={pairDeltaMode === "system" ? "default" : "outline"}
                        className={pairDeltaMode === "system" ? "bg-[#0C346B] hover:bg-[#0a2a56]" : ""}
                        onClick={() => {
                          setPairDeltaMode("system")
                          const pick =
                            PAIR_DELTA_SYSTEM_CHOICES[
                              Math.floor(Math.random() * PAIR_DELTA_SYSTEM_CHOICES.length)
                            ]
                          setSystemDelta(pick)
                        }}
                        disabled={submitting}
                      >
                        Le système fixe le delta
                      </Button>

                      <Button
                        type="button"
                        variant={pairDeltaMode === "student" ? "default" : "outline"}
                        className={pairDeltaMode === "student" ? "bg-[#0C346B] hover:bg-[#0a2a56]" : ""}
                        onClick={() => setPairDeltaMode("student")}
                        disabled={submitting}
                      >
                        Je fixe le delta
                      </Button>
                    </div>

                    {pairDeltaMode === "system" ? (
                      <p className="text-sm text-gray-700">
                        Delta proposé : <span className="font-semibold">{systemDelta} €</span>
                      </p>
                    ) : (
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-gray-700">
                          Delta choisi par l’étudiant
                        </label>
                        <input
                          type="range"
                          min={-20000}
                          max={40000}
                          step={1000}
                          value={studentDelta}
                          onChange={(e) => setStudentDelta(Number(e.target.value))}
                          disabled={submitting}
                          className="w-full accent-[#0C346B]"
                        />
                        <p className="text-sm text-gray-700">
                          Delta : <span className="font-semibold">{studentDelta} €</span>
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={() => setPairDeltaStep("followup")}
                    disabled={!selectedOffer || submitting}
                    className="w-full"
                  >
                    Continuer
                  </Button>
                </>
              )}

              {pairDeltaStep === "followup" && pairPreferredOffer && pairAlternativeOffer && (
                <>
                  {(() => {
                    const adjustedAlternativeSalaryMin = pairAlternativeOffer.salary.min + pairDeltaChosen
                    const deltaLabel = pairDeltaMode === "system" ? systemDelta : studentDelta
                    return (
                      <>
                        <p className="text-sm text-gray-700">
                          Offre alternative ajustée : <span className="font-semibold">{pairAlternativeOffer.id}</span> — salaire minimal testé{" "}
                          <span className="font-semibold">{adjustedAlternativeSalaryMin} €</span>
                        </p>
                        <p className="text-sm text-gray-900 font-medium">
                          Au salaire ajusté, accepterais-tu l’offre que tu avais préférée au départ ?
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            type="button"
                            onClick={() => submitPairDeltaVote(true)}
                            disabled={submitting}
                            className="w-full bg-[#0C346B] hover:bg-[#0a2a56]"
                          >
                            Oui
                          </Button>
                          <Button
                            type="button"
                            onClick={() => submitPairDeltaVote(false)}
                            disabled={submitting}
                            variant="outline"
                            className="w-full border-[#0C346B] text-[#0C346B] hover:bg-[#0a2a56] hover:text-white"
                          >
                            Non
                          </Button>
                        </div>
                        <p className="text-[11px] text-gray-500">
                          Réponse suivante = information pour estimer le seuil de basculement.
                        </p>
                        <p className="text-[11px] text-gray-500">
                          (Delta appliqué : {deltaLabel} € / an)
                        </p>
                      </>
                    )
                  })()}
                </>
              )}
            </CardContent>
          </Card>
        )}

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
              disabled={submitting || loadingOffers}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
