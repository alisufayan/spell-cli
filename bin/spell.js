#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const nspell = require("nspell");
const packageJson = require("../package.json");

const DEFAULT_CONFIG = { copy: false };

function getConfigDir() {
  if (process.platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "spell");
  }

  const baseDir = process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
  return path.join(baseDir, "spell");
}

function getConfigPath() {
  return path.join(getConfigDir(), "config.json");
}

function readConfig() {
  try {
    const raw = fs.readFileSync(getConfigPath(), "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_CONFIG,
      ...parsed
    };
  } catch (error) {
    if (error.code !== "ENOENT") {
      console.error("Warning: config is invalid, using defaults.");
    }
    return { ...DEFAULT_CONFIG };
  }
}

function writeConfig(config) {
  fs.mkdirSync(getConfigDir(), { recursive: true });
  fs.writeFileSync(
    getConfigPath(),
    `${JSON.stringify({ copy: Boolean(config.copy) }, null, 2)}\n`,
    "utf8"
  );
}

function printHelp() {
  console.log(`spell - tiny local spelling helper

Usage:
  spell <word>
  spell -d <word>
  spell -c <word>
  spell --no-copy <word>
  spell --copy-default on
  spell --copy-default off

Options:
  -d, --define       Show part of speech and first definition
  -c, --copy         Copy corrected word to clipboard for this run
      --no-copy      Disable clipboard copy for this run
      --copy-default Set persistent clipboard default (on/off)
  -h, --help         Show help
  -v, --version      Show version`);
}

function parseArgs(args) {
  if (args.length === 0) {
    return { action: "help", exitCode: 1 };
  }

  if (args.length === 1 && (args[0] === "-h" || args[0] === "--help")) {
    return { action: "help", exitCode: 0 };
  }

  if (args.length === 1 && (args[0] === "-v" || args[0] === "--version")) {
    return { action: "version" };
  }

  if (args[0] === "--copy-default") {
    if (args.length !== 2 || (args[1] !== "on" && args[1] !== "off")) {
      throw new Error("Usage: spell --copy-default on|off");
    }

    return { action: "set-copy-default", value: args[1] };
  }

  let define = false;
  let copyOverride;
  let word;

  for (const arg of args) {
    if (arg === "-d" || arg === "--define") {
      define = true;
      continue;
    }

    if (arg === "-c" || arg === "--copy") {
      copyOverride = true;
      continue;
    }

    if (arg === "--no-copy") {
      copyOverride = false;
      continue;
    }

    if (arg === "-h" || arg === "--help") {
      return { action: "help", exitCode: 0 };
    }

    if (arg === "-v" || arg === "--version") {
      return { action: "version" };
    }

    if (arg.startsWith("-")) {
      throw new Error(`Unknown option: ${arg}`);
    }

    if (!word) {
      word = arg;
      continue;
    }

    throw new Error("Please provide only one word at a time.");
  }

  if (!word) {
    throw new Error("Usage: spell <word>");
  }

  return {
    action: "lookup",
    word,
    define,
    copyOverride
  };
}

function parseWordList(dicBuffer) {
  const text = Buffer.from(dicBuffer).toString("utf8");
  const lines = text.split(/\r?\n/);
  const words = new Set();

  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const slashIndex = line.indexOf("/");
    const word = slashIndex >= 0 ? line.slice(0, slashIndex) : line;
    if (word) {
      words.add(word);
    }
  }

  return Array.from(words);
}

function levenshteinDistance(a, b, maxDistance) {
  if (Math.abs(a.length - b.length) > maxDistance) {
    return maxDistance + 1;
  }

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    let smallest = current[0];

    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const value = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + cost
      );
      current[j] = value;
      if (value < smallest) {
        smallest = value;
      }
    }

    if (smallest > maxDistance) {
      return maxDistance + 1;
    }

    previous = current;
  }

  return previous[b.length];
}

function findClosestWord(input, words) {
  const lowerInput = input.toLowerCase();
  const minLength = Math.max(1, lowerInput.length - 2);
  const maxLength = lowerInput.length + 2;
  const maxDistance = 2;

  let bestWord = null;
  let bestDistance = maxDistance + 1;

  for (const candidate of words) {
    const lowerCandidate = candidate.toLowerCase();
    if (lowerCandidate.length < minLength || lowerCandidate.length > maxLength) {
      continue;
    }

    const distance = levenshteinDistance(lowerInput, lowerCandidate, maxDistance);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestWord = candidate;
      if (distance === 1) {
        break;
      }
    }
  }

  return bestWord;
}

async function loadSpeller() {
  const module = await import("dictionary-en");
  const dictionary = module.default;
  return {
    speller: nspell(dictionary),
    words: parseWordList(dictionary.dic)
  };
}

function preserveCase(source, target) {
  if (source.toUpperCase() === source) {
    return target.toUpperCase();
  }

  const firstChar = source.charAt(0);
  const rest = source.slice(1);
  if (firstChar === firstChar.toUpperCase() && rest === rest.toLowerCase()) {
    return `${target.charAt(0).toUpperCase()}${target.slice(1)}`;
  }

  return target;
}

function correctWord(speller, words, word) {
  const input = word.trim();
  if (speller.correct(input)) {
    return input;
  }

  const suggestions = speller.suggest(input);
  if (suggestions.length === 0) {
    const fallback = findClosestWord(input, words);
    if (!fallback) {
      return input;
    }
    return preserveCase(input, fallback);
  }

  return preserveCase(input, suggestions[0]);
}

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

async function fetchDefinition(word) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      return null;
    }

    const entries = await response.json();
    if (!Array.isArray(entries)) {
      return null;
    }

    for (const entry of entries) {
      if (!entry || !Array.isArray(entry.meanings)) {
        continue;
      }

      for (const meaning of entry.meanings) {
        if (!meaning || !Array.isArray(meaning.definitions) || meaning.definitions.length === 0) {
          continue;
        }

        const first = meaning.definitions[0];
        if (!first || typeof first.definition !== "string") {
          continue;
        }

        return {
          partOfSpeech: meaning.partOfSpeech || "unknown",
          definition: first.definition.trim()
        };
      }
    }
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }

  return null;
}

async function main() {
  try {
    const parsed = parseArgs(process.argv.slice(2));

    if (parsed.action === "help") {
      printHelp();
      process.exit(parsed.exitCode);
    }

    if (parsed.action === "version") {
      console.log(packageJson.version);
      return;
    }

    if (parsed.action === "set-copy-default") {
      const current = readConfig();
      current.copy = parsed.value === "on";
      writeConfig(current);
      console.log(`Default clipboard copy is ${parsed.value}.`);
      return;
    }

    const loaded = await loadSpeller();
    const corrected = correctWord(loaded.speller, loaded.words, parsed.word);
    console.log(corrected);

    const config = readConfig();
    const shouldCopy = parsed.copyOverride !== undefined ? parsed.copyOverride : Boolean(config.copy);
    if (shouldCopy) {
      const copied = copyToClipboard(corrected);
      if (!copied.ok) {
        console.error(`Warning: ${copied.reason}`);
      }
    }

    if (parsed.define) {
      const definition = await fetchDefinition(corrected);
      if (!definition) {
        console.error("Definition not found.");
        return;
      }

      console.log(definition.partOfSpeech);
      console.log("1.");
      console.log(definition.definition);
    }
  } catch (error) {
    console.error(error.message || String(error));
    process.exitCode = 1;
  }
}

main();
