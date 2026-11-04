import { DEFAULT_CHARACTER } from "../utils/dnd";
import type { CharacterData } from "../utils/dnd";
import { DEFAULT_CAMPAIGN } from "../services/campaigns";
import type { Campaign, CampaignMember } from "../services/campaigns";
import type { StoredCharacter } from "../services/characters";

export const makeCharacter = (
  overrides: Partial<CharacterData> = {}
): CharacterData => ({
  ...DEFAULT_CHARACTER,
  characterName: "Thalia",
  class: "Rogue",
  race: "Half-Elf",
  level: 3,
  ...overrides,
});

export const storedCharacter = (
  overrides: Partial<CharacterData> = {},
  { id = "char-1", userId = "user-1" } = {}
): StoredCharacter => ({ id, userId, character: makeCharacter(overrides) });

export const makeCampaign = (overrides: Partial<Campaign> = {}): Campaign => ({
  ...DEFAULT_CAMPAIGN,
  id: "camp-1",
  userId: "user-1",
  campaignName: "Curse of Strahd",
  dungeonMaster: "Josh",
  ...overrides,
});

export const makePlayer = (
  overrides: Partial<CampaignMember> = {}
): CampaignMember => ({
  userId: "user-2",
  role: "player",
  characterId: "char-2",
  characterName: "Vex",
  playerName: "Sam",
  ...overrides,
});

/** A Firestore-style permission error. */
export const permissionDenied = () =>
  Object.assign(new Error("Missing or insufficient permissions."), {
    code: "permission-denied",
  });
