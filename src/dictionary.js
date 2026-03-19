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

module.exports = {
  fetchDefinition
};
