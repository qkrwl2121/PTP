#!/usr/bin/env node
/**
 * Cross-platform desktop notification for Codex hook events.
 * Usage: node notify.mjs "Title" "Message"
 * Hook: optional follow-up after token/story checks
 */
import { execFileSync, spawn } from "node:child_process";
import { platform } from "node:os";
import { readFileSync } from "node:fs";

function readHookInput() {
  if (process.argv.length > 2) return null;
  try {
    if (process.stdin.isTTY) return null;
    const raw = readFileSync(0, "utf8");
    if (!raw.trim()) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function notify(title, message) {
  const safeTitle = String(title).slice(0, 120);
  const safeMessage = String(message).slice(0, 240);

  const os = platform();

  try {
    if (os === "darwin") {
      execFileSync(
        "osascript",
        ["-e", `display notification ${JSON.stringify(safeMessage)} with title ${JSON.stringify(safeTitle)}`],
        { stdio: "ignore" },
      );
      return;
    }

    if (os === "win32") {
      const ps = [
        "[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] | Out-Null",
        "[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] | Out-Null",
        `$xml = New-Object Windows.Data.Xml.Dom.XmlDocument`,
        `$xml.LoadXml('<toast><visual><binding template="ToastText"><text id="1">${safeTitle.replace(/[<>&]/g, "")}</text><text id="2">${safeMessage.replace(/[<>&]/g, "")}</text></binding></visual></toast>')`,
        `$toast = [Windows.UI.Notifications.ToastNotification]::new($xml)`,
        `[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("Strength Deck Codex").Show($toast)`,
      ].join("; ");
      spawn("powershell.exe", ["-NoProfile", "-Command", ps], {
        detached: true,
        stdio: "ignore",
      }).unref();
      return;
    }

    // Linux — notify-send if available
    execFileSync("notify-send", [safeTitle, safeMessage], { stdio: "ignore" });
  } catch {
    // Fallback: stderr only
    console.error(`[notify] ${safeTitle}: ${safeMessage}`);
  }
}

function main() {
  const input = readHookInput();
  const title = process.argv[2] || input?.title || "Strength Deck Codex";
  const message =
    process.argv[3] ||
    input?.message ||
    input?.additional_context?.slice(0, 200) ||
    "Hook event completed.";

  notify(title, message);
  console.log(JSON.stringify({}));
}

main();
