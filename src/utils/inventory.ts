import { ABILITIES, calculateModifier, formatModifier } from "./dnd";
import type { AbilityAbbrev, CharacterData } from "./dnd";

export interface Equipment {
  index: string;
  name: string;
  category: string;
  cost?: string;
  weight?: number;
  description?: string;
  weapon?: {
    category: string;
    range: "Melee" | "Ranged";
    damage: string;
    damageType?: string;
    properties: string[];
    twoHandedDamage?: string;
    normalRange?: number;
    longRange?: number;
  };
  armor?: {
    category: string;
    baseAC: number;
    dexBonus: boolean;
    maxDexBonus: number | null;
    strMinimum: number;
    stealthDisadvantage: boolean;
  };
}

export interface InventoryItem {
  name: string;
  quantity: number;
  /** SRD equipment index; absent for custom items. */
  srdIndex?: string;
}

export interface Attack {
  name: string;
  ability: AbilityAbbrev;
  proficient: boolean;
  /** e.g. "1d8" or "2d6". */
  damageDice: string;
  damageType: string;
  /** Magic weapon bonus, e.g. +1, added to hit and damage. */
  magicBonus: number;
}

export interface Currency {
  cp: number;
  sp: number;
  ep: number;
  gp: number;
  pp: number;
}

export const NO_CURRENCY: Currency = { cp: 0, sp: 0, ep: 0, gp: 0, pp: 0 };

export const COINS: Array<{ key: keyof Currency; label: string }> = [
  { key: "cp", label: "Copper (CP)" },
  { key: "sp", label: "Silver (SP)" },
  { key: "ep", label: "Electrum (EP)" },
  { key: "gp", label: "Gold (GP)" },
  { key: "pp", label: "Platinum (PP)" },
];

const abilityModifier = (c: CharacterData, abbrev: AbilityAbbrev) =>
  calculateModifier(c[ABILITIES.find((a) => a.abbrev === abbrev)!.key]);

export const attackBonus = (c: CharacterData, attack: Attack) =>
  abilityModifier(c, attack.ability) +
  (attack.proficient ? c.proficiencyBonus : 0) +
  attack.magicBonus;

/** Dice expression for the damage roll, e.g. "1d8+3". */
export const damageExpression = (c: CharacterData, attack: Attack) => {
  const bonus = abilityModifier(c, attack.ability) + attack.magicBonus;
  return `${attack.damageDice}${bonus === 0 ? "" : formatModifier(bonus)}`;
};

/**
 * An attack for an SRD weapon: ranged weapons use DEX, finesse weapons use
 * the better of STR and DEX, everything else uses STR.
 */
export const attackFromWeapon = (c: CharacterData, item: Equipment): Attack => {
  const weapon = item.weapon!;
  let ability: AbilityAbbrev = "STR";
  if (weapon.range === "Ranged") ability = "DEX";
  else if (weapon.properties.includes("Finesse") && c.dexterity > c.strength) {
    ability = "DEX";
  }
  return {
    name: item.name,
    ability,
    proficient: true,
    damageDice: weapon.damage,
    damageType: weapon.damageType ?? "",
    magicBonus: 0,
  };
};

/** Inventory as text, for the PDF's Equipment box. */
export const inventoryText = (c: CharacterData) =>
  [
    ...c.inventory.map((item) =>
      item.quantity === 1 ? item.name : `${item.name} ×${item.quantity}`
    ),
    c.equipment,
  ]
    .filter(Boolean)
    .join("\n");

let equipmentPromise: Promise<Equipment[]> | null = null;

/** The SRD equipment list, loaded on first use. */
export const loadSrdEquipment = (): Promise<Equipment[]> => {
  equipmentPromise ??= import("../data/srd/equipment.json").then(
    (module) => module.default as Equipment[]
  );
  return equipmentPromise;
};
