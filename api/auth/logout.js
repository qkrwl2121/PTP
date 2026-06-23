import { clearSessionCookie, json, methodNotAllowed } from "../_http.js";
import { deleteSession } from "../_auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return methodNotAllowed(res);

  try {
    await deleteSession(req);
  } finally {
    clearSessionCookie(res);
  }

  return json(res, 200, { ok: true });
}
