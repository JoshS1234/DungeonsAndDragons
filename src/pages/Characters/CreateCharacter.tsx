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
import CharacterFormFields from "../../components/CharacterForm/CharacterFormFields";
import CampaignLinker from "../../components/CharacterForm/CampaignLinker";
import type { LinkedCampaign } from "../../components/CharacterForm/CampaignLinker";
import { fillCharacterPDF } from "../../utils/fillCharacterPDF";
import {
  ABILITIES,
  DEFAULT_CHARACTER,
  rollAbilityScores,
} from "../../utils/dnd";
import type { Ability, AbilityKey, CharacterData } from "../../utils/dnd";
import "./CreateCharacter.scss";

type ScoreAssignments = Partial<Record<AbilityKey, number>>;

const CreateCharacter = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CharacterData>(DEFAULT_CHARACTER);
  const [linkedCampaigns, setLinkedCampaigns] = useState<LinkedCampaign[]>([]);
  const [rolledScores, setRolledScores] = useState<number[]>([]);
  // Which rolled score (by index) is assigned to which ability
  const [scoreAssignments, setScoreAssignments] = useState<ScoreAssignments>(
    {}
  );

  const setField = <K extends keyof CharacterData>(
    key: K,
    value: CharacterData[K]
  ) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handleLinkCampaign = async (campaignId: string) => {
    if (formData.campaignIds.includes(campaignId)) {
      setError("This character is already linked to this campaign");
      return true;
    }

    try {
      setError(null);
      const campaignDoc = await getDoc(doc(db, "campaigns", campaignId));
      if (!campaignDoc.exists()) {
        throw new Error("Campaign not found. Please check the Campaign ID.");
      }

      setField("campaignIds", [...formData.campaignIds, campaignId]);
      setLinkedCampaigns((prev) => [
        ...prev,
        {
          id: campaignId,
          name: campaignDoc.data().campaignName || "Unnamed Campaign",
        },
      ]);
      return true;
    } catch (err: any) {
      setError(err.message || "Failed to link campaign");
      console.error("Error linking campaign:", err);
      return false;
    }
  };

  // The character doesn't exist yet, so unlinking only touches local state
  const handleUnlinkCampaign = (campaignId: string) => {
    setField(
      "campaignIds",
      formData.campaignIds.filter((id) => id !== campaignId)
    );
    setLinkedCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
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

      const characterRef = await addDoc(collection(db, "characters"), {
        ...formData,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      if (formData.campaignIds.length > 0) {
        const playerInfo = {
          userId: auth.currentUser.uid,
          characterId: characterRef.id,
          characterName: formData.characterName || "Unnamed Character",
          playerName:
            formData.playerName ||
            auth.currentUser.displayName ||
            auth.currentUser.email ||
            "Unknown Player",
        };

        await Promise.all(
          formData.campaignIds.map((campaignId) =>
            updateDoc(doc(db, "campaigns", campaignId), {
              players: arrayUnion(playerInfo),
              updatedAt: serverTimestamp(),
            })
          )
        );
      }

      navigate("/characters");
    } catch (err: any) {
      setError(err.message || "Failed to create character");
      console.error("Error creating character:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleRollAbilityScores = () => {
    setRolledScores(rollAbilityScores());
    setScoreAssignments({});
  };

  const abilityForScore = (scoreIndex: number) =>
    ABILITIES.find((a) => scoreAssignments[a.key] === scoreIndex);

  const handleAssignScore = (abilityKey: AbilityKey, scoreIndex: number) => {
    // Clicking the score already assigned to this ability unassigns it
    if (scoreAssignments[abilityKey] === scoreIndex) {
      setScoreAssignments((prev) => ({ ...prev, [abilityKey]: undefined }));
      setField(abilityKey, DEFAULT_CHARACTER[abilityKey]);
      return;
    }

    setScoreAssignments((prev) => ({ ...prev, [abilityKey]: scoreIndex }));
    setField(abilityKey, rolledScores[scoreIndex]);
  };

  const hasRolled = rolledScores.length > 0;

  const diceRoller = (
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
      {hasRolled && (
        <div className="rolled-scores-container">
          <p className="rolled-scores-label">
            Rolled Scores (click an ability below to assign):
          </p>
          <div className="rolled-scores-grid">
            {rolledScores.map((score, index) => {
              const assignedTo = abilityForScore(index);
              return (
                <div
                  key={index}
                  className={`rolled-score ${
                    assignedTo ? "rolled-score--assigned" : ""
                  }`}
                  title={
                    assignedTo
                      ? `Assigned to ${assignedTo.name}`
                      : "Click an ability below to assign this score"
                  }
                >
                  {score}
                  {assignedTo && (
                    <span className="rolled-score__assigned-label">
                      → {assignedTo.abbrev}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  const renderAssignButtons = (ability: Ability) =>
    hasRolled && (
      <div className="ability-score-assignments">
        {rolledScores.map((score, scoreIndex) => {
          const assignedTo = abilityForScore(scoreIndex);
          const isAssignedToThis = assignedTo?.key === ability.key;
          const isAssignedToOther = !!assignedTo && !isAssignedToThis;
          const description = isAssignedToThis
            ? `Click to unassign ${score} from ${ability.name}`
            : isAssignedToOther
              ? `${score} is already assigned to ${assignedTo.name}`
              : `Assign ${score} to ${ability.name}`;
          return (
            <button
              key={scoreIndex}
              type="button"
              className={`ability-assign-button ${
                isAssignedToThis
                  ? "ability-assign-button--active"
                  : isAssignedToOther
                    ? "ability-assign-button--disabled"
                    : ""
              }`}
              onClick={() => handleAssignScore(ability.key, scoreIndex)}
              disabled={isAssignedToOther}
              title={description}
              aria-label={description}
            >
              {score}
            </button>
          );
        })}
      </div>
    );

  return (
    <div className="app">
      <Header />
      <div className="character-creation-page">
        <div className="character-creation-page__container">
          <h2>Create New Character</h2>
          {error && <div className="character-form__error">{error}</div>}
          <form onSubmit={handleSubmit} className="character-form">
            <CharacterFormFields
              character={formData}
              onFieldChange={setField}
              abilityScoresHeader={diceRoller}
              renderAbilityControls={renderAssignButtons}
            />

            <CampaignLinker
              linkedCampaigns={linkedCampaigns}
              onLink={handleLinkCampaign}
              onUnlink={handleUnlinkCampaign}
            />

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
