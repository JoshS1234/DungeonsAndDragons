// Snapshots the D&D 5e SRD (2014) spells, equipment, monsters and class tables from the free
// dnd5eapi.co API into src/data/srd/. Run with: node scripts/fetch-srd.mjs
//
// The SRD is published by Wizards of the Coast under CC-BY-4.0; see
// src/data/srd/LICENSE.md.
import { mkdir, writeFile } from "node:fs/promises";

const API = "https://www.dnd5eapi.co";
const OUT = new URL("../src/data/srd/", import.meta.url);

const get = async (path) => {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(API + path);
    if (response.ok) return response.json();
    if (response.status === 404) return null;
    if (attempt === 3) throw new Error(`${path}: ${response.status}`);
    await new Promise((r) => setTimeout(r, 1000 * attempt));
  }
};

/** Run `fn` over `items`, a few at a time, to be polite to the API. */
const mapLimit = async (items, limit, fn) => {
  const results = [];
  for (let i = 0; i < items.length; i += limit) {
    results.push(...(await Promise.all(items.slice(i, i + limit).map(fn))));
  }
  return results;
};

const componentsText = (spell) =>
  spell.components
    .map((c) => (c === "M" && spell.material ? `M (${spell.material})` : c))
    .join(", ");

const simplifySpell = (spell) => ({
  index: spell.index,
  name: spell.name,
  level: spell.level,
  school: spell.school.name,
  castingTime: spell.casting_time,
  range: spell.range,
  components: componentsText(spell),
  duration: spell.duration,
  concentration: spell.concentration,
  ritual: spell.ritual,
  description: spell.desc.join("\n\n"),
  higherLevel: (spell.higher_level ?? []).join("\n\n"),
  // Some spells deal more than one type of damage, so the API returns a list
  ...(spell.damage && {
    damage: [spell.damage].flat().map((d) => ({
      type: d.damage_type?.name,
      atSlotLevel: d.damage_at_slot_level,
      atCharacterLevel: d.damage_at_character_level,
    })),
  }),
  ...(spell.heal_at_slot_level && {
    healAtSlotLevel: spell.heal_at_slot_level,
  }),
  ...(spell.dc && {
    save: { ability: spell.dc.dc_type.name, onSuccess: spell.dc.dc_success },
  }),
  ...(spell.attack_type && { attackType: spell.attack_type }),
  classes: spell.classes.map((c) => c.name),
});

const simplifyEquipment = (item) => ({
  index: item.index,
  name: item.name,
  category: item.equipment_category.name,
  ...(item.cost && { cost: `${item.cost.quantity} ${item.cost.unit}` }),
  ...(item.weight !== undefined && { weight: item.weight }),
  ...(item.desc?.length && { description: item.desc.join("\n\n") }),
  ...(item.damage && {
    weapon: {
      category: item.weapon_category,
      range: item.weapon_range,
      damage: item.damage.damage_dice,
      damageType: item.damage.damage_type?.name,
      properties: (item.properties ?? []).map((p) => p.name),
      ...(item.two_handed_damage && {
        twoHandedDamage: item.two_handed_damage.damage_dice,
      }),
      ...(item.range && {
        normalRange: item.range.normal,
        longRange: item.range.long,
      }),
    },
  }),
  ...(item.armor_class && {
    armor: {
      category: item.armor_category,
      baseAC: item.armor_class.base,
      dexBonus: item.armor_class.dex_bonus,
      maxDexBonus: item.armor_class.max_bonus ?? null,
      strMinimum: item.str_minimum ?? 0,
      stealthDisadvantage: item.stealth_disadvantage ?? false,
    },
  }),
});

const simplifyMonster = (m) => ({
  index: m.index,
  name: m.name,
  size: m.size,
  type: m.subtype ? `${m.type} (${m.subtype})` : m.type,
  alignment: m.alignment,
  armorClass: m.armor_class?.[0]?.value ?? 10,
  hitPoints: m.hit_points,
  hitDice: m.hit_points_roll ?? m.hit_dice,
  speed: Object.entries(m.speed ?? {})
    .map(([kind, value]) => (kind === "walk" ? value : `${kind} ${value}`))
    .join(", "),
  abilities: [
    m.strength,
    m.dexterity,
    m.constitution,
    m.intelligence,
    m.wisdom,
    m.charisma,
  ],
  challengeRating: m.challenge_rating,
  xp: m.xp,
  traits: (m.special_abilities ?? []).map((a) => ({
    name: a.name,
    description: a.desc,
  })),
  actions: (m.actions ?? []).map((a) => ({
    name: a.name,
    description: a.desc,
  })),
});

const fetchClass = async ({ index, name }) => {
  const [spellcasting, levels] = await Promise.all([
    get(`/api/2014/classes/${index}/spellcasting`),
    get(`/api/2014/classes/${index}/levels`),
  ]);
  return [
    name,
    {
      ability: spellcasting?.spellcasting_ability?.name ?? null,
      levels: levels
        .filter((l) => !l.subclass)
        .sort((a, b) => a.level - b.level)
        .map((l) => ({
          level: l.level,
          profBonus: l.prof_bonus,
          cantripsKnown: l.spellcasting?.cantrips_known ?? 0,
          spellsKnown: l.spellcasting?.spells_known ?? null,
          slots: Array.from(
            { length: 9 },
            (_, i) => l.spellcasting?.[`spell_slots_level_${i + 1}`] ?? 0
          ),
        })),
    },
  ];
};

const main = async () => {
  await mkdir(OUT, { recursive: true });

  const classList = (await get("/api/2014/classes")).results;
  const classes = Object.fromEntries(await mapLimit(classList, 4, fetchClass));
  await writeFile(
    new URL("classes.json", OUT),
    JSON.stringify(classes, null, 1) + "\n"
  );
  console.log(`classes: ${Object.keys(classes).length}`);

  const spellList = (await get("/api/2014/spells")).results;
  const spells = await mapLimit(spellList, 8, async ({ index }) =>
    simplifySpell(await get(`/api/2014/spells/${index}`))
  );
  spells.sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));
  await writeFile(new URL("spells.json", OUT), JSON.stringify(spells) + "\n");
  console.log(`spells: ${spells.length}`);

  const equipmentList = (await get("/api/2014/equipment")).results;
  const equipment = await mapLimit(equipmentList, 8, async ({ index }) =>
    simplifyEquipment(await get(`/api/2014/equipment/${index}`))
  );
  equipment.sort((a, b) => a.name.localeCompare(b.name));
  await writeFile(
    new URL("equipment.json", OUT),
    JSON.stringify(equipment) + "\n"
  );
  console.log(`equipment: ${equipment.length}`);

  const monsterList = (await get("/api/2014/monsters")).results;
  const monsters = await mapLimit(monsterList, 8, async ({ index }) =>
    simplifyMonster(await get(`/api/2014/monsters/${index}`))
  );
  monsters.sort((a, b) => a.name.localeCompare(b.name));
  await writeFile(
    new URL("monsters.json", OUT),
    JSON.stringify(monsters) + "\n"
  );
  console.log(`monsters: ${monsters.length}`);
};

await main();
