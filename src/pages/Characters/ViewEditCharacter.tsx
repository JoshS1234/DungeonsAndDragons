import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db, storage } from "../../../firebaseSetup";
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";
import Header from "../../components/Header/Header";
import "./CreateCharacter.scss";

const ViewEditCharacter = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
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

  useEffect(() => {
    const fetchCharacter = async () => {
      if (!id || !auth.currentUser) {
        setError("Character ID missing or user not authenticated");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const characterDoc = await getDoc(doc(db, "characters", id));
        
        if (!characterDoc.exists()) {
          throw new Error("Character not found");
        }

        const characterData = characterDoc.data();

        // Check if user owns the character
        const isOwner = characterData.userId === auth.currentUser.uid;
        
        // Check if character is linked to a campaign owned by the current user (DM view)
        let isDmOfLinkedCampaign = false;
        if (!isOwner && characterData.campaignIds && characterData.campaignIds.length > 0) {
          const campaignChecks = await Promise.all(
            characterData.campaignIds.map(async (campaignId: string) => {
              try {
                const campaignDoc = await getDoc(doc(db, "campaigns", campaignId));
                if (campaignDoc.exists()) {
                  return campaignDoc.data().userId === auth.currentUser.uid;
                }
                return false;
              } catch {
                return false;
              }
            })
          );
          isDmOfLinkedCampaign = campaignChecks.some((isDm) => isDm);
        }

        // Allow viewing if user owns the character OR is DM of a linked campaign
        if (!isOwner && !isDmOfLinkedCampaign) {
          throw new Error("You don't have permission to view this character");
        }

        setCanEdit(isOwner);

        // Populate form with character data
        setFormData({
          characterName: characterData.characterName || "",
          class: characterData.class || "",
          level: characterData.level || 1,
          background: characterData.background || "",
          playerName: characterData.playerName || "",
          race: characterData.race || "",
          alignment: characterData.alignment || "",
          experiencePoints: characterData.experiencePoints || 0,
          strength: characterData.strength || 10,
          dexterity: characterData.dexterity || 10,
          constitution: characterData.constitution || 10,
          intelligence: characterData.intelligence || 10,
          wisdom: characterData.wisdom || 10,
          charisma: characterData.charisma || 10,
          armorClass: characterData.armorClass || 10,
          initiative: characterData.initiative || 0,
          speed: characterData.speed || 30,
          maxHitPoints: characterData.maxHitPoints || 8,
          currentHitPoints: characterData.currentHitPoints || 8,
          temporaryHitPoints: characterData.temporaryHitPoints || 0,
          hitDice: characterData.hitDice || "1d8",
          proficiencyBonus: characterData.proficiencyBonus || 2,
          savingThrowProficiencies: characterData.savingThrowProficiencies || [],
          skillProficiencies: characterData.skillProficiencies || [],
          personalityTraits: characterData.personalityTraits || "",
          ideals: characterData.ideals || "",
          bonds: characterData.bonds || "",
          flaws: characterData.flaws || "",
          characterAppearance: characterData.characterAppearance || "",
          alliesAndOrganizations: characterData.alliesAndOrganizations || "",
          additionalFeaturesAndTraits: characterData.additionalFeaturesAndTraits || "",
          equipment: characterData.equipment || "",
          spells: characterData.spells || "",
          campaignIds: characterData.campaignIds || [],
        });

        // Fetch campaign names for linked campaigns
        if (characterData.campaignIds && characterData.campaignIds.length > 0) {
          const campaignPromises = characterData.campaignIds.map(
            async (campaignId: string) => {
              try {
                const campaignDoc = await getDoc(doc(db, "campaigns", campaignId));
                if (campaignDoc.exists()) {
                  return {
                    id: campaignId,
                    name: campaignDoc.data().campaignName || "Unnamed Campaign",
                  };
                }
                return { id: campaignId, name: "Campaign Not Found" };
              } catch {
                return { id: campaignId, name: "Campaign Not Found" };
              }
            }
          );
          const campaigns = await Promise.all(campaignPromises);
          setLinkedCampaigns(campaigns);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load character");
        console.error("Error fetching character:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCharacter();
  }, [id]);

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

      if (!auth.currentUser || !id) {
        throw new Error("User not authenticated or character ID missing");
      }

      // Validate campaign exists
      const campaignDoc = await getDoc(doc(db, "campaigns", campaignId));
      if (!campaignDoc.exists()) {
        throw new Error("Campaign not found. Please check the Campaign ID.");
      }

      const campaignData = campaignDoc.data();
      const updatedCampaignIds = [...formData.campaignIds, campaignId];

      // Prepare player info for campaign
      const playerInfo = {
        userId: auth.currentUser.uid,
        characterId: id,
        characterName: formData.characterName || "Unnamed Character",
        playerName: formData.playerName || auth.currentUser.displayName || auth.currentUser.email || "Unknown Player",
      };

      // Update both campaign's players array and character's campaignIds array
      await Promise.all([
        updateDoc(doc(db, "campaigns", campaignId), {
          players: arrayUnion(playerInfo),
          updatedAt: serverTimestamp(),
        }),
        updateDoc(doc(db, "characters", id), {
          campaignIds: updatedCampaignIds,
          updatedAt: serverTimestamp(),
        }),
      ]);

      // Update character's campaignIds array in local state
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

  const handleUnlinkCampaign = async (campaignId: string) => {
    if (!auth.currentUser || !id) {
      setError("User not authenticated or character ID missing");
      return;
    }

    try {
      // Get current campaign data
      const campaignDoc = await getDoc(doc(db, "campaigns", campaignId));
      if (!campaignDoc.exists()) {
        throw new Error("Campaign not found");
      }

      const campaignData = campaignDoc.data();
      const currentPlayers = campaignData.players || [];

      // Filter out this character from players array
      const updatedPlayers = currentPlayers.filter(
        (player: any) => !(player.characterId === id && player.userId === auth.currentUser?.uid)
      );

      const updatedCampaignIds = formData.campaignIds.filter((cid) => cid !== campaignId);

      // Remove from both campaign's players array and character's campaignIds array
      await Promise.all([
        updateDoc(doc(db, "campaigns", campaignId), {
          players: updatedPlayers,
          updatedAt: serverTimestamp(),
        }),
        updateDoc(doc(db, "characters", id), {
          campaignIds: updatedCampaignIds,
          updatedAt: serverTimestamp(),
        }),
      ]);

      // Update local state
      setFormData((prev) => ({
        ...prev,
        campaignIds: updatedCampaignIds,
      }));
      setLinkedCampaigns(
        linkedCampaigns.filter((campaign) => campaign.id !== campaignId)
      );
    } catch (err: any) {
      setError(err.message || "Failed to unlink campaign");
      console.error("Error unlinking campaign:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    setError(null);

    try {
      if (!auth.currentUser) {
        throw new Error("You must be logged in to update a character");
      }

      const characterData = {
        ...formData,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "characters", id), characterData);
      navigate("/characters");
    } catch (err: any) {
      setError(err.message || "Failed to update character");
      console.error("Error updating character:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !auth.currentUser) return;

    // Verify confirmation name matches
    if (deleteConfirmName !== formData.characterName) {
      setError("Character name does not match. Please enter the exact character name to confirm deletion.");
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      // Get character data to handle cleanup
      const characterDoc = await getDoc(doc(db, "characters", id));
      if (!characterDoc.exists()) {
        throw new Error("Character not found");
      }

      const characterData = characterDoc.data();

      // Remove character from all linked campaigns
      if (characterData.campaignIds && Array.isArray(characterData.campaignIds)) {
        const campaignUpdatePromises = characterData.campaignIds.map(
          async (campaignId: string) => {
            try {
              const campaignDoc = await getDoc(doc(db, "campaigns", campaignId));
              if (campaignDoc.exists()) {
                const campaignData = campaignDoc.data();
                const players = campaignData.players || [];
                const updatedPlayers = players.filter(
                  (p: any) => !(p.characterId === id && p.userId === auth.currentUser?.uid)
                );

                if (updatedPlayers.length !== players.length) {
                  await updateDoc(doc(db, "campaigns", campaignId), {
                    players: updatedPlayers,
                    updatedAt: serverTimestamp(),
                  });
                }
              }
            } catch (err) {
              console.error(`Error removing character from campaign ${campaignId}:`, err);
              // Continue with deletion even if campaign update fails
            }
          }
        );
        await Promise.all(campaignUpdatePromises);
      }

      // Delete character image from storage if it exists
      if (characterData.imageUrl) {
        try {
          // Extract the file path from the URL
          const urlParts = characterData.imageUrl.split("/");
          const imagePathIndex = urlParts.findIndex((part: string) => part === "o");
          if (imagePathIndex !== -1 && imagePathIndex < urlParts.length - 1) {
            const encodedPath = urlParts.slice(imagePathIndex + 1).join("/");
            const decodedPath = decodeURIComponent(encodedPath).split("?")[0];
            const imageRef = ref(storage, decodedPath);
            await deleteObject(imageRef);
          }
        } catch (err) {
          console.error("Error deleting character image:", err);
          // Continue with character deletion even if image deletion fails
        }
      }

      // Delete the character document
      await deleteDoc(doc(db, "characters", id));

      // Navigate back to characters list
      navigate("/characters");
    } catch (err: any) {
      setError(err.message || "Failed to delete character");
      console.error("Error deleting character:", err);
      setDeleting(false);
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

  if (loading) {
    return (
      <div className="app">
        <Header />
        <div className="character-creation-page">
          <div className="character-creation-page__container">
            <h2>Loading Character...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header />
      <div className="character-creation-page">
        <div className="character-creation-page__container">
          <h2>{canEdit ? "Edit Character" : "View Character"}: {formData.characterName || "Unnamed"}</h2>
          {!canEdit && (
            <p style={{ color: "#ffd700", fontStyle: "italic", marginBottom: "1rem" }}>
              View-only mode: This character is linked to one of your campaigns
            </p>
          )}
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
                    disabled={!canEdit}
                    disabled={!canEdit}
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
                    disabled={!canEdit}
                    disabled={!canEdit}
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
                    disabled={!canEdit}
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
                    disabled={!canEdit}
                    disabled={!canEdit}
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
                    disabled={!canEdit}
                  />
                </div>
                <div className="character-form__group">
                  <label htmlFor="alignment">Alignment</label>
                  <select
                    id="alignment"
                    name="alignment"
                    value={formData.alignment}
                    onChange={handleInputChange}
                    disabled={!canEdit}
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
                    disabled={!canEdit}
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
                    disabled={!canEdit}
                    min="0"
                  />
                </div>
              </div>
            </section>

            {/* Ability Scores Section */}
            <section className="character-form__section">
              <h3>Ability Scores</h3>
              <div className="character-form__grid character-form__grid--3">
                {abilities.map((ability) => {
                  const score =
                    formData[ability.key as keyof typeof formData] as number;
                  const modifier = calculateModifier(score);
                  return (
                    <div key={ability.key} className="ability-score-group">
                      <label htmlFor={ability.key}>
                        {ability.name} ({ability.abbrev})
                      </label>
                      <input
                        type="number"
                        id={ability.key}
                        name={ability.key}
                        value={score}
                        onChange={(e) =>
                          handleNumberChange(
                            ability.key,
                            parseInt(e.target.value) || 10
                          )
                        }
                        disabled={!canEdit}
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
                    value={formData.armorClass}
                    onChange={(e) =>
                      handleNumberChange(
                        "armorClass",
                        parseInt(e.target.value) || 10
                      )
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div className="character-form__group">
                  <label htmlFor="initiative">Initiative</label>
                  <input
                    type="number"
                    id="initiative"
                    name="initiative"
                    value={formData.initiative}
                    onChange={(e) =>
                      handleNumberChange(
                        "initiative",
                        parseInt(e.target.value) || 0
                      )
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div className="character-form__group">
                  <label htmlFor="speed">Speed</label>
                  <input
                    type="number"
                    id="speed"
                    name="speed"
                    value={formData.speed}
                    onChange={(e) =>
                      handleNumberChange(
                        "speed",
                        parseInt(e.target.value) || 30
                      )
                    }
                    disabled={!canEdit}
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
                    disabled={!canEdit}
                    placeholder="1d8"
                  />
                </div>
                <div className="character-form__group">
                  <label htmlFor="maxHitPoints">Max Hit Points</label>
                  <input
                    type="number"
                    id="maxHitPoints"
                    name="maxHitPoints"
                    value={formData.maxHitPoints}
                    onChange={(e) =>
                      handleNumberChange(
                        "maxHitPoints",
                        parseInt(e.target.value) || 8
                      )
                    }
                    disabled={!canEdit}
                  />
                </div>
                <div className="character-form__group">
                  <label htmlFor="currentHitPoints">Current Hit Points</label>
                  <input
                    type="number"
                    id="currentHitPoints"
                    name="currentHitPoints"
                    value={formData.currentHitPoints}
                    onChange={(e) =>
                      handleNumberChange(
                        "currentHitPoints",
                        parseInt(e.target.value) || 8
                      )
                    }
                    disabled={!canEdit}
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
                    value={formData.temporaryHitPoints}
                    onChange={(e) =>
                      handleNumberChange(
                        "temporaryHitPoints",
                        parseInt(e.target.value) || 0
                      )
                    }
                    disabled={!canEdit}
                    min="0"
                  />
                </div>
                <div className="character-form__group">
                  <label htmlFor="proficiencyBonus">Proficiency Bonus</label>
                  <input
                    type="number"
                    id="proficiencyBonus"
                    name="proficiencyBonus"
                    value={formData.proficiencyBonus}
                    onChange={(e) =>
                      handleNumberChange(
                        "proficiencyBonus",
                        parseInt(e.target.value) || 2
                      )
                    }
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
                      disabled={!canEdit}
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
                      checked={formData.skillProficiencies.includes(
                        skill.name
                      )}
                      onChange={() =>
                        handleCheckboxChange("skill", skill.name)
                      }
                      disabled={!canEdit}
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
                    disabled={!canEdit}
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
                    disabled={!canEdit}
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
                    disabled={!canEdit}
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
                    disabled={!canEdit}
                    rows={4}
                  />
                </div>
              </div>
            </section>

            {/* Additional Information Section */}
            <section className="character-form__section">
              <h3>Additional Information</h3>
              <div className="character-form__group">
                <label htmlFor="characterAppearance">Character Appearance</label>
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

            {/* Campaign Linking Section - Only show if user can edit */}
            {canEdit && (
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
                      <div key={campaign.id} className="linked-campaigns-list__item">
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
            )}

            {/* Submit Buttons - Only show if user can edit */}
            {canEdit && (
            <div className="character-form__actions">
              <button
                type="submit"
                className="character-form__submit"
                disabled={saving || deleting}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                className="character-form__cancel"
                onClick={() => navigate("/characters")}
                disabled={saving || deleting}
              >
                Cancel
              </button>
              <button
                type="button"
                className="character-form__delete"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving || deleting}
              >
                Delete Character
              </button>
            </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && canEdit && (
              <div className="delete-confirm-modal">
                <div className="delete-confirm-modal__overlay" onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmName("");
                  setError(null);
                }} />
                <div className="delete-confirm-modal__content">
                  <h3>Delete Character</h3>
                  <p>This action cannot be undone. This will permanently delete your character and remove them from all linked campaigns.</p>
                  <p>To confirm, please enter the character name: <strong>{formData.characterName}</strong></p>
                  <input
                    type="text"
                    className="delete-confirm-modal__input"
                    value={deleteConfirmName}
                    onChange={(e) => setDeleteConfirmName(e.target.value)}
                    placeholder="Enter character name to confirm"
                    autoFocus
                  />
                  {error && <div className="delete-confirm-modal__error">{error}</div>}
                  <div className="delete-confirm-modal__actions">
                    <button
                      type="button"
                      className="delete-confirm-modal__cancel"
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmName("");
                        setError(null);
                      }}
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="delete-confirm-modal__confirm"
                      onClick={handleDelete}
                      disabled={deleting || deleteConfirmName !== formData.characterName}
                    >
                      {deleting ? "Deleting..." : "Delete Character"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ViewEditCharacter;

