import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"
import { getRandomTemplate, getTemplateById, getRandomTemplateForJobTitle } from "@/lib/offer-pairs"
import { LabelSet } from "@/lib/types"

const analysisSchema = z.object({
  DIVERSITY: z.number().int().min(0).max(1),
  REMUNERATION_BENEFITS: z.number().int().min(0).max(1),
  PROFESSIONAL_OPPORTUNITIES: z.number().int().min(0).max(1),
  CULTURE_VALUES: z.number().int().min(0).max(1),
  LEADERSHIP: z.number().int().min(0).max(1),
  WORK_LIFE_BALANCE: z.number().int().min(0).max(1),
})

// Fonction pour obtenir la description des labels
function getLabelDescriptions(labels: LabelSet): string {
  const descriptions: string[] = []
  
  if (labels.DIVERSITY === 1) {
    descriptions.push("DIVERSITY (Diversité, Inclusion, Équité) : Tu DOIS mentionner explicitement la diversité, l'inclusion, l'équité, le handicap, l'égalité des genres, les politiques de diversité, les initiatives d'inclusion.")
  }
  if (labels.REMUNERATION_BENEFITS === 1) {
    descriptions.push("REMUNERATION_BENEFITS (Rémunération et Avantages) : Tu DOIS détailler clairement la rémunération, les primes, les avantages sociaux, la mutuelle, les tickets restaurant, les avantages en nature.")
  }
  if (labels.PROFESSIONAL_OPPORTUNITIES === 1) {
    descriptions.push("PROFESSIONAL_OPPORTUNITIES (Opportunités Professionnelles) : Tu DOIS insister sur les opportunités de formation, d'évolution de carrière, de mentorat, de développement professionnel, les perspectives d'évolution.")
  }
  if (labels.CULTURE_VALUES === 1) {
    descriptions.push("CULTURE_VALUES (Culture et Valeurs) : Tu DOIS mettre en avant la culture d'entreprise, les valeurs, l'esprit d'équipe, la mission, la collaboration, l'ambiance de travail.")
  }
  if (labels.LEADERSHIP === 1) {
    descriptions.push("LEADERSHIP (Leadership et Vision) : Tu DOIS parler du leadership, de la vision stratégique, du style de management, des dirigeants, de la direction.")
  }
  if (labels.WORK_LIFE_BALANCE === 1) {
    descriptions.push("WORK_LIFE_BALANCE (Équilibre Vie Pro/Perso) : Tu DOIS insister fortement sur l'équilibre vie pro/perso, le télétravail, les horaires flexibles, le bien-être, la qualité de vie au travail.")
  }
  
  return descriptions.join("\n")
}

const OFFRE_EXEMPLES = `
EXEMPLES DE STYLE À IMITER (cabinet M&A / conseil) :

Exemple 1 – M&A (Cambon Partners / Alantra) :
**Descriptif du poste**
[Entreprise] recherche un [titre] pour [contexte]. Principales missions : [missions en puces concrètes : origination, exécution de mandats, valorisation, modélisation, etc.]. L’équipe réalise des opérations dans [secteurs].

**Profil recherché**
[Expérience requise], [compétences techniques], [qualités]. Français et anglais courant. Maîtrise d’Excel et PowerPoint.

Exemple 2 – Conseil (BCG-style) :
**Who We Are** / **Présentation**
[Court paragraphe sur l’entreprise, positionnement, valeurs.]

**What You'll Do** / **Le poste**
[Paragraphe + missions en puces : analyses, recommandations, accompagnement client, mentorat.]

**What You'll Bring** / **Profil recherché**
[Compétences et qualités en puces, niveau d’études, langues, soft skills.]

**Why join us** / **Ce que nous offrons**
[Rémunération, avantages, formation, environnement.]
`

// Même contenu que getLabelDescriptions mais sans les noms techniques (DIVERSITY, REMUNERATION_BENEFITS, etc.) pour que le modèle n'écrive pas ces mots dans l'offre
function getLabelDescriptionsMasked(labels: LabelSet): string {
  const full = getLabelDescriptions(labels)
  return full
    .split("\n")
    .map((line) => {
      const idx = line.indexOf(" : ")
      if (idx > 0) return line.slice(idx + 3).trim()
      return line
    })
    .filter(Boolean)
    .join("\n")
}

// Fourchettes salariales par secteur (marché français) — à respecter strictement
const SECTOR_RANGES: Array<{ keywords: string[]; min: number; max: number }> = [
  { keywords: ["consultant stratégie", "consultant strategie", "stratégie", "strat ", "strategy", "conseil stratégie", "conseil strategy"], min: 50000, max: 70000 },
  { keywords: ["analyste financier", "analyste finance", "m&a", "m a", "fusion acquisition", "investment banking", "banque d'investissement", "ib "], min: 60000, max: 100000 },
  { keywords: ["marketing", "brand", "digital marketing", "growth"], min: 35000, max: 50000 },
]

