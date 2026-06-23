import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { createHash, randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";

const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const root = process.cwd();
const dataFile = join(root, ".local-server-data.json");
const sessionMaxAge = 30 * 24 * 60 * 60;
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
};

createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  if (url.pathname.startsWith("/api/")) {
    await handleApi(request, response, url.pathname);
    return;
  }

  const urlPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const safePath = normalize(urlPath === "/" ? "/index.html" : urlPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(root, safePath);

  try {
    const data = await readFile(filePath);
    response.writeHead(200, { "Content-Type": types[extname(filePath)] || "application/octet-stream" });
    response.end(data);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("not found");
  }
}).listen(port, host, () => {
  console.log(`Strength Deck running at http://${host}:${port}/`);
});

async function handleApi(request, response, pathname) {
  try {
    if (pathname === "/api/auth/register" && request.method === "POST") return register(request, response);
    if (pathname === "/api/auth/login" && request.method === "POST") return login(request, response);
    if (pathname === "/api/auth/logout" && request.method === "POST") return logout(request, response);
    if (pathname === "/api/auth/me" && request.method === "GET") return me(request, response);
    if (pathname === "/api/state" && request.method === "GET") return getState(request, response);
    if (pathname === "/api/state" && request.method === "PUT") return putState(request, response);
    return json(response, 405, { error: "method_not_allowed" });
  } catch (error) {
    return json(response, error.statusCode || 500, { error: "server_error", message: error.message || "서버 처리에 실패했습니다." });
  }
}

async function register(request, response) {
  const body = await readJson(request);
  const username = normalizeUsername(body.username);
  const password = String(body.password || "");
  const validation = validateCredentials(username, password);
  if (validation) return json(response, 400, { error: "invalid_credentials", message: validation });

  const db = await readDb();
  if (db.users.some((user) => user.username === username)) {
    return json(response, 409, { error: "username_exists", message: "이미 사용 중인 아이디입니다." });
  }

  const user = {
    id: `account-${randomUUID()}`,
    username,
    passwordHash: hashPassword(password),
    createdAt: new Date().toISOString(),
  };
  db.users.push(user);
  const token = createSession(db, user.id);
  await writeDb(db);
  setSessionCookie(response, token);
  return json(response, 201, { user: publicUser(user) });
}

async function login(request, response) {
  const body = await readJson(request);
  const username = normalizeUsername(body.username);
  const password = String(body.password || "");
  const validation = validateCredentials(username, password);
  if (validation) return json(response, 400, { error: "invalid_credentials", message: validation });

  const db = await readDb();
  const user = db.users.find((entry) => entry.username === username);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return json(response, 401, { error: "login_failed", message: "아이디 또는 비밀번호가 맞지 않습니다." });
  }

  const token = createSession(db, user.id);
  await writeDb(db);
  setSessionCookie(response, token);
  return json(response, 200, { user: publicUser(user) });
}

async function logout(request, response) {
  const token = parseCookies(request.headers.cookie || "").sd_session;
  if (token) {
    const db = await readDb();
    db.sessions = db.sessions.filter((session) => session.tokenHash !== hashToken(token));
    await writeDb(db);
  }
  response.setHeader("set-cookie", "sd_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  return json(response, 200, { ok: true });
}

async function me(request, response) {
  const { user } = await getSessionUser(request);
  return json(response, 200, { user: publicUser(user) });
}

async function getState(request, response) {
  const { db, user } = await getSessionUser(request);
  if (!user) return json(response, 401, { error: "unauthorized", message: "로그인이 필요합니다." });
  const item = db.states[user.id];
  return json(response, 200, { state: item?.state || null, updatedAt: item?.updatedAt || null });
}

async function putState(request, response) {
  const session = await getSessionUser(request);
  if (!session.user) return json(response, 401, { error: "unauthorized", message: "로그인이 필요합니다." });

  const body = await readJson(request);
  if (!body.state || !Array.isArray(body.state.users)) {
    return json(response, 400, { error: "invalid_state", message: "저장할 앱 상태가 올바르지 않습니다." });
  }

  session.db.states[session.user.id] = {
    state: body.state,
    updatedAt: new Date().toISOString(),
  };
  await writeDb(session.db);
  return json(response, 200, { ok: true, updatedAt: session.db.states[session.user.id].updatedAt });
}

async function getSessionUser(request) {
  const db = await readDb();
  const token = parseCookies(request.headers.cookie || "").sd_session;
  if (!token) return { db, user: null };

  const now = Date.now();
  const tokenHash = hashToken(token);
  db.sessions = db.sessions.filter((session) => new Date(session.expiresAt).getTime() > now);
  const session = db.sessions.find((entry) => entry.tokenHash === tokenHash);
  const user = session ? db.users.find((entry) => entry.id === session.userId) : null;
  if (!session || !user) await writeDb(db);
  return { db, user: user || null };
}

function createSession(db, userId) {
  const token = randomBytes(32).toString("base64url");
  db.sessions.push({
    tokenHash: hashToken(token),
    userId,
    expiresAt: new Date(Date.now() + sessionMaxAge * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  });
  return token;
}

async function readDb() {
  try {
    const raw = JSON.parse(await readFile(dataFile, "utf8"));
    return {
      users: Array.isArray(raw.users) ? raw.users : [],
      sessions: Array.isArray(raw.sessions) ? raw.sessions : [],
      states: raw.states && typeof raw.states === "object" ? raw.states : {},
    };
  } catch {
    return { users: [], sessions: [], states: {} };
  }
}

async function writeDb(db) {
  await writeFile(dataFile, JSON.stringify(db, null, 2));
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("Invalid JSON body.");
    error.statusCode = 400;
    throw error;
  }
}

function json(response, statusCode, body) {
  response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
}

function setSessionCookie(response, token) {
  response.setHeader("set-cookie", `sd_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${sessionMaxAge}`);
}

function parseCookies(header = "") {
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

function normalizeUsername(username) {
  return String(username || "").trim().toLowerCase();
}

function validateCredentials(username, password) {
  if (!/^[a-z0-9][a-z0-9_-]{2,23}$/.test(username)) return "아이디는 영문, 숫자, 밑줄, 하이픈으로 3~24자 입력해 주세요.";
  if (String(password || "").length < 8) return "비밀번호는 8자 이상이어야 합니다.";
  return "";
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const actual = Buffer.from(scryptSync(password, salt, 64).toString("hex"), "hex");
  const expected = Buffer.from(hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function publicUser(user) {
  return user ? { id: user.id, username: user.username } : null;
}
