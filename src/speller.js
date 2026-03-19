"use strict";

const nspell = require("nspell");

async function loadSpeller() {
  const module = await import("dictionary-en");
  const dictionary = module.default;
  return {
    speller: nspell(dictionary),
    words: parseWordList(dictionary.dic)
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

module.exports = {
  loadSpeller,
  correctWord
};
