#!/usr/bin/env node
/**
 * Warn when a component .tsx is saved without a matching .stories.tsx.
 * Hook: afterFileEdit on component TSX writes.
 */
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";

function normalizePath(p) {
  return p.replace(/\\/g, "/");
}

function isComponentTsx(filePath) {
  const rel = normalizePath(relative(process.cwd(), filePath));
  if (!rel.startsWith("src/components/")) return false;
  if (!rel.endsWith(".tsx")) return false;
  if (rel.endsWith(".stories.tsx")) return false;
  if (rel.endsWith(".types.tsx")) return false;
  return true;
}

function storyPathFor(componentPath) {
  const dir = dirname(componentPath);
  const name = basename(componentPath, ".tsx");
  return join(dir, `${name}.stories.tsx`);
}

function readHookInput() {
  if (process.argv.includes("--ci") || process.argv.length > 2) return null;
  try {
    if (process.stdin.isTTY) return null;
    const raw = readFileSync(0, "utf8");
    if (!raw.trim()) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function check(filePath) {
  const abs = resolve(filePath);
  if (!isComponentTsx(abs)) return null;

  const story = storyPathFor(abs);
  if (existsSync(story)) return null;

  const rel = normalizePath(relative(process.cwd(), abs));
  const storyRel = normalizePath(relative(process.cwd(), story));
  return { component: rel, expectedStory: storyRel };
}

function main() {
  const hookInput = readHookInput();
  const cliFiles = process.argv.slice(2).map((f) => resolve(f));
  const files = hookInput?.file_path
    ? [resolve(hookInput.file_path)]
    : cliFiles.length
      ? cliFiles
      : [];

  const missing = files.map(check).filter(Boolean);

  if (process.stdin.isTTY || process.argv.includes("--ci")) {
    if (missing.length === 0) {
      console.log("✓ All components have Storybook files.");
      process.exit(0);
    }
    console.error("✗ Missing Storybook files:\n");
    for (const m of missing) {
      console.error(`  ${m.component} → expected ${m.expectedStory}`);
    }
    process.exit(1);
  }

  if (missing.length === 0) {
    console.log(JSON.stringify({}));
    process.exit(0);
  }

  const message = missing
    .map((m) => `${m.component} has no ${m.expectedStory}`)
    .join("\n");

  console.log(
    JSON.stringify({
      additional_context: `⚠️ Storybook missing (1 component = 4 files rule):\n${message}`,
    }),
  );
  process.exit(0);
}

main();
