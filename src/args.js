"use strict";

const HELP_TEXT = `spell - tiny local spelling helper

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
  -v, --version      Show version`;

function printHelp() {
  console.log(HELP_TEXT);
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

module.exports = {
  printHelp,
  parseArgs
};
