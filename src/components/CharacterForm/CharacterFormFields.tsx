import type { ChangeEvent, ReactNode } from "react";
import NumberInput from "../NumberInput/NumberInput";
import SpellsSection from "../Spells/SpellsSection";
import AttacksSection from "../Inventory/AttacksSection";
import InventorySection from "../Inventory/InventorySection";
import {
  ABILITIES,
  ALIGNMENTS,
  CLASSES,
  RACES,
  SKILLS,
  calculateModifier,
  formatModifier,
  proficiencyBonusForLevel,
} from "../../utils/dnd";
import type { Ability, CharacterData } from "../../utils/dnd";

type NumericKey = {
  [K in keyof CharacterData]: CharacterData[K] extends number ? K : never;
}[keyof CharacterData];
type TextKey = {
  [K in keyof CharacterData]: CharacterData[K] extends string ? K : never;
}[keyof CharacterData];

const COMBAT_STATS: Array<{
  key: NumericKey;
  label: string;
  fallback: number;
  min?: number;
}> = [
  { key: "armorClass", label: "Armor Class", fallback: 10 },
  { key: "initiative", label: "Initiative", fallback: 0 },
  { key: "speed", label: "Speed", fallback: 30 },
  { key: "maxHitPoints", label: "Max Hit Points", fallback: 8 },
  { key: "currentHitPoints", label: "Current Hit Points", fallback: 8 },
  {
    key: "temporaryHitPoints",
    label: "Temporary Hit Points",
    fallback: 0,
    min: 0,
  },
  { key: "proficiencyBonus", label: "Proficiency Bonus", fallback: 2 },
];

const PERSONALITY_FIELDS: Array<{ key: TextKey; label: string }> = [
  { key: "personalityTraits", label: "Personality Traits" },
  { key: "ideals", label: "Ideals" },
  { key: "bonds", label: "Bonds" },
  { key: "flaws", label: "Flaws" },
];

const ADDITIONAL_FIELDS: Array<{ key: TextKey; label: string; rows: number }> =
  [
    { key: "characterAppearance", label: "Character Appearance", rows: 4 },
    { key: "alliesAndOrganizations", label: "Allies & Organizations", rows: 4 },
    {
      key: "additionalFeaturesAndTraits",
      label: "Additional Features & Traits",
      rows: 6,
    },
    {
      key: "proficienciesAndLanguages",
      label: "Other proficiencies & languages",
      rows: 4,
    },
    { key: "spells", label: "Spell notes", rows: 4 },
  ];

type CharacterFormFieldsProps = {
  character: CharacterData;
  onFieldChange: <K extends keyof CharacterData>(
    key: K,
    value: CharacterData[K]
  ) => void;
  disabled?: boolean;
  /** Rendered at the top of the Ability Scores section (e.g. a dice roller). */
  abilityScoresHeader?: ReactNode;
  /** Rendered under each ability's label (e.g. rolled-score buttons). */
  renderAbilityControls?: (ability: Ability) => ReactNode;
};

