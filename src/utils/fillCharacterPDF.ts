import { PDFDocument } from "pdf-lib";

export interface CharacterData {
  // Basic Information
  characterName: string;
  class: string;
  level: number;
  background: string;
  playerName: string;
  race: string;
  alignment: string;
  experiencePoints: number;

  // Ability Scores
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;

  // Combat Stats
  armorClass: number;
  initiative: number;
  speed: number;
  maxHitPoints: number;
  currentHitPoints: number;
  temporaryHitPoints: number;
  hitDice: string;

  // Proficiency
  proficiencyBonus: number;
  savingThrowProficiencies: string[];
  skillProficiencies: string[];

  // Other
  personalityTraits: string;
  ideals: string;
  bonds: string;
  flaws: string;
  characterAppearance: string;
  alliesAndOrganizations: string;
  additionalFeaturesAndTraits: string;
  equipment: string;
  spells: string;
}

const calculateModifier = (score: number): number => {
  return Math.floor((score - 10) / 2);
};

const formatModifier = (modifier: number): string => {
  return modifier >= 0 ? `+${modifier}` : `${modifier}`;
};

const calculateSkillModifier = (
  abilityScore: number,
  isProficient: boolean,
  proficiencyBonus: number
): number => {
  const baseModifier = calculateModifier(abilityScore);
  return baseModifier + (isProficient ? proficiencyBonus : 0);
};

