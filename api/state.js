import { sql } from "./_db.js";
import { getSessionUser } from "./_auth.js";
import { json, methodNotAllowed, readJson } from "./_http.js";

export default async function handler(req, res) {
  const user = await getSessionUser(req);
  if (!user) return json(res, 401, { error: "unauthorized", message: "로그인이 필요합니다." });

  if (req.method === "GET") {
    const rows = await sql`SELECT state, updated_at FROM app_states WHERE user_id = ${user.id} LIMIT 1`;
    const row = rows[0];
    return json(res, 200, { state: row?.state || null, updatedAt: row?.updated_at || null });
  }

  if (req.method === "PUT") {
    const body = await readJson(req);
    if (!body.state || !Array.isArray(body.state.users)) {
      return json(res, 400, { error: "invalid_state", message: "저장할 앱 상태가 올바르지 않습니다." });
    }

    await sql`
      INSERT INTO app_states (user_id, state, updated_at)
      VALUES (${user.id}, ${JSON.stringify(body.state)}::jsonb, now())
      ON CONFLICT (user_id)
      DO UPDATE SET state = EXCLUDED.state, updated_at = now()
    `;
    return json(res, 200, { ok: true });
  }

  return methodNotAllowed(res);
}