function getSalaryRangeForJobTitle(jobTitle: string): { min: number; max: number } {
  const t = jobTitle.toLowerCase().trim()
  for (const sector of SECTOR_RANGES) {
    if (sector.keywords.some((k) => t.includes(k))) {
      return { min: sector.min, max: sector.max }
    }
  }
  return { min: 40000, max: 60000 }
}

function roundToHundred(n: number): number {
  return Math.round(n / 100) * 100
}

// Deux fourchettes resserrées (écart aléatoire 3–12k), arrondies à la centaine d'euros
function getTwoSalaryRanges(sectorRange: { min: number; max: number }): [ { min: number; max: number }, { min: number; max: number } ] {
  const { min: smin, max: smax } = sectorRange
  const span = smax - smin
  const bandWidth = Math.max(4000, Math.min(6000, Math.round(span * 0.15)))
  const gap = Math.round(3000 + Math.random() * 9000)
  const low = smin + Math.round(Math.random() * Math.max(0, span * 0.5))
  const aMin = roundToHundred(low)
  const aMax = roundToHundred(Math.min(smax, low + bandWidth))
  const bMin = roundToHundred(Math.max(aMax + 2000, Math.min(smax - bandWidth, aMax + gap)))
  const bMax = roundToHundred(Math.min(smax, bMin + bandWidth))
  return [
    { min: aMin, max: roundToHundred(Math.max(aMin + 2000, aMax)) },
    { min: bMin, max: roundToHundred(Math.max(bMin + 2000, bMax)) },
  ]
}

async function generateOffer(params: {
  jobTitle: string
  company: string
  labels: LabelSet
  salary: { min: number; max: number }
  focus: string
  otherOffer?: { salary: { min: number; max: number }; focus: string } | null
}): Promise<string> {
  const labelDescriptions = getLabelDescriptionsMasked(params.labels)
  const otherOfferBlock = params.otherOffer
    ? `L'autre offre (même poste) propose ${params.otherOffer.salary.min}€-${params.otherOffer.salary.max}€ et met en avant: ${params.otherOffer.focus}. Différencie bien cette offre (salaire ${params.salary.min}€-${params.salary.max}€, autres points selon instructions), même structure.`
    : `Les deux offres doivent être bien différenciées en prix et message, même structure.`

  const prompt = `Tu rédiges une offre d'emploi réaliste pour le marché français. Inspire-toi du style et de la structure des exemples ci-dessous (cabinet M&A, conseil en stratégie, etc.) : titres en gras, missions en puces, profil en puces, ton professionnel.
${OFFRE_EXEMPLES}

Poste à pourvoir: ${params.jobTitle} | Entreprise: ${params.company}
Salaire à indiquer pour cette offre: ${params.salary.min}€ - ${params.salary.max}€ (fourchette cohérente secteur). Affiche toujours les montants arrondis à la centaine d'euros (ex: 52 400 € - 58 100 €). Ne pas inventer d'autres chiffres.
${otherOfferBlock}

Thèmes à intégrer et à ACCENTUER pour que la différence soit visible entre les offres:
${labelDescriptions}

Tu DOIS rendre ces thèmes bien visibles et compréhensibles dans l'offre: les mentionner clairement (phrases dédiées ou listes), mettre en **gras** les mots ou expressions clés qui y correspondent (ex: "diversité et inclusion", "équilibre vie pro", "rémunération et avantages"), et en parler de façon explicite pour qu'un lecteur comprenne sans ambiguïté ce qui est mis en avant. Même en gardant le style et la structure type BCG/Alantra, ces thèmes doivent être suffisamment présents et lisibles — pas de noms techniques, mais des formulations naturelles et bien mises en valeur.

Focus à mettre en avant: ${params.focus}

Règle: utilise des sections du type **Descriptif du poste**, **Principales missions** (ou **Le poste**), **Profil recherché**, **Ce que nous offrons** (avec salaire ${params.salary.min}€-${params.salary.max}€, avantages), **Modalités de candidature** ou **Déroulement des entretiens**. Rédige en markdown, concis et professionnel.`

  const result = await streamText({
    model: openai("gpt-4o"),
    prompt,
    maxOutputTokens: 2500,
  })
  let text = ""
  for await (const chunk of result.textStream) {
    text += chunk
  }
  return text
}

