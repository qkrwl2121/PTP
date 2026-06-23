import { sql } from "../_db.js";
import { ensureSchema, normalizeUsername, validateCredentials, verifyPassword, createSession, SESSION_MAX_AGE, publicUser } from "../_auth.js";
import { json, methodNotAllowed, readJson, setSessionCookie } from "../_http.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    await ensureSchema();
    const body = await readJson(req);
    const username = normalizeUsername(body.username);
    const password = String(body.password || "");
    const validation = validateCredentials(username, password);
    if (validation) return json(res, 400, { error: "invalid_credentials", message: validation });

    const rows = await sql`SELECT id, username, email, password_hash FROM auth_users WHERE username = ${username} LIMIT 1`;
    const user = rows[0];
    if (!user || !verifyPassword(password, user.password_hash)) {
      return json(res, 401, { error: "login_failed", message: "아이디 또는 비밀번호가 맞지 않습니다." });
    }

    const token = await createSession(user.id);
    setSessionCookie(res, token, SESSION_MAX_AGE);
    return json(res, 200, { user: publicUser(user) });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: "login_failed", message: "로그인에 실패했습니다." });
  }
}
