import { randomBytes, scryptSync, timingSafeEqual, createHash, randomUUID } from "node:crypto";
import { sql } from "./_db.js";
import { parseCookies } from "./_http.js";

const SESSION_DAYS = 30;
const SESSION_MAX_AGE = SESSION_DAYS * 24 * 60 * 60;

export { SESSION_MAX_AGE };

export async function ensureSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS auth_users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`ALTER TABLE auth_users ADD COLUMN IF NOT EXISTS username TEXT`;
  await sql`ALTER TABLE auth_users ALTER COLUMN email DROP NOT NULL`;
  await sql`UPDATE auth_users SET username = email WHERE username IS NULL`;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS auth_users_username_unique ON auth_users (username)`;

  await sql`
    CREATE TABLE IF NOT EXISTS auth_sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES auth_users(id) ON DELETE CASCADE,
      expires_at TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS app_states (
      user_id TEXT PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
      state JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `;
}

export function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

export function validateCredentials(username, password) {
  if (!/^[a-z0-9][a-z0-9_-]{2,23}$/.test(username)) return "아이디는 영문, 숫자, 밑줄, 하이픈으로 3~24자 입력해 주세요.";
  if (String(password || "").length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  return "";
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const actual = Buffer.from(scryptSync(password, salt, 64).toString("hex"), "hex");
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);
  await sql`
    INSERT INTO auth_sessions (token_hash, user_id, expires_at)
    VALUES (${hashToken(token)}, ${userId}, ${expiresAt.toISOString()})
  `;
  return token;
}

export async function getSessionUser(req) {
  await ensureSchema();
  const token = parseCookies(req.headers.cookie || "").sd_session;
  if (!token) return null;

  const rows = await sql`
    SELECT u.id, u.username, u.email
    FROM auth_sessions s
    JOIN auth_users u ON u.id = s.user_id
    WHERE s.token_hash = ${hashToken(token)}
      AND s.expires_at > now()
    LIMIT 1
  `;

  return rows[0] || null;
}

export async function deleteSession(req) {
  const token = parseCookies(req.headers.cookie || "").sd_session;
  if (!token) return;
  await ensureSchema();
  await sql`DELETE FROM auth_sessions WHERE token_hash = ${hashToken(token)}`;
}

export function publicUser(user) {
  return user ? { id: user.id, username: user.username || user.email } : null;
}

export function newUserId() {
  return `account-${randomUUID()}`;
}