const CharacterFormFields = ({
  character,
  onFieldChange,
  disabled = false,
  abilityScoresHeader,
  renderAbilityControls,
}: CharacterFormFieldsProps) => {
  const handleTextChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => onFieldChange(e.target.name as TextKey, e.target.value);

  const toggleInList = (
    key: "savingThrowProficiencies" | "skillProficiencies",
    value: string
  ) => {
    const list = character[key];
    onFieldChange(
      key,
      list.includes(value) ? list.filter((v) => v !== value) : [...list, value]
    );
  };

  const selectField = (
    key: TextKey,
    label: string,
    options: string[],
    required = false
  ) => (
    <div className="character-form__group">
      <label htmlFor={key}>{label}</label>
      <select
        id={key}
        name={key}
        value={character[key]}
        onChange={handleTextChange}
        disabled={disabled}
        required={required}
      >
        <option value="">Select {label}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );

  const textInput = (key: TextKey, label: string, required = false) => (
    <div className="character-form__group">
      <label htmlFor={key}>{label}</label>
      <input
        type="text"
        id={key}
        name={key}
        value={character[key]}
        onChange={handleTextChange}
        disabled={disabled}
        required={required}
      />
    </div>
  );

  const textArea = (key: TextKey, label: string, rows: number) => (
    <div className="character-form__group" key={key}>
      <label htmlFor={key}>{label}</label>
      <textarea
        id={key}
        name={key}
        value={character[key]}
        onChange={handleTextChange}
        disabled={disabled}
        rows={rows}
      />
    </div>
  );

  const numberField = (stat: (typeof COMBAT_STATS)[number]) => (
    <div className="character-form__group" key={stat.key}>
      <label htmlFor={stat.key}>{stat.label}</label>
      <NumberInput
        id={stat.key}
        name={stat.key}
        value={character[stat.key]}
        onChange={(v) => onFieldChange(stat.key, v)}
        fallback={stat.fallback}
        min={stat.min}
        disabled={disabled}
      />
      {stat.key === "proficiencyBonus" && (
        <small className="character-form__hint">
          Level {character.level}:{" "}
          {formatModifier(proficiencyBonusForLevel(character.level))}
        </small>
      )}
      {stat.key === "initiative" && (
        <small className="character-form__hint">
          DEX modifier: {formatModifier(calculateModifier(character.dexterity))}
        </small>
      )}
    </div>
  );

  return (
    <>
      <section className="character-form__section">
        <h3>Basic Information</h3>
        <div className="character-form__grid character-form__grid--2">
          {textInput("characterName", "Character Name", true)}
          {selectField("class", "Class", CLASSES, true)}
          <div className="character-form__group">
            <label htmlFor="level">Level</label>
            <NumberInput
              id="level"
              name="level"
              value={character.level}
              onChange={(v) => onFieldChange("level", v)}
              fallback={1}
              min={1}
              max={20}
              disabled={disabled}
              required
            />
          </div>
          {selectField("race", "Race", RACES, true)}
          {textInput("background", "Background")}
          {selectField("alignment", "Alignment", ALIGNMENTS)}
          {textInput("playerName", "Player Name")}
          <div className="character-form__group">
            <label htmlFor="experiencePoints">Experience Points</label>
            <NumberInput
              id="experiencePoints"
              name="experiencePoints"
              value={character.experiencePoints}
              onChange={(v) => onFieldChange("experiencePoints", v)}
              fallback={0}
              min={0}
              disabled={disabled}
            />
          </div>
        </div>
      </section>

      <section className="character-form__section">
        <h3>Ability Scores</h3>
        {abilityScoresHeader}
        <div className="character-form__grid character-form__grid--3">
          {ABILITIES.map((ability) => {
            const score = character[ability.key];
            return (
              <div key={ability.key} className="ability-score-group">
                <label htmlFor={ability.key}>
                  {ability.name} ({ability.abbrev})
                </label>
                {renderAbilityControls?.(ability)}
                <NumberInput
                  id={ability.key}
                  name={ability.key}
                  value={score}
                  onChange={(v) => onFieldChange(ability.key, v)}
                  fallback={10}
                  min={1}
                  max={30}
                  disabled={disabled}
                />
                <div className="ability-modifier">
                  Modifier: {formatModifier(calculateModifier(score))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="character-form__section">
        <h3>Combat Statistics</h3>
        <div className="character-form__grid character-form__grid--4">
          {COMBAT_STATS.slice(0, 3).map(numberField)}
          {textInput("hitDice", "Hit Dice")}
          {COMBAT_STATS.slice(3).map(numberField)}
        </div>
      </section>

      <section className="character-form__section">
        <h3>Saving Throw Proficiencies</h3>
        <div className="character-form__checkbox-group">
          {ABILITIES.map((ability) => (
            <label key={ability.key} className="checkbox-label">
              <input
                type="checkbox"
                checked={character.savingThrowProficiencies.includes(
                  ability.abbrev
                )}
                onChange={() =>
                  toggleInList("savingThrowProficiencies", ability.abbrev)
                }
                disabled={disabled}
              />
              {ability.name} ({ability.abbrev})
            </label>
          ))}
        </div>
      </section>

      <section className="character-form__section">
        <h3>Skill Proficiencies</h3>
        <div className="character-form__checkbox-group">
          {SKILLS.map((skill) => (
            <label key={skill.name} className="checkbox-label">
              <input
                type="checkbox"
                checked={character.skillProficiencies.includes(skill.name)}
                onChange={() => toggleInList("skillProficiencies", skill.name)}
                disabled={disabled}
              />
              {skill.name} ({skill.ability})
            </label>
          ))}
        </div>
      </section>

      <section className="character-form__section">
        <h3>Personality</h3>
        <div className="character-form__grid character-form__grid--2">
          {PERSONALITY_FIELDS.map(({ key, label }) => textArea(key, label, 4))}
        </div>
      </section>

      <AttacksSection
        character={character}
        onChange={(attacks) => onFieldChange("attacks", attacks)}
        disabled={disabled}
      />

      <InventorySection
        character={character}
        onChange={(fields) => {
          for (const [key, value] of Object.entries(fields)) {
            onFieldChange(
              key as keyof CharacterData,
              value as CharacterData[keyof CharacterData]
            );
          }
        }}
        disabled={disabled}
      />

      <SpellsSection
        character={character}
        onChange={(spells) => onFieldChange("knownSpells", spells)}
        disabled={disabled}
      />

      <section className="character-form__section">
        <h3>Additional Information</h3>
        {ADDITIONAL_FIELDS.map(({ key, label, rows }) =>
          textArea(key, label, rows)
        )}
      </section>
    </>
  );
};

export default CharacterFormFields;
