CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_email VARCHAR(255) NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  selected_calendar_ids JSONB DEFAULT '[]',
  family_calendar_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

GRANT ALL PRIVILEGES ON TABLE google_calendar_connections TO familyhub;
GRANT USAGE, SELECT ON SEQUENCE google_calendar_connections_id_seq TO familyhub;
