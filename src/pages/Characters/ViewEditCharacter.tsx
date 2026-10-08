import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useCurrentUser } from "../../auth/currentUser";
import CharacterFormFields from "../../components/CharacterForm/CharacterFormFields";
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
} from "../../services/characters";
import type { LinkedCampaign } from "../../services/characters";
import { fillCharacterPDF } from "../../utils/fillCharacterPDF";
import { DEFAULT_CHARACTER } from "../../utils/dnd";
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
  const [canEdit, setCanEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [formData, setFormData] = useState<CharacterData>(DEFAULT_CHARACTER);
  const [linkedCampaigns, setLinkedCampaigns] = useState<LinkedCampaign[]>([]);

  useEffect(() => {
    const fetchCharacter = async () => {
      try {
        setLoading(true);
        setError(null);

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
        setError(
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
  ) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handleLinkCampaign = async (campaignId: string) => {
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
    if (deleteConfirmName !== formData.characterName) {
      setError(
        "Character name does not match. Please enter the exact character name to confirm deletion."
      );
      return;
    }

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
    setDeleteConfirmName("");
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

  return (
    <div className="character-creation-page">
      <div className="character-creation-page__container">
        <div className="page-title-row">
          <h2>
            {canEdit ? "Edit Character" : "View Character"}:{" "}
            {formData.characterName || "Unnamed"}
          </h2>
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
            <div className="delete-confirm-modal">
              <div
                className="delete-confirm-modal__overlay"
                onClick={closeDeleteConfirm}
              />
              <div className="delete-confirm-modal__content">
                <h3>Delete Character</h3>
                <p>
                  This action cannot be undone. This will permanently delete
                  your character and remove them from all linked campaigns.
                </p>
                <p>
                  To confirm, please enter the character name:{" "}
                  <strong>{formData.characterName}</strong>
                </p>
                <input
                  type="text"
                  className="delete-confirm-modal__input"
                  value={deleteConfirmName}
                  onChange={(e) => setDeleteConfirmName(e.target.value)}
                  placeholder="Enter character name to confirm"
                  autoFocus
                />
                {error && (
                  <div className="delete-confirm-modal__error">{error}</div>
                )}
                <div className="delete-confirm-modal__actions">
                  <button
                    type="button"
                    className="delete-confirm-modal__cancel"
                    onClick={closeDeleteConfirm}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="delete-confirm-modal__confirm"
                    onClick={handleDelete}
                    disabled={
                      deleting || deleteConfirmName !== formData.characterName
                    }
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
  );
};

export default ViewEditCharacter;
