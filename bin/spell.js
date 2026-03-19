#!/usr/bin/env node
"use strict";

const { parseArgs, printHelp } = require("../src/args");
const { readConfig } = require("../src/config");
const { loadSpeller, correctWord } = require("../src/speller");
const { copyToClipboard } = require("../src/clipboard");
const { fetchDefinition } = require("../src/dictionary");
const packageJson = require("../package.json");

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
      const { writeConfig } = require("../src/config");
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
