export function json(res, statusCode, body, headers = {}) {
  res.statusCode = statusCode;
  res.setHeader("content-type", "application/json; charset=utf-8");
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  res.end(JSON.stringify(body));
}

export async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Invalid JSON body.");
    error.statusCode = 400;
    throw error;
  }
}

export function parseCookies(header = "") {
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index === -1) return [part, ""];
        return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

export function setSessionCookie(res, token, maxAgeSeconds) {
  const secure = process.env.NODE_ENV === "production" ? " Secure;" : "";
  res.setHeader(
    "set-cookie",
    `sd_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax;${secure} Max-Age=${maxAgeSeconds}`,
  );
}

export function clearSessionCookie(res) {
  res.setHeader("set-cookie", "sd_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}

export function methodNotAllowed(res) {
  json(res, 405, { error: "method_not_allowed" });
}
