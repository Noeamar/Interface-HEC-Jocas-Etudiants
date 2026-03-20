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

// Génère N fourchettes salariales resserrées dans la plage secteur
function getSalaryRanges(sectorRange: { min: number; max: number }, count: number): Array<{ min: number; max: number }> {
  const { min: smin, max: smax } = sectorRange
  const span = Math.max(8000, smax - smin)
  const bandWidth = Math.max(4000, Math.min(6000, Math.round(span * 0.15)))

  const ranges: Array<{ min: number; max: number }> = []
  const step = span / (count + 1)

  for (let i = 0; i < count; i++) {
    const center = smin + step * (i + 1)
    const rawMin = center - bandWidth / 2
    const rawMax = center + bandWidth / 2
    const rMin = roundToHundred(Math.max(smin, Math.min(rawMin, smax - bandWidth)))
    const rMax = roundToHundred(Math.min(smax, rMin + bandWidth))
    ranges.push({
      min: rMin,
      max: roundToHundred(Math.max(rMin + 2000, rMax)),
    })
  }

  return ranges
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
    const { templateId, jobTitle, company, offerCount } = body
    
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

    // Fourchettes salariales par secteur (d'après le titre du poste) et offres bien séparées
    const sectorRange = getSalaryRangeForJobTitle(finalJobTitle)
    const count = Math.min(5, Math.max(2, typeof offerCount === "number" ? Math.round(offerCount) : 3))
    const salaryRanges = getSalaryRanges(sectorRange, count)

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

    // Générer N offres en parallèle
    const offerIds = ["A", "B", "C", "D", "E"].slice(0, count) as Array<"A" | "B" | "C" | "D" | "E">

    const offersTexts = await Promise.all(
      offerIds.map((id, index) => {
        const isEven = index % 2 === 0
        const base = isEven ? template.offerA : template.offerB
        const salary = salaryRanges[index]
        const focus =
          index <= 1
            ? base.focus
            : `${base.focus} (variante ${index + 1} : reformule en gardant le même esprit, pour créer une offre distincte mais cohérente).`

        const otherIndex = (index + 1) % count
        const otherSalary = salaryRanges[otherIndex]
        const otherBase = (otherIndex % 2 === 0 ? template.offerA : template.offerB)

        return generateOfferWithRetry({
          jobTitle: finalJobTitle,
          company: finalCompany,
          labels: base.labels,
          salary,
          focus,
          otherOffer: { salary: otherSalary, focus: otherBase.focus },
        })
      })
    )

    const offers = offerIds.map((id, index) => {
      const isEven = index % 2 === 0
      const base = isEven ? template.offerA : template.offerB
      return {
        id,
        text: offersTexts[index],
        labels: base.labels,
        salary: salaryRanges[index],
      }
    })

    return Response.json({
      offers,
      jobTitle: finalJobTitle,
      company: finalCompany,
      templateId: template.id,
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
