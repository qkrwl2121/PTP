#!/usr/bin/env node
/**
 * Block reads/edits of sensitive files (.env).
 * Hook: beforeReadFile / beforeShellExecution
 */
import { readFileSync } from "node:fs";
import { normalize, relative, resolve } from "node:path";

const PROTECTED_PATTERNS = [
  /^\.env$/i,
  /^\.env\..+$/i,
  /\.env\.local$/i,
  /\.env\.production$/i,
];

function normalizePath(p) {
  return normalize(p).replace(/\\/g, "/");
}

function isProtected(filePath) {
  if (!filePath) return false;
  const base = normalizePath(filePath).split("/").pop() || "";
  return PROTECTED_PATTERNS.some((re) => re.test(base));
}

function readHookInput() {
  if (process.argv.includes("--ci")) return null;
  try {
    if (process.stdin.isTTY) return null;
    const raw = readFileSync(0, "utf8");
    if (!raw.trim()) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function denyResponse(reason) {
  console.log(
    JSON.stringify({
      permission: "deny",
      user_message: reason,
      agent_message: reason,
    }),
  );
  process.exit(0);
}

function allowResponse() {
  console.log(JSON.stringify({ permission: "allow" }));
  process.exit(0);
}

function main() {
  const input = readHookInput();
  if (!input) {
    allowResponse();
    return;
  }

  // beforeReadFile
  if (input.file_path || input.path) {
    const target = input.file_path || input.path;
    const rel = normalizePath(relative(process.cwd(), resolve(target)));
    if (isProtected(rel) || isProtected(target)) {
      denyResponse(
        `.env 파일 읽기가 차단되었습니다. (.codex/settings.json — secrets 보호)`,
      );
      return;
    }
  }

  // beforeShellExecution — block cat/type of .env
  if (input.command) {
    const cmd = input.command;
    if (/\b\.env\b/i.test(cmd) && /(?:cat|type|Get-Content|more|less|head|tail|node\s+-e)/i.test(cmd)) {
      denyResponse(`.env 파일을 shell로 읽는 명령이 차단되었습니다.`);
      return;
    }
  }

  allowResponse();
}

main();
