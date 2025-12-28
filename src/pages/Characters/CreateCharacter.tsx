import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../../firebaseSetup";
import {
  collection,
  addDoc,
  serverTimestamp,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import Header from "../../components/Header/Header";
import { fillCharacterPDF } from "../../utils/fillCharacterPDF";
import "./CreateCharacter.scss";

const CreateCharacter = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    // Basic Information
    characterName: "",
    class: "",
    level: 1,
    background: "",
    playerName: "",
    race: "",
    alignment: "",
    experiencePoints: 0,

    // Ability Scores
    strength: 10,
    dexterity: 10,
    constitution: 10,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,

    // Combat Stats
    armorClass: 10,
    initiative: 0,
    speed: 30,
    maxHitPoints: 8,
    currentHitPoints: 8,
    temporaryHitPoints: 0,
    hitDice: "1d8",

    // Proficiency
    proficiencyBonus: 2,
    savingThrowProficiencies: [] as string[],
    skillProficiencies: [] as string[],

    // Other
    personalityTraits: "",
    ideals: "",
    bonds: "",
    flaws: "",
    characterAppearance: "",
    alliesAndOrganizations: "",
    additionalFeaturesAndTraits: "",
    equipment: "",
    spells: "",
    campaignIds: [] as string[],
  });
  const [newCampaignId, setNewCampaignId] = useState("");
  const [linkingCampaign, setLinkingCampaign] = useState(false);
  const [linkedCampaigns, setLinkedCampaigns] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [abilityScoreInputs, setAbilityScoreInputs] = useState<{
    [key: string]: string;
  }>({
    strength: "10",
    dexterity: "10",
    constitution: "10",
    intelligence: "10",
    wisdom: "10",
    charisma: "10",
  });
  const [combatStatInputs, setCombatStatInputs] = useState<{
    [key: string]: string;
  }>({
    armorClass: "10",
    initiative: "0",
    speed: "30",
    maxHitPoints: "8",
    currentHitPoints: "8",
    temporaryHitPoints: "0",
    proficiencyBonus: "2",
  });
  const [rolledScores, setRolledScores] = useState<number[]>([]);
  const [hasRolled, setHasRolled] = useState(false);
  // Track which rolled score index is assigned to which ability
  const [scoreAssignments, setScoreAssignments] = useState<{
    [abilityKey: string]: number | null; // abilityKey -> rolledScoreIndex
  }>({
    strength: null,
    dexterity: null,
    constitution: null,
    intelligence: null,
    wisdom: null,
    charisma: null,
  });

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleNumberChange = (name: string, value: number) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleCheckboxChange = (category: string, value: string) => {
    setFormData((prev) => {
      const currentArray =
        category === "savingThrow"
          ? prev.savingThrowProficiencies
          : prev.skillProficiencies;
      const newArray = currentArray.includes(value)
        ? currentArray.filter((item) => item !== value)
        : [...currentArray, value];

      return {
        ...prev,
        [category === "savingThrow"
          ? "savingThrowProficiencies"
          : "skillProficiencies"]: newArray,
      };
    });
  };

  const calculateModifier = (score: number): number => {
    return Math.floor((score - 10) / 2);
  };

  const handleLinkCampaign = async () => {
    if (!newCampaignId.trim()) return;

    const campaignId = newCampaignId.trim();

    // Check if already linked
    if (formData.campaignIds.includes(campaignId)) {
      setError("This character is already linked to this campaign");
      setNewCampaignId("");
      return;
    }

    try {
      setLinkingCampaign(true);
      setError(null);

      // Validate campaign exists
      const campaignDoc = await getDoc(doc(db, "campaigns", campaignId));
      if (!campaignDoc.exists()) {
        throw new Error("Campaign not found. Please check the Campaign ID.");
      }

      const campaignData = campaignDoc.data();
      const updatedCampaignIds = [...formData.campaignIds, campaignId];

      setFormData((prev) => ({
        ...prev,
        campaignIds: updatedCampaignIds,
      }));

      // Update linked campaigns display
      setLinkedCampaigns([
        ...linkedCampaigns,
        {
          id: campaignId,
          name: campaignData.campaignName || "Unnamed Campaign",
        },
      ]);

      setNewCampaignId("");
    } catch (err: any) {
      setError(err.message || "Failed to link campaign");
      console.error("Error linking campaign:", err);
    } finally {
      setLinkingCampaign(false);
    }
  };

  const handleUnlinkCampaign = (campaignId: string) => {
    // For CreateCharacter, we just remove from local state since character doesn't exist yet
    setFormData((prev) => ({
      ...prev,
      campaignIds: prev.campaignIds.filter((id) => id !== campaignId),
    }));
    setLinkedCampaigns(
      linkedCampaigns.filter((campaign) => campaign.id !== campaignId)
    );
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    setError(null);

    try {
      await fillCharacterPDF(formData);
    } catch (err: any) {
      setError(err.message || "Failed to export PDF");
      console.error("Error exporting PDF:", err);
    } finally {
      setExportingPDF(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!auth.currentUser) {
        throw new Error("You must be logged in to create a character");
      }

      const characterData = {
        ...formData,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // Create character first
      const characterRef = await addDoc(
        collection(db, "characters"),
        characterData
      );
      const characterId = characterRef.id;

      // Link to campaigns if any were added
      if (formData.campaignIds.length > 0) {
        const playerInfo = {
          userId: auth.currentUser.uid,
          characterId: characterId,
          characterName: formData.characterName || "Unnamed Character",
          playerName:
            formData.playerName ||
            auth.currentUser.displayName ||
            auth.currentUser.email ||
            "Unknown Player",
        };

        // Update each campaign's players array
        const campaignUpdatePromises = formData.campaignIds.map((campaignId) =>
          updateDoc(doc(db, "campaigns", campaignId), {
            players: arrayUnion(playerInfo),
            updatedAt: serverTimestamp(),
          })
        );

        await Promise.all(campaignUpdatePromises);
      }

      navigate("/characters");
    } catch (err: any) {
      setError(err.message || "Failed to create character");
      console.error("Error creating character:", err);
    } finally {
      setLoading(false);
    }
  };

  const abilities = [
    { name: "Strength", key: "strength", abbrev: "STR" },
    { name: "Dexterity", key: "dexterity", abbrev: "DEX" },
    { name: "Constitution", key: "constitution", abbrev: "CON" },
    { name: "Intelligence", key: "intelligence", abbrev: "INT" },
    { name: "Wisdom", key: "wisdom", abbrev: "WIS" },
    { name: "Charisma", key: "charisma", abbrev: "CHA" },
  ];

  const roll4d6DropLowest = (): number => {
    const rolls: number[] = [];
    for (let i = 0; i < 4; i++) {
      rolls.push(Math.floor(Math.random() * 6) + 1);
    }
    rolls.sort((a, b) => b - a); // Sort descending
    return rolls[0] + rolls[1] + rolls[2]; // Sum of top 3
  };

  const handleRollAbilityScores = () => {
    const newScores: number[] = [];
    for (let i = 0; i < 6; i++) {
      newScores.push(roll4d6DropLowest());
    }
    newScores.sort((a, b) => b - a); // Sort descending for display
    setRolledScores(newScores);
    setHasRolled(true);
    // Reset assignments when new rolls are made
    setScoreAssignments({
      strength: null,
      dexterity: null,
      constitution: null,
      intelligence: null,
      wisdom: null,
      charisma: null,
    });
  };

  const handleAssignScore = (abilityKey: string, scoreIndex: number) => {
    const score = rolledScores[scoreIndex];
    const currentScoreIndex = scoreAssignments[abilityKey];

    // If clicking the same score index that's already assigned, unassign it
    if (currentScoreIndex === scoreIndex) {
      setScoreAssignments((prev) => ({
        ...prev,
        [abilityKey]: null,
      }));
      // Reset to default
      handleNumberChange(abilityKey, 10);
      setAbilityScoreInputs((prev) => ({
        ...prev,
        [abilityKey]: "10",
      }));
      return;
    }

    // Check if this score index is already assigned to another ability
    const previousAbility = Object.keys(scoreAssignments).find(
      (key) =>
        scoreAssignments[key as keyof typeof scoreAssignments] === scoreIndex &&
        key !== abilityKey
    );

    if (previousAbility) {
      // Clear the previous assignment
      setScoreAssignments((prev) => ({
        ...prev,
        [previousAbility]: null,
      }));
    }

    // Assign the score index to the selected ability
    setScoreAssignments((prev) => ({
      ...prev,
      [abilityKey]: scoreIndex,
    }));

    // Update the form data and input state
    handleNumberChange(abilityKey, score);
    setAbilityScoreInputs((prev) => ({
      ...prev,
      [abilityKey]: String(score),
    }));
  };

  const skills = [
    { name: "Acrobatics", ability: "DEX" },
    { name: "Animal Handling", ability: "WIS" },
    { name: "Arcana", ability: "INT" },
    { name: "Athletics", ability: "STR" },
    { name: "Deception", ability: "CHA" },
    { name: "History", ability: "INT" },
    { name: "Insight", ability: "WIS" },
    { name: "Intimidation", ability: "CHA" },
    { name: "Investigation", ability: "INT" },
    { name: "Medicine", ability: "WIS" },
    { name: "Nature", ability: "INT" },
    { name: "Perception", ability: "WIS" },
    { name: "Performance", ability: "CHA" },
    { name: "Persuasion", ability: "CHA" },
    { name: "Religion", ability: "INT" },
    { name: "Sleight of Hand", ability: "DEX" },
    { name: "Stealth", ability: "DEX" },
    { name: "Survival", ability: "WIS" },
  ];

  return (
    <div className="app">
      <Header />
      <div className="character-creation-page">
        <div className="character-creation-page__container">
          <h2>Create New Character</h2>
          {error && <div className="character-form__error">{error}</div>}
          <form onSubmit={handleSubmit} className="character-form">
            {/* Basic Information Section */}
            <section className="character-form__section">
              <h3>Basic Information</h3>
              <div className="character-form__grid character-form__grid--2">
                <div className="character-form__group">
                  <label htmlFor="characterName">Character Name</label>
                  <input
                    type="text"
                    id="characterName"
                    name="characterName"
                    value={formData.characterName}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="character-form__group">
                  <label htmlFor="class">Class</label>
                  <select
                    id="class"
                    name="class"
                    value={formData.class}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Class</option>
                    <option value="Barbarian">Barbarian</option>
                    <option value="Bard">Bard</option>
                    <option value="Cleric">Cleric</option>
                    <option value="Druid">Druid</option>
                    <option value="Fighter">Fighter</option>
                    <option value="Monk">Monk</option>
                    <option value="Paladin">Paladin</option>
                    <option value="Ranger">Ranger</option>
                    <option value="Rogue">Rogue</option>
                    <option value="Sorcerer">Sorcerer</option>
                    <option value="Warlock">Warlock</option>
                    <option value="Wizard">Wizard</option>
                  </select>
                </div>
                <div className="character-form__group">
                  <label htmlFor="level">Level</label>
                  <input
                    type="number"
                    id="level"
                    name="level"
                    value={formData.level}
                    onChange={(e) =>
                      handleNumberChange("level", parseInt(e.target.value) || 1)
                    }
                    min="1"
                    max="20"
                    required
                  />
                </div>
                <div className="character-form__group">
                  <label htmlFor="race">Race</label>
                  <select
                    id="race"
                    name="race"
                    value={formData.race}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Select Race</option>
                    <option value="Dragonborn">Dragonborn</option>
                    <option value="Dwarf">Dwarf</option>
                    <option value="Elf">Elf</option>
                    <option value="Gnome">Gnome</option>
                    <option value="Half-Elf">Half-Elf</option>
                    <option value="Half-Orc">Half-Orc</option>
                    <option value="Halfling">Halfling</option>
                    <option value="Human">Human</option>
                    <option value="Tiefling">Tiefling</option>
                  </select>
                </div>
                <div className="character-form__group">
                  <label htmlFor="background">Background</label>
                  <input
                    type="text"
                    id="background"
                    name="background"
                    value={formData.background}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="character-form__group">
                  <label htmlFor="alignment">Alignment</label>
                  <select
                    id="alignment"
                    name="alignment"
                    value={formData.alignment}
                    onChange={handleInputChange}
                  >
                    <option value="">Select Alignment</option>
                    <option value="Lawful Good">Lawful Good</option>
                    <option value="Neutral Good">Neutral Good</option>
                    <option value="Chaotic Good">Chaotic Good</option>
                    <option value="Lawful Neutral">Lawful Neutral</option>
                    <option value="Neutral">Neutral</option>
                    <option value="Chaotic Neutral">Chaotic Neutral</option>
                    <option value="Lawful Evil">Lawful Evil</option>
                    <option value="Neutral Evil">Neutral Evil</option>
                    <option value="Chaotic Evil">Chaotic Evil</option>
                  </select>
                </div>
                <div className="character-form__group">
                  <label htmlFor="playerName">Player Name</label>
                  <input
                    type="text"
                    id="playerName"
                    name="playerName"
                    value={formData.playerName}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="character-form__group">
                  <label htmlFor="experiencePoints">Experience Points</label>
                  <input
                    type="number"
                    id="experiencePoints"
                    name="experiencePoints"
                    value={formData.experiencePoints}
                    onChange={(e) =>
                      handleNumberChange(
                        "experiencePoints",
                        parseInt(e.target.value) || 0
                      )
                    }
                    min="0"
                  />
                </div>
              </div>
            </section>

            {/* Ability Scores Section */}
            <section className="character-form__section">
              <h3>Ability Scores</h3>

              {/* Dice Rolling Section */}
              <div className="dice-rolling-section">
                <button
                  type="button"
                  className="roll-dice-button"
                  onClick={handleRollAbilityScores}
                  disabled={hasRolled}
                >
                  {hasRolled
                    ? "✓ Ability Scores Rolled"
                    : "🎲 Roll Ability Scores (4d6, drop lowest)"}
                </button>
                {rolledScores.length > 0 && (
                  <div className="rolled-scores-container">
                    <p className="rolled-scores-label">
                      Rolled Scores (click an ability below to assign):
                    </p>
                    <div className="rolled-scores-grid">
                      {rolledScores.map((score, index) => {
                        const assignedTo = Object.keys(scoreAssignments).find(
                          (key) =>
                            scoreAssignments[
                              key as keyof typeof scoreAssignments
                            ] === index
                        );
                        const isAssigned = assignedTo !== undefined;
                        return (
                          <div
                            key={index}
                            className={`rolled-score ${
                              isAssigned ? "rolled-score--assigned" : ""
                            }`}
                            title={
                              isAssigned && assignedTo
                                ? `Assigned to ${
                                    abilities.find((a) => a.key === assignedTo)
                                      ?.name
                                  }`
                                : "Click an ability below to assign this score"
                            }
                          >
                            {score}
                            {isAssigned && assignedTo && (
                              <span className="rolled-score__assigned-label">
                                →{" "}
                                {
                                  abilities.find((a) => a.key === assignedTo)
                                    ?.abbrev
                                }
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="character-form__grid character-form__grid--3">
                {abilities.map((ability) => {
                  const score = formData[
                    ability.key as keyof typeof formData
                  ] as number;
                  const modifier = calculateModifier(score);
                  const inputValue =
                    abilityScoreInputs[ability.key] ?? String(score);
                  const assignedScoreIndex = scoreAssignments[ability.key];
                  return (
                    <div key={ability.key} className="ability-score-group">
                      <label htmlFor={ability.key}>
                        {ability.name} ({ability.abbrev})
                      </label>
                      {rolledScores.length > 0 && (
                        <div className="ability-score-assignments">
                          {rolledScores.map((score, scoreIndex) => {
                            const isAssignedToThis =
                              assignedScoreIndex === scoreIndex;
                            const isAssignedToOther =
                              Object.values(scoreAssignments).includes(
                                scoreIndex
                              ) && !isAssignedToThis;
                            return (
                              <button
                                key={`${ability.key}-${scoreIndex}`}
                                type="button"
                                className={`ability-assign-button ${
                                  isAssignedToThis
                                    ? "ability-assign-button--active"
                                    : isAssignedToOther
                                    ? "ability-assign-button--disabled"
                                    : ""
                                }`}
                                onClick={() =>
                                  handleAssignScore(ability.key, scoreIndex)
                                }
                                disabled={isAssignedToOther}
                                title={
                                  isAssignedToThis
                                    ? `Click to unassign ${score} from ${ability.name}`
                                    : isAssignedToOther
                                    ? `This score is already assigned to another ability`
                                    : `Assign ${score} to ${ability.name}`
                                }
                              >
                                {score}
                              </button>
                            );
                          })}
                        </div>
                      )}
                      <input
                        type="number"
                        id={ability.key}
                        name={ability.key}
                        value={inputValue}
                        onChange={(e) => {
                          const value = e.target.value;
                          setAbilityScoreInputs((prev) => ({
                            ...prev,
                            [ability.key]: value,
                          }));
                          if (value !== "") {
                            const numValue = parseInt(value);
                            if (!isNaN(numValue)) {
                              handleNumberChange(ability.key, numValue);
                            }
                          }
                        }}
                        onBlur={(e) => {
                          const value = e.target.value;
                          const numValue = parseInt(value);
                          if (value === "" || isNaN(numValue) || numValue < 1) {
                            handleNumberChange(ability.key, 10);
                            setAbilityScoreInputs((prev) => ({
                              ...prev,
                              [ability.key]: "10",
                            }));
                          } else {
                            const clampedValue = Math.min(
                              Math.max(numValue, 1),
                              30
                            );
                            handleNumberChange(ability.key, clampedValue);
                            setAbilityScoreInputs((prev) => ({
                              ...prev,
                              [ability.key]: String(clampedValue),
                            }));
                          }
                        }}
                        min="1"
                        max="30"
                      />
                      <div className="ability-modifier">
                        Modifier: {modifier >= 0 ? "+" : ""}
                        {modifier}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Combat Stats Section */}
            <section className="character-form__section">
              <h3>Combat Statistics</h3>
              <div className="character-form__grid character-form__grid--4">
                <div className="character-form__group">
                  <label htmlFor="armorClass">Armor Class</label>
                  <input
                    type="number"
                    id="armorClass"
                    name="armorClass"
                    value={
                      combatStatInputs.armorClass ?? String(formData.armorClass)
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      setCombatStatInputs((prev) => ({
                        ...prev,
                        armorClass: value,
                      }));
                      if (value !== "") {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue)) {
                          handleNumberChange("armorClass", numValue);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      const numValue = parseInt(value);
                      if (value === "" || isNaN(numValue)) {
                        handleNumberChange("armorClass", 10);
                        setCombatStatInputs((prev) => ({
                          ...prev,
                          armorClass: "10",
                        }));
                      } else {
                        setCombatStatInputs((prev) => ({
                          ...prev,
                          armorClass: String(numValue),
                        }));
                      }
                    }}
                  />
                </div>
                <div className="character-form__group">
                  <label htmlFor="initiative">Initiative</label>
                  <input
                    type="number"
                    id="initiative"
                    name="initiative"
                    value={
                      combatStatInputs.initiative ?? String(formData.initiative)
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      setCombatStatInputs((prev) => ({
                        ...prev,
                        initiative: value,
                      }));
                      if (value !== "") {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue)) {
                          handleNumberChange("initiative", numValue);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      const numValue = parseInt(value);
                      if (value === "" || isNaN(numValue)) {
                        handleNumberChange("initiative", 0);
                        setCombatStatInputs((prev) => ({
                          ...prev,
                          initiative: "0",
                        }));
                      } else {
                        setCombatStatInputs((prev) => ({
                          ...prev,
                          initiative: String(numValue),
                        }));
                      }
                    }}
                  />
                </div>
                <div className="character-form__group">
                  <label htmlFor="speed">Speed</label>
                  <input
                    type="number"
                    id="speed"
                    name="speed"
                    value={combatStatInputs.speed ?? String(formData.speed)}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCombatStatInputs((prev) => ({
                        ...prev,
                        speed: value,
                      }));
                      if (value !== "") {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue)) {
                          handleNumberChange("speed", numValue);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      const numValue = parseInt(value);
                      if (value === "" || isNaN(numValue)) {
                        handleNumberChange("speed", 30);
                        setCombatStatInputs((prev) => ({
                          ...prev,
                          speed: "30",
                        }));
                      } else {
                        setCombatStatInputs((prev) => ({
                          ...prev,
                          speed: String(numValue),
                        }));
                      }
                    }}
                  />
                </div>
                <div className="character-form__group">
                  <label htmlFor="hitDice">Hit Dice</label>
                  <input
                    type="text"
                    id="hitDice"
                    name="hitDice"
                    value={formData.hitDice}
                    onChange={handleInputChange}
                    placeholder="1d8"
                  />
                </div>
                <div className="character-form__group">
                  <label htmlFor="maxHitPoints">Max Hit Points</label>
                  <input
                    type="number"
                    id="maxHitPoints"
                    name="maxHitPoints"
                    value={
                      combatStatInputs.maxHitPoints ??
                      String(formData.maxHitPoints)
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      setCombatStatInputs((prev) => ({
                        ...prev,
                        maxHitPoints: value,
                      }));
                      if (value !== "") {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue)) {
                          handleNumberChange("maxHitPoints", numValue);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      const numValue = parseInt(value);
                      if (value === "" || isNaN(numValue)) {
                        handleNumberChange("maxHitPoints", 8);
                        setCombatStatInputs((prev) => ({
                          ...prev,
                          maxHitPoints: "8",
                        }));
                      } else {
                        setCombatStatInputs((prev) => ({
                          ...prev,
                          maxHitPoints: String(numValue),
                        }));
                      }
                    }}
                  />
                </div>
                <div className="character-form__group">
                  <label htmlFor="currentHitPoints">Current Hit Points</label>
                  <input
                    type="number"
                    id="currentHitPoints"
                    name="currentHitPoints"
                    value={
                      combatStatInputs.currentHitPoints ??
                      String(formData.currentHitPoints)
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      setCombatStatInputs((prev) => ({
                        ...prev,
                        currentHitPoints: value,
                      }));
                      if (value !== "") {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue)) {
                          handleNumberChange("currentHitPoints", numValue);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      const numValue = parseInt(value);
                      if (value === "" || isNaN(numValue)) {
                        handleNumberChange("currentHitPoints", 8);
                        setCombatStatInputs((prev) => ({
                          ...prev,
                          currentHitPoints: "8",
                        }));
                      } else {
                        setCombatStatInputs((prev) => ({
                          ...prev,
                          currentHitPoints: String(numValue),
                        }));
                      }
                    }}
                  />
                </div>
                <div className="character-form__group">
                  <label htmlFor="temporaryHitPoints">
                    Temporary Hit Points
                  </label>
                  <input
                    type="number"
                    id="temporaryHitPoints"
                    name="temporaryHitPoints"
                    value={
                      combatStatInputs.temporaryHitPoints ??
                      String(formData.temporaryHitPoints)
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      setCombatStatInputs((prev) => ({
                        ...prev,
                        temporaryHitPoints: value,
                      }));
                      if (value !== "") {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue)) {
                          handleNumberChange("temporaryHitPoints", numValue);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      const numValue = parseInt(value);
                      if (value === "" || isNaN(numValue)) {
                        handleNumberChange("temporaryHitPoints", 0);
                        setCombatStatInputs((prev) => ({
                          ...prev,
                          temporaryHitPoints: "0",
                        }));
                      } else {
                        setCombatStatInputs((prev) => ({
                          ...prev,
                          temporaryHitPoints: String(numValue),
                        }));
                      }
                    }}
                    min="0"
                  />
                </div>
                <div className="character-form__group">
                  <label htmlFor="proficiencyBonus">Proficiency Bonus</label>
                  <input
                    type="number"
                    id="proficiencyBonus"
                    name="proficiencyBonus"
                    value={
                      combatStatInputs.proficiencyBonus ??
                      String(formData.proficiencyBonus)
                    }
                    onChange={(e) => {
                      const value = e.target.value;
                      setCombatStatInputs((prev) => ({
                        ...prev,
                        proficiencyBonus: value,
                      }));
                      if (value !== "") {
                        const numValue = parseInt(value);
                        if (!isNaN(numValue)) {
                          handleNumberChange("proficiencyBonus", numValue);
                        }
                      }
                    }}
                    onBlur={(e) => {
                      const value = e.target.value;
                      const numValue = parseInt(value);
                      if (value === "" || isNaN(numValue)) {
                        handleNumberChange("proficiencyBonus", 2);
                        setCombatStatInputs((prev) => ({
                          ...prev,
                          proficiencyBonus: "2",
                        }));
                      } else {
                        setCombatStatInputs((prev) => ({
                          ...prev,
                          proficiencyBonus: String(numValue),
                        }));
                      }
                    }}
                  />
                </div>
              </div>
            </section>

            {/* Saving Throws Section */}
            <section className="character-form__section">
              <h3>Saving Throw Proficiencies</h3>
              <div className="character-form__checkbox-group">
                {abilities.map((ability) => (
                  <label key={ability.key} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.savingThrowProficiencies.includes(
                        ability.abbrev
                      )}
                      onChange={() =>
                        handleCheckboxChange("savingThrow", ability.abbrev)
                      }
                    />
                    {ability.name} ({ability.abbrev})
                  </label>
                ))}
              </div>
            </section>

            {/* Skills Section */}
            <section className="character-form__section">
              <h3>Skill Proficiencies</h3>
              <div className="character-form__checkbox-group">
                {skills.map((skill) => (
                  <label key={skill.name} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={formData.skillProficiencies.includes(skill.name)}
                      onChange={() => handleCheckboxChange("skill", skill.name)}
                    />
                    {skill.name} ({skill.ability})
                  </label>
                ))}
              </div>
            </section>

            {/* Personality Section */}
            <section className="character-form__section">
              <h3>Personality</h3>
              <div className="character-form__grid character-form__grid--2">
                <div className="character-form__group">
                  <label htmlFor="personalityTraits">Personality Traits</label>
                  <textarea
                    id="personalityTraits"
                    name="personalityTraits"
                    value={formData.personalityTraits}
                    onChange={handleInputChange}
                    rows={4}
                  />
                </div>
                <div className="character-form__group">
                  <label htmlFor="ideals">Ideals</label>
                  <textarea
                    id="ideals"
                    name="ideals"
                    value={formData.ideals}
                    onChange={handleInputChange}
                    rows={4}
                  />
                </div>
                <div className="character-form__group">
                  <label htmlFor="bonds">Bonds</label>
                  <textarea
                    id="bonds"
                    name="bonds"
                    value={formData.bonds}
                    onChange={handleInputChange}
                    rows={4}
                  />
                </div>
                <div className="character-form__group">
                  <label htmlFor="flaws">Flaws</label>
                  <textarea
                    id="flaws"
                    name="flaws"
                    value={formData.flaws}
                    onChange={handleInputChange}
                    rows={4}
                  />
                </div>
              </div>
            </section>

            {/* Additional Information Section */}
            <section className="character-form__section">
              <h3>Additional Information</h3>
              <div className="character-form__group">
                <label htmlFor="characterAppearance">
                  Character Appearance
                </label>
                <textarea
                  id="characterAppearance"
                  name="characterAppearance"
                  value={formData.characterAppearance}
                  onChange={handleInputChange}
                  rows={4}
                />
              </div>
              <div className="character-form__group">
                <label htmlFor="alliesAndOrganizations">
                  Allies & Organizations
                </label>
                <textarea
                  id="alliesAndOrganizations"
                  name="alliesAndOrganizations"
                  value={formData.alliesAndOrganizations}
                  onChange={handleInputChange}
                  rows={4}
                />
              </div>
              <div className="character-form__group">
                <label htmlFor="additionalFeaturesAndTraits">
                  Additional Features & Traits
                </label>
                <textarea
                  id="additionalFeaturesAndTraits"
                  name="additionalFeaturesAndTraits"
                  value={formData.additionalFeaturesAndTraits}
                  onChange={handleInputChange}
                  rows={6}
                />
              </div>
              <div className="character-form__group">
                <label htmlFor="equipment">Equipment</label>
                <textarea
                  id="equipment"
                  name="equipment"
                  value={formData.equipment}
                  onChange={handleInputChange}
                  rows={6}
                />
              </div>
              <div className="character-form__group">
                <label htmlFor="spells">Spells</label>
                <textarea
                  id="spells"
                  name="spells"
                  value={formData.spells}
                  onChange={handleInputChange}
                  rows={6}
                />
              </div>
            </section>

            {/* Campaign Linking Section */}
            <section className="character-form__section">
              <h3>Linked Campaigns</h3>
              <div className="character-form__group">
                <label htmlFor="campaignId">Link to Campaign</label>
                <p className="campaign-link-hint">
                  Enter a Campaign ID to link this character to a campaign. You
                  can link this character to multiple campaigns.
                </p>
                <div className="campaign-link-container">
                  <input
                    type="text"
                    id="campaignId"
                    value={newCampaignId}
                    onChange={(e) => setNewCampaignId(e.target.value)}
                    placeholder="Paste Campaign ID here"
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleLinkCampaign();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleLinkCampaign}
                    className="campaign-link-button"
                    disabled={!newCampaignId.trim() || linkingCampaign}
                  >
                    {linkingCampaign ? "Linking..." : "Link Campaign"}
                  </button>
                </div>
              </div>
              {formData.campaignIds.length > 0 ? (
                <div className="linked-campaigns-list">
                  <h4>Linked Campaigns ({formData.campaignIds.length})</h4>
                  <div className="linked-campaigns-list__items">
                    {linkedCampaigns.map((campaign) => (
                      <div
                        key={campaign.id}
                        className="linked-campaigns-list__item"
                      >
                        <div className="linked-campaigns-list__info">
                          <span className="linked-campaigns-list__name">
                            {campaign.name}
                          </span>
                          <code className="linked-campaigns-list__id">
                            {campaign.id}
                          </code>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleUnlinkCampaign(campaign.id)}
                          className="linked-campaigns-list__remove"
                          title="Unlink campaign"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="linked-campaigns-empty">
                  No campaigns linked yet. Add a Campaign ID to link this
                  character to a campaign.
                </p>
              )}
            </section>

            {/* Export PDF Button */}
            <div className="character-form__actions">
              <button
                type="button"
                className="character-form__export-pdf"
                onClick={handleExportPDF}
                disabled={exportingPDF || loading}
              >
                {exportingPDF ? "Exporting..." : "Export PDF"}
              </button>
            </div>

            {/* Submit Buttons */}
            <div className="character-form__actions">
              <button
                type="submit"
                className="character-form__submit"
                disabled={loading || exportingPDF}
              >
                {loading ? "Creating..." : "Create Character"}
              </button>
              <button
                type="button"
                className="character-form__cancel"
                onClick={() => navigate("/characters")}
                disabled={loading || exportingPDF}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateCharacter;
