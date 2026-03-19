"use strict";

const { spawnSync } = require("child_process");

function copyToClipboard(text) {
  const candidates = [];

  if (process.platform === "darwin") {
    candidates.push({ command: "pbcopy", args: [] });
  } else if (process.platform === "linux") {
    candidates.push(
      { command: "wl-copy", args: [] },
      { command: "xclip", args: ["-selection", "clipboard"] },
      { command: "xsel", args: ["--clipboard", "--input"] }
    );
  } else {
    return {
      ok: false,
      reason: "Clipboard copy is only supported on Linux and macOS."
    };
  }

  for (const candidate of candidates) {
    const result = spawnSync(candidate.command, candidate.args, {
      input: text,
      encoding: "utf8",
      stdio: ["pipe", "ignore", "ignore"],
      timeout: 2000
    });

    if (!result.error && result.status === 0) {
      return { ok: true, command: candidate.command };
    }
  }

  return {
    ok: false,
    reason: "No clipboard command worked (tried wl-copy/xclip/xsel or pbcopy)."
  };
}

module.exports = {
  copyToClipboard
};
