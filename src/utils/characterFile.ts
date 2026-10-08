// Character backups as JSON files.
import { DEFAULT_CHARACTER } from "./dnd";
import type { CharacterData } from "./dnd";

const FORMAT = "dnd-character";
const VERSION = 1;

// Fields the security rules limit to 100 characters
const SHORT_TEXT = [
  "characterName",
  "playerName",
  "class",
  "race",
  "background",
  "alignment",
] as const;

/** JSON for a character, without anything tied to this account. */
export const toCharacterFile = (character: CharacterData): string =>
  JSON.stringify(
    {
      format: FORMAT,
      version: VERSION,
      character: { ...character, campaignIds: [] },
    },
    null,
    2
  );

const sameType = (value: unknown, example: unknown) =>
  Array.isArray(example)
    ? Array.isArray(value)
    : typeof value === typeof example && value !== null;

/**
 * Read a character file. Fields with the wrong type fall back to defaults,
 * and values are trimmed to what the app and security rules accept, so a
 * hand-edited file can't create a broken character.
 */
export const parseCharacterFile = (text: string): CharacterData => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  const file = parsed as { format?: unknown; character?: unknown };
  if (
    !file ||
    file.format !== FORMAT ||
    typeof file.character !== "object" ||
    file.character === null
  ) {
    throw new Error("That doesn't look like a character file from this app.");
  }

  const raw = file.character as Record<string, unknown>;
  const character = { ...DEFAULT_CHARACTER };
  for (const key of Object.keys(DEFAULT_CHARACTER) as (keyof CharacterData)[]) {
    if (sameType(raw[key], DEFAULT_CHARACTER[key])) {
      (character as Record<string, unknown>)[key] = raw[key];
    }
  }

  for (const key of SHORT_TEXT) character[key] = character[key].slice(0, 100);
  character.level = Math.min(20, Math.max(1, Math.round(character.level)));
  character.knownSpells = character.knownSpells.slice(0, 200);
  character.inventory = character.inventory.slice(0, 300);
  character.attacks = character.attacks.slice(0, 50);
  character.campaignIds = [];

  if (!character.characterName.trim()) {
    throw new Error("The character in that file has no name.");
  }
  return character;
};
