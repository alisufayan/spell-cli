# spell

`spell` is a tiny local command-line helper that prompt you the correct spelling of the word.

I built it for local use for me instead of going the my browser consitinilty: type a word, get the corrected version, and optionally copy it to your clipboard.

## What it does

- Corrects one word at a time
- Keeps working when the word is already correct
- Can show a short definition with `-d`
- Supports clipboard copy on Linux and macOS
- Lets you save clipboard behavior as a default (`--copy-default on|off`)

## Install

### npm (recommended)

```bash
npm install -g spell-cli
```

Then run:

```bash
spell appertunity
# opportunity
```

### From source 

```bash
git clone https://github.com/alisufayan/spell-cli.git
cd spell
npm install
npm link
```

`npm link` makes `spell` available globally on your machine.

## Usage

```bash
# basic correction
spell appertunity
# opportunity

# already-correct words still work
spell extraordinary
# extraordinary

# definition mode
spell -d extordinary
# extraordinary
# adjective
# 1.
# very unusual or remarkable

# one-time clipboard behavior
spell --copy opportunity
spell --no-copy opportunity

# persistent default clipboard behavior
spell --copy-default on
spell --copy-default off
```

## Notes

- `-d` uses `dictionaryapi.dev` only when definition mode is requested.
- Clipboard commands:
  - macOS: `pbcopy`
  - Linux: `wl-copy`, fallback to `xclip`, fallback to `xsel`

## Roadmap

- Homebrew install support
