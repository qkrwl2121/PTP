import { getSessionUser, publicUser } from "../_auth.js";
import { json, methodNotAllowed } from "../_http.js";

export default async function handler(req, res) {
  if (req.method !== "GET") return methodNotAllowed(res);

  try {
    const user = await getSessionUser(req);
    return json(res, 200, { user: publicUser(user) });
  } catch {
    return json(res, 200, { user: null });
  }
}
