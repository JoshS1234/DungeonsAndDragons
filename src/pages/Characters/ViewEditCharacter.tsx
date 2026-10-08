import { useState, useEffect } from "react";
import { Link, useNavigate, useParams, useLocation } from "react-router-dom";
import { useCurrentUser } from "../../auth/currentUser";
import CharacterFormFields from "../../components/CharacterForm/CharacterFormFields";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog/ConfirmDeleteDialog";
import QuickRolls from "../../components/Dice/QuickRolls";
import CampaignLinker from "../../components/CharacterForm/CampaignLinker";
import { findJoinableCampaign } from "../../services/campaigns";
import {
  deleteCharacter,
  fallbackPlayerName,
  getCharacter,
  getCharacterCampaigns,
  joinCampaign,
  leaveCampaign,
  updateCharacter,
  MAX_CAMPAIGNS_PER_CHARACTER,
} from "../../services/characters";
import type { LinkedCampaign } from "../../services/characters";
import { fillCharacterPDF } from "../../utils/fillCharacterPDF";
import { DEFAULT_CHARACTER, derivedChanges } from "../../utils/dnd";
import type { CharacterData } from "../../utils/dnd";
import "./CreateCharacter.scss";
import { errorMessage, isPermissionDenied } from "../../utils/errors";

const ViewEditCharacter = () => {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
  const characterId = id!;
  const campaignIdFromState = (location.state as { fromCampaign?: string })
    ?.fromCampaign;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the page can't be shown at all (not found / no access)
  const [loadError, setLoadError] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState<CharacterData>(DEFAULT_CHARACTER);
  const [linkedCampaigns, setLinkedCampaigns] = useState<LinkedCampaign[]>([]);

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        const stored = await getCharacter(characterId);
        if (!stored) {
          throw new Error("Character not found");
        }

        const isOwner = stored.userId === user.uid;
        setCanEdit(isOwner);
        setFormData(stored.character);
        if (isOwner) {
          setLinkedCampaigns(
            await getCharacterCampaigns(characterId, user.uid)
          );
        }
      } catch (err) {
        setLoadError(
          isPermissionDenied(err)
            ? "You don't have permission to view this character"
            : errorMessage(err, "Failed to load character")
        );
        console.error("Error fetching character:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCharacter();
  }, [characterId, user.uid]);

  const setField = <K extends keyof CharacterData>(
    key: K,
    value: CharacterData[K]
  ) =>
    setFormData((prev) => ({
      ...prev,
      [key]: value,
      // e.g. proficiency bonus follows level unless it's been overridden
      ...derivedChanges(prev, key, value),
    }));

  const handleLinkCampaign = async (campaignId: string) => {
    if (formData.campaignIds.length >= MAX_CAMPAIGNS_PER_CHARACTER) {
      setError(
        `A character can be in at most ${MAX_CAMPAIGNS_PER_CHARACTER} campaigns.`
      );
      return false;
    }
    try {
      setError(null);
      const summary = await findJoinableCampaign(campaignId, user.uid);
      await joinCampaign(
        characterId,
        user.uid,
        campaignId,
        formData,
        fallbackPlayerName(user)
      );

      setField("campaignIds", [...formData.campaignIds, campaignId]);
      setLinkedCampaigns((prev) => [
        ...prev,
        { id: campaignId, name: summary.campaignName || "Unnamed Campaign" },
      ]);
      return true;
    } catch (err) {
      setError(errorMessage(err, "Failed to link campaign"));
      console.error("Error linking campaign:", err);
      return false;
    }
  };

  const handleUnlinkCampaign = async (campaignId: string) => {
    try {
      await leaveCampaign(characterId, user.uid, campaignId);
      setField(
        "campaignIds",
        formData.campaignIds.filter((cid) => cid !== campaignId)
      );
      setLinkedCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
    } catch (err) {
      setError(errorMessage(err, "Failed to unlink campaign"));
      console.error("Error unlinking campaign:", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await updateCharacter(
        characterId,
        user.uid,
        formData,
        fallbackPlayerName(user)
      );
      navigate("/characters");
    } catch (err) {
      setError(errorMessage(err, "Failed to update character"));
      console.error("Error updating character:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);

    try {
      await deleteCharacter(characterId, user.uid);
      navigate("/characters");
    } catch (err) {
      setError(errorMessage(err, "Failed to delete character"));
      console.error("Error deleting character:", err);
      setDeleting(false);
    }
  };

  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
    setError(null);
  };

  const handleExportPDF = async () => {
    setExportingPDF(true);
    setError(null);

    try {
      await fillCharacterPDF(formData);
    } catch (err) {
      setError(errorMessage(err, "Failed to export PDF"));
      console.error("Error exporting PDF:", err);
    } finally {
      setExportingPDF(false);
    }
  };

  const busy = saving || deleting || exportingPDF;

  if (loading) {
    return (
      <div className="character-creation-page">
        <div className="character-creation-page__container">
          <h2>Loading Character...</h2>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="character-creation-page">
        <div className="character-creation-page__container">
          <h2>Character unavailable</h2>
          <div className="character-form__error" role="alert">
            {loadError}
          </div>
          <button
            type="button"
            className="back-button"
            onClick={() => navigate("/characters")}
          >
            ← Back to Characters
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="character-creation-page">
      <div className="character-creation-page__container">
        <div className="page-title-row">
          <h2>
            {canEdit ? "Edit Character" : "View Character"}:{" "}
            {formData.characterName || "Unnamed"}
          </h2>
          <Link to={`/characters/${characterId}/play`} className="back-button">
            ▶ Play mode
          </Link>
          {campaignIdFromState && (
            <button
              type="button"
              onClick={() => navigate(`/campaigns/${campaignIdFromState}`)}
              className="back-button"
            >
              ← Back to Campaign
            </button>
          )}
        </div>
        {!canEdit && (
          <p className="view-only-note">
            View-only mode: This character is linked to a campaign you're part
            of
          </p>
        )}
        {error && <div className="character-form__error">{error}</div>}
        <details className="character-form__section quick-rolls-panel">
          <summary>
            <h3>🎲 Quick rolls</h3>
          </summary>
          <QuickRolls character={formData} />
        </details>
        <form onSubmit={handleSubmit} className="character-form">
          <CharacterFormFields
            character={formData}
            onFieldChange={setField}
            disabled={!canEdit}
          />

          {canEdit && (
            <CampaignLinker
              linkedCampaigns={linkedCampaigns}
              onLink={handleLinkCampaign}
              onUnlink={handleUnlinkCampaign}
            />
          )}

          <div className="character-form__actions">
            <button
              type="button"
              className="character-form__export-pdf"
              onClick={handleExportPDF}
              disabled={busy}
            >
              {exportingPDF ? "Exporting..." : "Export PDF"}
            </button>
          </div>

          {canEdit && (
            <div className="character-form__actions">
              <button
                type="submit"
                className="character-form__submit"
                disabled={busy}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                className="character-form__cancel"
                onClick={() => navigate("/characters")}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="character-form__delete"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={busy}
              >
                Delete Character
              </button>
            </div>
          )}

          {showDeleteConfirm && canEdit && (
            <ConfirmDeleteDialog
              title="Delete Character"
              description="This action cannot be undone. This will permanently delete your character and remove them from all linked campaigns."
              confirmName={formData.characterName}
              deleting={deleting}
              error={error}
              onConfirm={handleDelete}
              onCancel={closeDeleteConfirm}
            />
          )}
        </form>
      </div>
    </div>
  );
};

export default ViewEditCharacter;
