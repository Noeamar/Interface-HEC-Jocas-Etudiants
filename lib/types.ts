export interface LabelSet {
  DIVERSITY: number
  REMUNERATION_BENEFITS: number
  PROFESSIONAL_OPPORTUNITIES: number
  CULTURE_VALUES: number
  LEADERSHIP: number
  WORK_LIFE_BALANCE: number
}

export interface JobOfferPair {
  id: string
  session_id: string
  offer_a_text: string
  offer_a_labels: LabelSet
  offer_a_salary_min: number | null
  offer_a_salary_max: number | null
  offer_b_text: string
  offer_b_labels: LabelSet
  offer_b_salary_min: number | null
  offer_b_salary_max: number | null
  job_title: string | null
  company_name: string | null
  created_at: string
}

export interface Vote {
  id: string
  session_id: string
  pair_id: string
  chosen_offer: 'A' | 'B'
  choice_reasoning: string | null
  age_range: string | null
  program: string | null
  gender: string | null
  created_at: string
}

export interface VotingSession {
  id: string
  student_id: string | null
  created_at: string
  completed_at: string | null
  ip_address: string | null
  user_agent: string | null
}
