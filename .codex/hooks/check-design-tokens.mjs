#!/usr/bin/env node
/**
 * Detect hardcoded colors in design-system source files.
 * Usage: node check-design-tokens.mjs [file...]
 * Hook: reads JSON from stdin (afterFileEdit), checks edited files.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { relative, resolve, join } from "node:path";

const TOKEN_FILES = new Set([
  "src/styles/tokens.css",
  "src/styles/theme.css",
]);

const COLOR_PATTERNS = [
  /#[0-9a-fA-F]{3,8}\b/g,
  /\brgba?\(\s*\d+/g,
  /\bhsla?\(\s*\d+/g,
];

const SCAN_DIRS = ["src/components", "src/styles"];

function normalizePath(p) {
  return p.replace(/\\/g, "/");
}

function isTokenDefinitionFile(filePath) {
  const rel = normalizePath(relative(process.cwd(), filePath));
  return TOKEN_FILES.has(rel);
}

function isScannableFile(filePath) {
  const rel = normalizePath(relative(process.cwd(), filePath));
  if (!/\.(tsx?|css)$/.test(rel)) return false;
  if (isTokenDefinitionFile(rel)) return false;
  if (rel.includes(".stories.")) return false;
  return SCAN_DIRS.some((d) => rel.startsWith(d));
}

function scanContent(content, filePath) {
  const violations = [];
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    if (line.trim().startsWith("//") || line.trim().startsWith("*")) return;
    for (const pattern of COLOR_PATTERNS) {
      pattern.lastIndex = 0;
      const matches = line.match(pattern);
      if (matches) {
        violations.push({
          file: normalizePath(relative(process.cwd(), filePath)),
          line: index + 1,
          match: matches[0],
          snippet: line.trim().slice(0, 120),
        });
      }
    }
  });

  return violations;
}

function collectFiles(target) {
  const abs = resolve(target);
  if (!existsSync(abs)) return [];
  if (statSync(abs).isFile()) return [abs];
  const out = [];
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const full = join(abs, entry.name);
    if (entry.isDirectory()) out.push(...collectFiles(full));
    else out.push(full);
  }
  return out;
}

function scanFile(filePath) {
  if (!existsSync(filePath) || !isScannableFile(filePath)) return [];
  return scanContent(readFileSync(filePath, "utf8"), filePath);
}

function readHookInput() {
  if (process.argv.includes("--ci") || process.argv.length > 2) return null;
  try {
    if (process.stdin.isTTY) return null;
    // Non-blocking: only parse stdin when Cursor hook pipes JSON
    const raw = readFileSync(0, "utf8");
    if (!raw.trim()) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function main() {
  const hookInput = readHookInput();
  let files = process.argv.slice(2).filter((a) => a !== "--ci");
  files = files.flatMap((f) => collectFiles(f));

  if (files.length === 0 && !hookInput) {
    files = collectFiles("src/components");
  }

  if (hookInput?.file_path) {
    files = [resolve(hookInput.file_path)];
  } else if (hookInput?.files) {
    files = hookInput.files.map((f) => resolve(f));
  }

  const allViolations = files.flatMap(scanFile);

  if (process.stdin.isTTY || process.argv.includes("--ci")) {
    if (allViolations.length === 0) {
      console.log("✓ No hardcoded color tokens detected.");
      process.exit(0);
    }
    console.error("✗ Hardcoded colors detected:\n");
    for (const v of allViolations) {
      console.error(`  ${v.file}:${v.line} — ${v.match}`);
      console.error(`    ${v.snippet}\n`);
    }
    process.exit(1);
  }

  // Cursor hook response
  if (allViolations.length === 0) {
    console.log(JSON.stringify({}));
    process.exit(0);
  }

  const message = allViolations
    .slice(0, 5)
    .map((v) => `${v.file}:${v.line} — use var(--color-*) instead of ${v.match}`)
    .join("\n");

  console.log(
    JSON.stringify({
      additional_context: `⚠️ Design token violation: hardcoded color detected.\n${message}\nSee CODEX.md and src/styles/tokens.css.`,
    }),
  );
  process.exit(0);
}

main();
