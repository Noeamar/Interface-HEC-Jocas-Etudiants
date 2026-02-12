import { LabelSet } from './types'

export interface PairTemplate {
  id: string
  jobTitle: string
  company: string
  offerA: {
    labels: LabelSet
    salary: { min: number; max: number }
    focus: string
  }
  offerB: {
    labels: LabelSet
    salary: { min: number; max: number }
    focus: string
  }
}

export const PAIR_TEMPLATES: PairTemplate[] = [
  {
    id: 'diversity_vs_remuneration',
    jobTitle: 'Consultant Junior',
    company: 'Cabinet de Conseil',
    offerA: {
      labels: {
        DIVERSITY: 1,
        REMUNERATION_BENEFITS: 0,
        PROFESSIONAL_OPPORTUNITIES: 1,
        CULTURE_VALUES: 1,
        LEADERSHIP: 0,
        WORK_LIFE_BALANCE: 0,
      },
      salary: { min: 45000, max: 50000 },
      focus: 'Mettre FORTEMENT l\'accent sur la diversité, l\'inclusion, l\'équité, le handicap, l\'égalité des genres. Mentionner les opportunités de formation et la culture d\'entreprise.',
    },
    offerB: {
      labels: {
        DIVERSITY: 0,
        REMUNERATION_BENEFITS: 1,
        PROFESSIONAL_OPPORTUNITIES: 1,
        CULTURE_VALUES: 1,
        LEADERSHIP: 0,
        WORK_LIFE_BALANCE: 0,
      },
      salary: { min: 50000, max: 55000 },
      focus: 'Détailler CLAIREMENT la rémunération, les primes, les avantages sociaux, la mutuelle. Mentionner les opportunités de formation et la culture d\'entreprise.',
    },
  },
  {
    id: 'worklife_vs_opportunities',
    jobTitle: 'Analyste Finance',
    company: 'Banque d\'Investissement',
    offerA: {
      labels: {
        DIVERSITY: 0,
        REMUNERATION_BENEFITS: 1,
        PROFESSIONAL_OPPORTUNITIES: 0,
        CULTURE_VALUES: 1,
        LEADERSHIP: 0,
        WORK_LIFE_BALANCE: 1,
      },
      salary: { min: 48000, max: 52000 },
      focus: 'Insister FORTEMENT sur l\'équilibre vie pro/perso, le télétravail, les horaires flexibles, le bien-être. Mentionner la rémunération et la culture.',
    },
    offerB: {
      labels: {
        DIVERSITY: 0,
        REMUNERATION_BENEFITS: 1,
        PROFESSIONAL_OPPORTUNITIES: 1,
        CULTURE_VALUES: 1,
        LEADERSHIP: 1,
        WORK_LIFE_BALANCE: 0,
      },
      salary: { min: 50000, max: 55000 },
      focus: 'Insister sur les opportunités de FORMATION, d\'évolution de carrière, de mentorat, de développement. Parler du LEADERSHIP et de la vision stratégique. Mentionner la rémunération et la culture.',
    },
  },
  {
    id: 'leadership_vs_culture',
    jobTitle: 'Chef de Projet Digital',
    company: 'Grande Entreprise',
    offerA: {
      labels: {
        DIVERSITY: 1,
        REMUNERATION_BENEFITS: 1,
        PROFESSIONAL_OPPORTUNITIES: 0,
        CULTURE_VALUES: 0,
        LEADERSHIP: 1,
        WORK_LIFE_BALANCE: 1,
      },
      salary: { min: 52000, max: 57000 },
      focus: 'Parler du LEADERSHIP, de la vision stratégique, du style de management, des dirigeants. Mentionner la diversité, la rémunération et l\'équilibre vie pro/perso.',
    },
    offerB: {
      labels: {
        DIVERSITY: 1,
        REMUNERATION_BENEFITS: 1,
        PROFESSIONAL_OPPORTUNITIES: 0,
        CULTURE_VALUES: 1,
        LEADERSHIP: 0,
        WORK_LIFE_BALANCE: 1,
      },
      salary: { min: 50000, max: 55000 },
      focus: 'Mettre en avant la CULTURE d\'entreprise, les valeurs, l\'esprit d\'équipe, la mission, la collaboration. Mentionner la diversité, la rémunération et l\'équilibre vie pro/perso.',
    },
  },
]

export function getRandomTemplate(): PairTemplate {
  return PAIR_TEMPLATES[Math.floor(Math.random() * PAIR_TEMPLATES.length)]
}

export function getTemplateById(id: string): PairTemplate | undefined {
  return PAIR_TEMPLATES.find(template => template.id === id)
}

export function getTemplateNames(): Array<{ id: string; name: string; description: string }> {
  return [
    {
      id: 'diversity_vs_remuneration',
      name: 'Diversité vs Rémunération',
      description: 'Consultant Junior - Comparaison entre diversité/inclusion et rémunération/avantages'
    },
    {
      id: 'worklife_vs_opportunities',
      name: 'Équilibre vs Opportunités',
      description: 'Analyste Finance - Comparaison entre équilibre vie pro/perso et opportunités de carrière'
    },
    {
      id: 'leadership_vs_culture',
      name: 'Leadership vs Culture',
      description: 'Chef de Projet Digital - Comparaison entre leadership/vision et culture d\'entreprise'
    }
  ]
}

// Fonction pour obtenir les titres de jobs disponibles (pour l'utilisateur)
export function getAvailableJobTitles(): Array<{ title: string; company: string }> {
  const uniqueJobs = new Map<string, string>()
  PAIR_TEMPLATES.forEach(template => {
    if (!uniqueJobs.has(template.jobTitle)) {
      uniqueJobs.set(template.jobTitle, template.company)
    }
  })
  return Array.from(uniqueJobs.entries()).map(([title, company]) => ({
    title,
    company
  }))
}

// Fonction pour obtenir un template aléatoire pour un titre de job donné
export function getRandomTemplateForJobTitle(jobTitle: string): PairTemplate | null {
  const templatesForJob = PAIR_TEMPLATES.filter(t => t.jobTitle === jobTitle)
  if (templatesForJob.length === 0) return null
  return templatesForJob[Math.floor(Math.random() * templatesForJob.length)]
}
