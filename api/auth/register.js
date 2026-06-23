import { sql } from "../_db.js";
import { ensureSchema, hashPassword, newUserId, normalizeUsername, validateCredentials, createSession, SESSION_MAX_AGE, publicUser } from "../_auth.js";
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

    const user = { id: newUserId(), username };
    await sql`
      INSERT INTO auth_users (id, username, password_hash)
      VALUES (${user.id}, ${username}, ${hashPassword(password)})
    `;

    const token = await createSession(user.id);
    setSessionCookie(res, token, SESSION_MAX_AGE);
    return json(res, 201, { user: publicUser(user) });
  } catch (error) {
    if (String(error?.message || "").includes("duplicate key")) {
      return json(res, 409, { error: "username_exists", message: "이미 사용 중인 아이디입니다." });
    }
    return json(res, error.statusCode || 500, { error: "register_failed", message: "회원가입에 실패했습니다." });
  }
}
