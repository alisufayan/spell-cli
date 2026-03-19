"use strict";

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

        const defs = meaning.definitions;
        const selected = defs.length > 1 ? [defs[0], defs[1]] : [defs[0]];
        const valid = selected.filter(d => d && typeof d.definition === "string");
        if (valid.length === 0) {
          continue;
        }

        return {
          partOfSpeech: meaning.partOfSpeech || "unknown",
          definitions: valid.map(d => d.definition.trim())
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

module.exports = {
  fetchDefinition
};
