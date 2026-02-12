import { streamText } from "ai"
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"
import { getRandomTemplate } from "@/lib/offer-pairs"
import { LabelSet } from "@/lib/types"

const analysisSchema = z.object({
  DIVERSITY: z.number().int().min(0).max(1),
  REMUNERATION_BENEFITS: z.number().int().min(0).max(1),
  PROFESSIONAL_OPPORTUNITIES: z.number().int().min(0).max(1),
  CULTURE_VALUES: z.number().int().min(0).max(1),
  LEADERSHIP: z.number().int().min(0).max(1),
  WORK_LIFE_BALANCE: z.number().int().min(0).max(1),
})

async function generateOffer(params: {
  jobTitle: string
  company: string
  labels: LabelSet
  salary: { min: number; max: number }
  focus: string
}): Promise<string> {
  const prompt = `Tu es un expert en recrutement spécialisé dans la rédaction d'offres d'emploi professionnelles.

Génère une offre d'emploi pour:
- Titre du poste: ${params.jobTitle}
- Entreprise: ${params.company}
- Salaire: ${params.salary.min}€ - ${params.salary.max}€ par an

INSTRUCTIONS CRITIQUES - Tu DOIS respecter ces critères:
${params.focus}

L'offre doit inclure:
1. Un titre accrocheur
2. Une présentation de l'entreprise
3. Description du rôle et responsabilités
4. Profil recherché (compétences, expérience)
5. Ce que l'entreprise offre (selon les critères ci-dessus)
6. Modalités de candidature

Rédige une offre convaincante, professionnelle et réaliste.`

  const result = await streamText({
    model: openai("gpt-4o-mini"),
    prompt,
    maxOutputTokens: 2000,
  })

  let text = ""
  for await (const chunk of result.textStream) {
    text += chunk
  }

  return text
}

async function verifyLabels(offerText: string, requiredLabels: LabelSet): Promise<boolean> {
  const { object } = await generateObject({
    model: openai("gpt-4o-mini"),
    system: `You are an expert HR analyst. Analyze job offers and return labels (0 or 1 for each).`,
    prompt: `Analyze this job offer and return the labels:\n\n${offerText}`,
    schema: analysisSchema,
  })

  // Vérifier que tous les labels requis sont présents
  for (const [key, value] of Object.entries(requiredLabels)) {
    if (value === 1 && object[key as keyof typeof object] !== 1) {
      return false
    }
  }

  return true
}

export async function POST(request: Request) {
  try {
    const template = getRandomTemplate()

    // Générer l'offre A avec vérification
    let offerA = ""
    let attemptsA = 0
    while (attemptsA < 3) {
      offerA = await generateOffer({
        jobTitle: template.jobTitle,
        company: template.company,
        labels: template.offerA.labels,
        salary: template.offerA.salary,
        focus: template.offerA.focus,
      })

      const isValid = await verifyLabels(offerA, template.offerA.labels)
      if (isValid) break
      attemptsA++
    }

    // Générer l'offre B avec vérification
    let offerB = ""
    let attemptsB = 0
    while (attemptsB < 3) {
      offerB = await generateOffer({
        jobTitle: template.jobTitle,
        company: template.company,
        labels: template.offerB.labels,
        salary: template.offerB.salary,
        focus: template.offerB.focus,
      })

      const isValid = await verifyLabels(offerB, template.offerB.labels)
      if (isValid) break
      attemptsB++
    }

    return Response.json({
      offerA: {
        text: offerA,
        labels: template.offerA.labels,
        salary: template.offerA.salary,
      },
      offerB: {
        text: offerB,
        labels: template.offerB.labels,
        salary: template.offerB.salary,
      },
      jobTitle: template.jobTitle,
      company: template.company,
      templateId: template.id,
    })
  } catch (error) {
    console.error("Error generating pair:", error)
    return Response.json(
      { error: "Failed to generate job offers" },
      { status: 500 }
    )
  }
}
