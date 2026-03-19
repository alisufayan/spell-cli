"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

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
    return { ...DEFAULT_CONFIG, ...parsed };
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

module.exports = {
  readConfig,
  writeConfig
};
