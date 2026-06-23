import { sql } from "./_db.js";
import { ensureSchema } from "./_auth.js";
import { json, methodNotAllowed } from "./_http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);

  try {
    await ensureSchema();
    const rows = await sql`SELECT now() AS now`;
    return json(res, 200, {
      ok: true,
      database: "connected",
      now: rows[0]?.now || null,
    });
  } catch (error) {
    return json(res, 500, {
      ok: false,
      database: "unavailable",
      message: error.message || "DB 연결을 확인할 수 없습니다.",
    });
  }
}
