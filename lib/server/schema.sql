CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS cases (
    id text PRIMARY KEY,
    title text NOT NULL,
    product_type text NOT NULL,
    method_tags text[] NOT NULL DEFAULT '{}',
    summary text NOT NULL,
    source_name text NOT NULL,
    source_url text NOT NULL,
    source_date date NOT NULL,
    source_city text NOT NULL CHECK (btrim(source_city) <> ''),
    included boolean NOT NULL DEFAULT false,
    embedding vector(1536),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cases ADD COLUMN IF NOT EXISTS card_summary text;

CREATE TABLE IF NOT EXISTS suspicious_accounts (
    id text PRIMARY KEY,
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE suspicious_accounts
    ADD COLUMN IF NOT EXISTS case_status text,
    ADD COLUMN IF NOT EXISTS lookup_count integer CHECK (lookup_count >= 0),
    ADD COLUMN IF NOT EXISTS source_url text;

CREATE TABLE IF NOT EXISTS widget_submissions (
    session_id text NOT NULL,
    submission_id text NOT NULL,
    script_version text NOT NULL,
    request jsonb NOT NULL,
    response jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    started_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (session_id, submission_id)
);

CREATE INDEX IF NOT EXISTS widget_submissions_created_at_idx
    ON widget_submissions (created_at DESC);

CREATE TABLE IF NOT EXISTS homepage_cards (
    script_version text PRIMARY KEY,
    cards jsonb NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);
