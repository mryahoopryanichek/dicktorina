-- Записавшиеся. Один человек — одна строка; source — площадка первого /start
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,         -- id в Telegram
  username TEXT,
  first_name TEXT,
  last_name TEXT,
  lang TEXT,
  source TEXT,                    -- tt, ig, yt, fr (по ссылке друга), site…
  created_at TEXT NOT NULL,       -- UTC, ISO
  last_seen TEXT NOT NULL,
  blocked INTEGER NOT NULL DEFAULT 0  -- 1 — человек заблокировал бота, рассылка не дойдёт
);
CREATE INDEX IF NOT EXISTS users_source ON users (source);
CREATE INDEX IF NOT EXISTS users_created ON users (created_at);