async function verifyLabels(offerText: string, requiredLabels: LabelSet): Promise<boolean> {
  try {
    const { object } = await generateObject({
      model: openai("gpt-4o"),
      system: `Tu es un expert en analyse RH. Analyse les offres d'emploi et retourne les labels (0 ou 1 pour chacun).`,
      prompt: `Analyse cette offre d'emploi et retourne les labels. Sois strict : un label doit être à 1 seulement si l'élément est clairement et explicitement mentionné dans l'offre.\n\n${offerText}`,
      schema: analysisSchema,
    })

    // Vérifier que tous les labels requis sont présents
    for (const [key, value] of Object.entries(requiredLabels)) {
      if (value === 1 && object[key as keyof typeof object] !== 1) {
        return false
      }
    }

    return true
  } catch (error) {
    console.error("Error verifying labels:", error)
    // En cas d'erreur, on accepte l'offre pour ne pas bloquer la génération
    return true
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}))
    const { templateId, jobTitle, company } = body
    
    // Logique de sélection du template :
    // 1. Si templateId est fourni (admin), utiliser ce template
    // 2. Si jobTitle est fourni (utilisateur), choisir un template aléatoire pour ce job ou un template aléatoire
    // 3. Sinon, template complètement aléatoire
    let template: ReturnType<typeof getRandomTemplate>
    let finalJobTitle: string
    let finalCompany: string
    
    if (templateId) {
      // Mode admin : utiliser le template spécifié
      template = getTemplateById(templateId) || getRandomTemplate()
      finalJobTitle = jobTitle || template.jobTitle
      finalCompany = company || template.company
    } else if (jobTitle) {
      // Mode utilisateur : utiliser le jobTitle fourni, choisir un template aléatoire pour les labels/thème
      template = getRandomTemplateForJobTitle(jobTitle) || getRandomTemplate()
      finalJobTitle = jobTitle // Utiliser le jobTitle fourni par l'utilisateur
      finalCompany = company || template.company // Utiliser la company fournie ou celle du template
    } else {
      // Template complètement aléatoire
      template = getRandomTemplate()
      finalJobTitle = template.jobTitle
      finalCompany = template.company
    }

    // Fourchettes salariales par secteur (d'après le titre du poste) et deux offres bien séparées
    const sectorRange = getSalaryRangeForJobTitle(finalJobTitle)
    const [salaryA, salaryB] = getTwoSalaryRanges(sectorRange)

    // Fonction helper pour générer une offre avec retry (accepte l'offre après 3 tentatives si non vide)
    async function generateOfferWithRetry(
      params: {
        jobTitle: string
        company: string
        labels: LabelSet
        salary: { min: number; max: number }
        focus: string
        otherOffer?: { salary: { min: number; max: number }; focus: string } | null
      },
      maxAttempts: number = 3
    ): Promise<string> {
      let attempts = 0
      let lastValidOffer = ""
      while (attempts < maxAttempts) {
        try {
          const offer = await generateOffer(params)
          if (offer && offer.trim().length > 0) {
            lastValidOffer = offer
            const isValid = await verifyLabels(offer, params.labels)
            if (isValid) return offer
            console.warn(`[generate-pair] Attempt ${attempts + 1}: offer generated but labels verification failed, retrying...`)
          } else {
            console.warn(`[generate-pair] Attempt ${attempts + 1}: empty offer returned`)
          }
        } catch (error) {
          console.error(`[generate-pair] Attempt ${attempts + 1} error:`, error)
        }
        attempts++
      }
      if (lastValidOffer) {
        console.warn("[generate-pair] Accepting last generated offer without strict label verification after", maxAttempts, "attempts")
        return lastValidOffer
      }
      throw new Error(`Failed to generate offer after ${maxAttempts} attempts`)
    }

    // Générer les deux offres en parallèle (chacune connaît le contexte de l'autre pour se différencier)
    const [offerA, offerB] = await Promise.all([
      generateOfferWithRetry({
        jobTitle: finalJobTitle,
        company: finalCompany,
        labels: template.offerA.labels,
        salary: salaryA,
        focus: template.offerA.focus,
        otherOffer: { salary: salaryB, focus: template.offerB.focus },
      }),
      generateOfferWithRetry({
        jobTitle: finalJobTitle,
        company: finalCompany,
        labels: template.offerB.labels,
        salary: salaryB,
        focus: template.offerB.focus,
        otherOffer: { salary: salaryA, focus: template.offerA.focus },
      }),
    ])

    return Response.json({
      offerA: {
        text: offerA,
        labels: template.offerA.labels,
        salary: salaryA,
      },
      offerB: {
        text: offerB,
        labels: template.offerB.labels,
        salary: salaryB,
      },
      jobTitle: finalJobTitle, // Utiliser le jobTitle final (celui de l'utilisateur si fourni)
      company: finalCompany,
      templateId: template.id, // Garder le templateId pour l'analyse
    })
  } catch (error) {
    console.error("Error generating pair:", error)
    const errorMessage = error instanceof Error ? error.message : "Failed to generate job offers"
    return Response.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
