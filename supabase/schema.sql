-- Extension pour générer des UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table : Sessions de vote (chaque étudiant = 1 session)
CREATE TABLE IF NOT EXISTS voting_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id VARCHAR(255), -- Email ou identifiant anonyme
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  ip_address VARCHAR(45), -- Pour éviter les doublons
  user_agent TEXT
);

-- Table : Paires d'offres générées
CREATE TABLE IF NOT EXISTS job_offer_pairs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES voting_sessions(id) ON DELETE CASCADE,
  
  -- Offre A
  offer_a_text TEXT NOT NULL,
  offer_a_labels JSONB NOT NULL, -- {DIVERSITY: 1, REMUNERATION: 0, ...}
  offer_a_salary_min INTEGER,
  offer_a_salary_max INTEGER,
  
  -- Offre B
  offer_b_text TEXT NOT NULL,
  offer_b_labels JSONB NOT NULL,
  offer_b_salary_min INTEGER,
  offer_b_salary_max INTEGER,
  
  -- Métadonnées
  job_title VARCHAR(255),
  company_name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Table : Votes des étudiants
CREATE TABLE IF NOT EXISTS votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES voting_sessions(id) ON DELETE CASCADE,
  pair_id UUID REFERENCES job_offer_pairs(id) ON DELETE CASCADE,
  
  chosen_offer CHAR(1) NOT NULL CHECK (chosen_offer IN ('A', 'B')),
  choice_reasoning TEXT, -- Optionnel : pourquoi ce choix ?
  
  -- Données démographiques optionnelles
  age_range VARCHAR(20),
  program VARCHAR(100), -- M1, M2, MBA, etc.
  gender VARCHAR(20),
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les requêtes analytiques
CREATE INDEX IF NOT EXISTS idx_votes_pair_id ON votes(pair_id);
CREATE INDEX IF NOT EXISTS idx_votes_session_id ON votes(session_id);
CREATE INDEX IF NOT EXISTS idx_pairs_session_id ON job_offer_pairs(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_completed_at ON voting_sessions(completed_at);

-- RLS (Row Level Security) - Politique pour permettre les lectures publiques
ALTER TABLE voting_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_offer_pairs ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

-- Politique : Tout le monde peut insérer des sessions
CREATE POLICY "Allow insert on voting_sessions" ON voting_sessions
  FOR INSERT WITH CHECK (true);

-- Politique : Tout le monde peut insérer des paires
CREATE POLICY "Allow insert on job_offer_pairs" ON job_offer_pairs
  FOR INSERT WITH CHECK (true);

-- Politique : Tout le monde peut insérer des votes
CREATE POLICY "Allow insert on votes" ON votes
  FOR INSERT WITH CHECK (true);

-- Politique : Lecture publique pour les stats (peut être restreinte plus tard)
CREATE POLICY "Allow select on votes" ON votes
  FOR SELECT USING (true);

CREATE POLICY "Allow select on job_offer_pairs" ON job_offer_pairs
  FOR SELECT USING (true);

CREATE POLICY "Allow select on voting_sessions" ON voting_sessions
  FOR SELECT USING (true);