export const fillCharacterPDF = async (characterData: CharacterData) => {
  try {
    // Load the PDF template from the public folder
    // Try multiple paths to handle both local dev and GitHub Pages deployment
    const baseUrl = import.meta.env.BASE_URL || "./";
    const pdfFileName = "TWC-DnD-5E-Character-Sheet-v1.6.pdf";

    // Try paths in order: relative path (for base: "./"), absolute path, and with base URL
    const possiblePaths = [
      pdfFileName, // Relative path (works with base: "./")
      `/${pdfFileName}`, // Absolute path (works if at root)
      `${baseUrl}${pdfFileName}`, // With base URL
      `${baseUrl.replace(/\/$/, "")}/${pdfFileName}`, // Base URL without trailing slash
    ];

    let pdfTemplateBytes: ArrayBuffer | null = null;
    let lastError: Error | null = null;

    for (const path of possiblePaths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          pdfTemplateBytes = await response.arrayBuffer();
          console.log(`Successfully loaded PDF template from: ${path}`);
          break;
        }
      } catch (error: any) {
        lastError = error;
        continue;
      }
    }

    if (!pdfTemplateBytes) {
      throw new Error(
        `Failed to load PDF template. Tried paths: ${possiblePaths.join(
          ", "
        )}. ${lastError?.message || ""}`
      );
    }

    // Load the PDF document
    const pdfDoc = await PDFDocument.load(pdfTemplateBytes);
    const form = pdfDoc.getForm();

    // Get all fields to see what's available (for debugging)
    const fields = form.getFields();
    console.log(
      "Available form fields:",
      fields.map((f) => f.getName())
    );

    // Helper function to safely set a text field value
    const setFieldValue = (
      fieldName: string,
      value: string | number,
      debug: boolean = false
    ) => {
      try {
        if (fieldName === "DEXmod ") {
          console.log(form.getTextField(fieldName));
        }
        const field = form.getTextField(fieldName);
        field.setText(String(value));
        if (debug) {
          console.log(`✓ Successfully set field "${fieldName}" to "${value}"`);
        }
        return true; // Successfully set
      } catch (error) {
        // Field doesn't exist or is wrong type, skip it
        return false; // Failed to set
      }
    };

    // Helper to try multiple field names and log which one worked
    const trySetFieldMultiple = (
      fieldNames: string[],
      value: string | number,
      debugLabel?: string
    ) => {
      for (const fieldName of fieldNames) {
        if (setFieldValue(fieldName, value)) {
          if (debugLabel) {
            console.log(`✓ ${debugLabel} mapped to field: "${fieldName}"`);
          }
          return true; // Found and set successfully
        }
      }
      if (debugLabel) {
        console.warn(
          `⚠ ${debugLabel} could not be mapped. Tried: ${fieldNames
            .slice(0, 3)
            .join(", ")}...`
        );
      }
      return false; // None worked
    };

    // Helper function to set checkbox
    const setCheckbox = (fieldName: string, checked: boolean) => {
      try {
        const checkbox = form.getCheckBox(fieldName);
        if (checked) {
          checkbox.check();
        } else {
          checkbox.uncheck();
        }
      } catch (error) {
        // Field doesn't exist, skip it
      }
    };

    // Basic Information - try common field name variations
    setFieldValue("CharacterName", characterData.characterName || "");
    setFieldValue("charname", characterData.characterName || "");
    setFieldValue("name", characterData.characterName || "");
    setFieldValue("Character Name", characterData.characterName || "");

    // Class and Level - might be combined or separate
    setFieldValue("Class", characterData.class || "");
    setFieldValue("class", characterData.class || "");
    setFieldValue(
      "ClassLevel",
      `${characterData.class || ""} ${characterData.level || 1}`
    );
    setFieldValue(
      "Class & Level",
      `${characterData.class || ""} ${characterData.level || 1}`
    );
    setFieldValue(
      "classlevel",
      `${characterData.class || ""} ${characterData.level || 1}`
    );

    setFieldValue("Level", String(characterData.level || 1));
    setFieldValue("level", String(characterData.level || 1));
    setFieldValue("charlevel", String(characterData.level || 1));

    setFieldValue("Background", characterData.background || "");
    setFieldValue("background", characterData.background || "");

    setFieldValue("PlayerName", characterData.playerName || "");
    setFieldValue("playername", characterData.playerName || "");
    setFieldValue("player", characterData.playerName || "");
    setFieldValue("Player Name", characterData.playerName || "");

    // Race - try many variations
    setFieldValue("Race", characterData.race || "");
    setFieldValue("race", characterData.race || "");
    setFieldValue("Race ", characterData.race || "");
    setFieldValue("race ", characterData.race || "");

    setFieldValue("Alignment", characterData.alignment || "");
    setFieldValue("alignment", characterData.alignment || "");

    setFieldValue(
      "ExperiencePoints",
      String(characterData.experiencePoints || 0)
    );
    setFieldValue("experience", String(characterData.experiencePoints || 0));
    setFieldValue("xp", String(characterData.experiencePoints || 0));

    // Ability Scores and Modifiers
    const abilities = [
      { name: "Strength", abbrev: "STR", value: characterData.strength },
      { name: "Dexterity", abbrev: "DEX", value: characterData.dexterity },
      {
        name: "Constitution",
        abbrev: "CON",
        value: characterData.constitution,
      },
      {
        name: "Intelligence",
        abbrev: "INT",
        value: characterData.intelligence,
      },
      { name: "Wisdom", abbrev: "WIS", value: characterData.wisdom },
      { name: "Charisma", abbrev: "CHA", value: characterData.charisma },
    ];

    abilities.forEach((ability) => {
      const modifier = calculateModifier(ability.value);
      const baseName = ability.name.toLowerCase();

      // Try common field name patterns for scores
      setFieldValue(`${ability.name}Score`, String(ability.value));
      setFieldValue(`${ability.name}`, String(ability.value));
      setFieldValue(`${baseName}score`, String(ability.value));
      setFieldValue(`${baseName}`, String(ability.value));
      setFieldValue(ability.abbrev, String(ability.value));
      setFieldValue(ability.abbrev.toLowerCase(), String(ability.value));
      setFieldValue(`${ability.name} `, String(ability.value));
      setFieldValue(`${ability.name}Score `, String(ability.value));

      // Try common field name patterns for modifiers - many variations
      const modifierValue = formatModifier(modifier);

      // Special cases for Dexterity and Charisma (commonly problematic) - try these FIRST
      if (ability.name === "Dexterity") {
        // Try "DEXmod" first since that's the actual field name in the PDF
        const dexModNames = [
          "DEXmod", // Try this first - confirmed field name
          "DEXMod", // Try common variation
          "DEXmod ", // Try common variation
          "Dexterity Mod",
          "DexterityMod",
          "Dexterity Modifier",
          "DexterityModifier",
          "DEX Mod",
          "DEX Modifier",
          "DEXModifier",
          "dex mod",
          "dexmod",
          "dex modifier",
          "dexmodifier",
          "dexterity mod",
          "dexteritymod",
          "dexterity modifier",
          "dexteritymodifier",
          "Dexterity Mod ",
          "dexterity mod ",
        ];
        const found = trySetFieldMultiple(
          dexModNames,
          modifierValue,
          "Dexterity Modifier"
        );
        // If we found it in the special case, skip the regular variations
        if (found) {
          // Skip to saving throws
        } else {
          // Fall back to regular variations if special case didn't work
          setFieldValue(`${ability.name}Mod`, modifierValue);
          setFieldValue(`${ability.name}Modifier`, modifierValue);
          setFieldValue(`${ability.abbrev}Mod`, modifierValue);
          setFieldValue(`${ability.abbrev}mod`, modifierValue);
        }
      } else if (ability.name === "Charisma") {
        const chaModNames = ["CHamod"];
        const found = trySetFieldMultiple(
          chaModNames,
          modifierValue,
          "Charisma Modifier"
        );
        // If we found it in the special case, skip the regular variations
        if (found) {
          // Skip to saving throws
        } else {
          // Fall back to regular variations if special case didn't work
          setFieldValue(`${ability.name}Mod`, modifierValue);
          setFieldValue(`${ability.name}Modifier`, modifierValue);
          setFieldValue(`${ability.abbrev}Mod`, modifierValue);
          setFieldValue(`${ability.abbrev}mod`, modifierValue);
        }
      } else {
        // For other abilities, try all regular variations
        setFieldValue(`${ability.name}Mod`, modifierValue);
        setFieldValue(`${ability.name}Modifier`, modifierValue);
        setFieldValue(`${ability.name} Mod`, modifierValue);
        setFieldValue(`${ability.name} Modifier`, modifierValue);
        setFieldValue(`${ability.name}Mod `, modifierValue);
        setFieldValue(`${ability.name} Mod `, modifierValue);
        setFieldValue(`${ability.name}Modifier `, modifierValue);
        setFieldValue(`${ability.name} Modifier `, modifierValue);
        // Lowercase variations
        setFieldValue(`${baseName}mod`, modifierValue);
        setFieldValue(`${baseName}modifier`, modifierValue);
        setFieldValue(`${baseName} mod`, modifierValue);
        setFieldValue(`${baseName} modifier`, modifierValue);
        setFieldValue(`${baseName}mod `, modifierValue);
        setFieldValue(`${baseName} modifier `, modifierValue);
        // Abbreviation variations
        setFieldValue(`${ability.abbrev}Mod`, modifierValue);
        setFieldValue(`${ability.abbrev}mod`, modifierValue);
        setFieldValue(`${ability.abbrev} Mod`, modifierValue);
        setFieldValue(`${ability.abbrev} mod`, modifierValue);
        setFieldValue(`${ability.abbrev}Mod `, modifierValue);
        setFieldValue(`${ability.abbrev} Mod `, modifierValue);
      }

      // Saving throw proficiencies
      const isProficient = characterData.savingThrowProficiencies.includes(
        ability.abbrev
      );
      setCheckbox(`${ability.name}ST`, isProficient);
      setCheckbox(`${ability.name}Save`, isProficient);
      setCheckbox(`${baseName}save`, isProficient);
      setCheckbox(`${ability.abbrev}ST`, isProficient);
      setCheckbox(`${ability.abbrev}Save`, isProficient);
    });

    // Skills - expanded field name variations
    const skills = [
      {
        name: "Acrobatics",
        ability: "DEX",
        fieldNames: ["Acrobatics", "acrobatics", "Acrobatics ", "acrobatics "],
      },
      {
        name: "Animal Handling",
        ability: "WIS",
        fieldNames: [
          "AnimalHandling",
          "animalhandling",
          "Animal Handling",
          "Animal Handling ",
          "animal handling",
          "AnimalHandling ",
          "Animal",
        ],
      },
      {
        name: "Arcana",
        ability: "INT",
        fieldNames: ["Arcana", "arcana", "Arcana ", "arcana "],
      },
      {
        name: "Athletics",
        ability: "STR",
        fieldNames: ["Athletics", "athletics", "Athletics ", "athletics "],
      },
      {
        name: "Deception",
        ability: "CHA",
        fieldNames: ["Deception", "deception", "Deception ", "deception "],
      },
      {
        name: "History",
        ability: "INT",
        fieldNames: ["History", "history", "History ", "history "],
      },
      {
        name: "Insight",
        ability: "WIS",
        fieldNames: ["Insight", "insight", "Insight ", "insight "],
      },
      {
        name: "Intimidation",
        ability: "CHA",
        fieldNames: [
          "Intimidation",
          "intimidation",
          "Intimidation ",
          "intimidation ",
        ],
      },
      {
        name: "Investigation",
        ability: "INT",
        fieldNames: [
          "Investigation",
          "investigation",
          "Investigation ",
          "investigation ",
        ],
      },
      {
        name: "Medicine",
        ability: "WIS",
        fieldNames: ["Medicine", "medicine", "Medicine ", "medicine "],
      },
      {
        name: "Nature",
        ability: "INT",
        fieldNames: ["Nature", "nature", "Nature ", "nature "],
      },
      {
        name: "Perception",
        ability: "WIS",
        fieldNames: ["Perception", "perception", "Perception ", "perception "],
      },
      {
        name: "Performance",
        ability: "CHA",
        fieldNames: [
          "Performance",
          "performance",
          "Performance ",
          "performance ",
        ],
      },
      {
        name: "Persuasion",
        ability: "CHA",
        fieldNames: ["Persuasion", "persuasion", "Persuasion ", "persuasion "],
      },
      {
        name: "Religion",
        ability: "INT",
        fieldNames: ["Religion", "religion", "Religion ", "religion "],
      },
      {
        name: "Sleight of Hand",
        ability: "DEX",
        fieldNames: [
          "SleightofHand",
          "Sleight of Hand",
          "Sleight of Hand ",
          "sleightofhand",
          "SleightofHand ",
          "sleight of hand",
        ],
      },
      {
        name: "Stealth",
        ability: "DEX",
        fieldNames: ["Stealth", "stealth", "Stealth ", "stealth "],
      },
      {
        name: "Survival",
        ability: "WIS",
        fieldNames: ["Survival", "survival", "Survival ", "survival "],
      },
    ];

    skills.forEach((skill) => {
      let abilityValue: number = 10;
      switch (skill.ability) {
        case "STR":
          abilityValue = characterData.strength;
          break;
        case "DEX":
          abilityValue = characterData.dexterity;
          break;
        case "CON":
          abilityValue = characterData.constitution;
          break;
        case "INT":
          abilityValue = characterData.intelligence;
          break;
        case "WIS":
          abilityValue = characterData.wisdom;
          break;
        case "CHA":
          abilityValue = characterData.charisma;
          break;
      }

      const isProficient = characterData.skillProficiencies.includes(
        skill.name
      );
      const skillModifier = calculateSkillModifier(
        abilityValue,
        isProficient,
        characterData.proficiencyBonus
      );

      // Try to set the skill modifier - try all field name variations
      const skillModValue = formatModifier(skillModifier);
      skill.fieldNames.forEach((fieldName) => {
        // Direct field name
        setFieldValue(fieldName, skillModValue);
        // With Mod suffix variations
        setFieldValue(`${fieldName}Mod`, skillModValue);
        setFieldValue(`${fieldName} Mod`, skillModValue);
        setFieldValue(`${fieldName}Modifier`, skillModValue);
        setFieldValue(`${fieldName} Modifier`, skillModValue);
        setFieldValue(`${fieldName}Mod `, skillModValue);
        setFieldValue(`${fieldName} Mod `, skillModValue);
        // Trimmed variations
        const trimmedFieldName = fieldName.trim();
        if (trimmedFieldName !== fieldName) {
          setFieldValue(trimmedFieldName, skillModValue);
          setFieldValue(`${trimmedFieldName}Mod`, skillModValue);
          setFieldValue(`${trimmedFieldName} Mod`, skillModValue);
          setFieldValue(`${trimmedFieldName}Modifier`, skillModValue);
          setFieldValue(`${trimmedFieldName} Modifier`, skillModValue);
        }
        // Special handling for Animal Handling (commonly problematic)
        if (skill.name === "Animal Handling") {
          const animalHandlingNames = [
            "Animal Handling",
            "AnimalHandling",
            "animal handling",
            "animalhandling",
            "Animal Handling ",
            "AnimalHandling ",
            "animal handling ",
            "animalhandling ",
            "Animal HandlingMod",
            "AnimalHandlingMod",
            "Animal Handling Mod",
            "AnimalHandling Mod",
            "animal handlingmod",
            "animalhandlingmod",
            "animal handling mod",
            "animalhandling mod",
            "AnimalHandlingModifier",
            "Animal Handling Modifier",
            "animalhandlingmodifier",
            "animal handling modifier",
            "Animal",
          ];
          trySetFieldMultiple(
            animalHandlingNames,
            skillModValue,
            "Animal Handling"
          );
        }
      });

      // Try to set proficiency checkbox - try all field name variations
      skill.fieldNames.forEach((fieldName) => {
        const trimmedFieldName = fieldName.trim();
        setCheckbox(`${fieldName}Prof`, isProficient);
        setCheckbox(`${fieldName}Check`, isProficient);
        setCheckbox(`${fieldName} Prof`, isProficient);
        setCheckbox(`${fieldName} Check`, isProficient);
        if (trimmedFieldName !== fieldName) {
          setCheckbox(`${trimmedFieldName}Prof`, isProficient);
          setCheckbox(`${trimmedFieldName}Check`, isProficient);
        }
      });
    });

    // Combat Stats
    setFieldValue("ArmorClass", String(characterData.armorClass || 10));
    setFieldValue("AC", String(characterData.armorClass || 10));
    setFieldValue("armorclass", String(characterData.armorClass || 10));
    setFieldValue("ac", String(characterData.armorClass || 10));

    setFieldValue("Initiative", formatModifier(characterData.initiative || 0));
    setFieldValue("initiative", formatModifier(characterData.initiative || 0));
    setFieldValue("init", formatModifier(characterData.initiative || 0));

    setFieldValue("Speed", String(characterData.speed || 30));
    setFieldValue("speed", String(characterData.speed || 30));

    // Hit Point Maximum - many variations
    setFieldValue("HitPointMaximum", String(characterData.maxHitPoints || 8));
    setFieldValue("Hit Point Maximum", String(characterData.maxHitPoints || 8));
    setFieldValue(
      "Hit Point Maximum ",
      String(characterData.maxHitPoints || 8)
    );
    setFieldValue("HitPoint Maximum", String(characterData.maxHitPoints || 8));
    setFieldValue("HP Maximum", String(characterData.maxHitPoints || 8));
    setFieldValue("HP", String(characterData.maxHitPoints || 8));
    setFieldValue("MaxHP", String(characterData.maxHitPoints || 8));
    setFieldValue("Max HP", String(characterData.maxHitPoints || 8));
    setFieldValue("hp", String(characterData.maxHitPoints || 8));
    setFieldValue("maxhp", String(characterData.maxHitPoints || 8));
    setFieldValue("HP Max", String(characterData.maxHitPoints || 8));

    // Current Hit Points - many variations
    setFieldValue(
      "CurrentHitPoints",
      String(characterData.currentHitPoints || characterData.maxHitPoints || 8)
    );
    setFieldValue(
      "Current Hit Points",
      String(characterData.currentHitPoints || characterData.maxHitPoints || 8)
    );
    setFieldValue(
      "Current Hit Points ",
      String(characterData.currentHitPoints || characterData.maxHitPoints || 8)
    );
    setFieldValue(
      "CurrentHit Points",
      String(characterData.currentHitPoints || characterData.maxHitPoints || 8)
    );
    setFieldValue(
      "CurrentHP",
      String(characterData.currentHitPoints || characterData.maxHitPoints || 8)
    );
    setFieldValue(
      "Current HP",
      String(characterData.currentHitPoints || characterData.maxHitPoints || 8)
    );
    setFieldValue(
      "currenthp",
      String(characterData.currentHitPoints || characterData.maxHitPoints || 8)
    );
    setFieldValue(
      "HP Current",
      String(characterData.currentHitPoints || characterData.maxHitPoints || 8)
    );

    setFieldValue(
      "TemporaryHitPoints",
      String(characterData.temporaryHitPoints || 0)
    );
    setFieldValue("TempHP", String(characterData.temporaryHitPoints || 0));
    setFieldValue("temphp", String(characterData.temporaryHitPoints || 0));

    setFieldValue("HitDice", characterData.hitDice || "1d8");
    setFieldValue("hitdice", characterData.hitDice || "1d8");
    setFieldValue("HD", characterData.hitDice || "1d8");

    setFieldValue(
      "ProficiencyBonus",
      formatModifier(characterData.proficiencyBonus || 2)
    );
    setFieldValue(
      "proficiency",
      formatModifier(characterData.proficiencyBonus || 2)
    );
    setFieldValue("prof", formatModifier(characterData.proficiencyBonus || 2));

    // Personality & Background
    setFieldValue("PersonalityTraits", characterData.personalityTraits || "");
    setFieldValue("personality", characterData.personalityTraits || "");
    setFieldValue("traits", characterData.personalityTraits || "");

    setFieldValue("Ideals", characterData.ideals || "");
    setFieldValue("ideals", characterData.ideals || "");

    setFieldValue("Bonds", characterData.bonds || "");
    setFieldValue("bonds", characterData.bonds || "");

    setFieldValue("Flaws", characterData.flaws || "");
    setFieldValue("flaws", characterData.flaws || "");

    setFieldValue(
      "CharacterAppearance",
      characterData.characterAppearance || ""
    );
    setFieldValue("Appearance", characterData.characterAppearance || "");
    setFieldValue("appearance", characterData.characterAppearance || "");

    setFieldValue("Allies", characterData.alliesAndOrganizations || "");
    setFieldValue("allies", characterData.alliesAndOrganizations || "");
    setFieldValue(
      "AlliesAndOrganizations",
      characterData.alliesAndOrganizations || ""
    );

    // Features, Equipment, Spells
    setFieldValue("Features", characterData.additionalFeaturesAndTraits || "");
    setFieldValue("features", characterData.additionalFeaturesAndTraits || "");
    setFieldValue(
      "FeaturesAndTraits",
      characterData.additionalFeaturesAndTraits || ""
    );
    setFieldValue(
      "AdditionalFeatures",
      characterData.additionalFeaturesAndTraits || ""
    );

    setFieldValue("Equipment", characterData.equipment || "");
    setFieldValue("equipment", characterData.equipment || "");
    setFieldValue("EquipmentAndInventory", characterData.equipment || "");

    setFieldValue("Spells", characterData.spells || "");
    setFieldValue("spells", characterData.spells || "");
    setFieldValue("SpellList", characterData.spells || "");
    setFieldValue("Spellcasting", characterData.spells || "");

    // Flatten the PDF to make it non-editable (optional, but recommended for filled forms)
    // form.flatten();

    // Save the PDF
    const pdfBytes = await pdfDoc.save();

    // Create a blob and download
    const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${characterData.characterName || "Character"}_Sheet.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error: any) {
    console.error("Error filling PDF:", error);
    const errorMessage = error?.message || "Unknown error";
    throw new Error(
      `Failed to generate PDF: ${errorMessage}. Please make sure the PDF template is available.`
    );
  }
};
