import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { auth, db } from "../../../firebaseSetup";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  arrayUnion,
} from "firebase/firestore";
import Header from "../../components/Header/Header";
import CharacterFormFields from "../../components/CharacterForm/CharacterFormFields";
import CampaignLinker from "../../components/CharacterForm/CampaignLinker";
import type { LinkedCampaign } from "../../components/CharacterForm/CampaignLinker";
import { fillCharacterPDF } from "../../utils/fillCharacterPDF";
import { DEFAULT_CHARACTER, normaliseCharacter } from "../../utils/dnd";
import type { CharacterData } from "../../utils/dnd";
import "./CreateCharacter.scss";

type CampaignPlayer = { userId: string; characterId: string };

const ViewEditCharacter = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();
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
        const campaignIds: string[] = characterData.campaignIds || [];
        const userId = auth.currentUser.uid;
        const isOwner = characterData.userId === userId;

        const campaignDocs = await Promise.all(
          campaignIds.map((campaignId) =>
            getDoc(doc(db, "campaigns", campaignId)).catch(() => null)
          )
        );

        // Non-owners can view if they're the DM or a player in a linked campaign
        const canView =
          isOwner ||
          campaignDocs.some((campaignDoc) => {
            if (!campaignDoc?.exists()) return false;
            const campaign = campaignDoc.data();
            const players: CampaignPlayer[] = campaign.players || [];
            return (
              campaign.userId === userId ||
              players.some((p) => p.userId === userId)
            );
          });

        if (!canView) {
          throw new Error("You don't have permission to view this character");
        }

        setCanEdit(isOwner);
        setFormData(normaliseCharacter(characterData));
        setLinkedCampaigns(
          campaignIds.map((campaignId, i) => {
            const campaignDoc = campaignDocs[i];
            return {
              id: campaignId,
              name: campaignDoc?.exists()
                ? campaignDoc.data().campaignName || "Unnamed Campaign"
                : "Campaign Not Found",
            };
          })
        );
      } catch (err: any) {
        setError(err.message || "Failed to load character");
        console.error("Error fetching character:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCharacter();
  }, [id]);

  const setField = <K extends keyof CharacterData>(
    key: K,
    value: CharacterData[K]
  ) => setFormData((prev) => ({ ...prev, [key]: value }));

  const removeFromCampaign = async (campaignId: string) => {
    const campaignDoc = await getDoc(doc(db, "campaigns", campaignId));
    // Nothing to clean up if the campaign has since been deleted
    if (!campaignDoc.exists()) return;

    const players: CampaignPlayer[] = campaignDoc.data().players || [];
    const updatedPlayers = players.filter(
      (p) => !(p.characterId === id && p.userId === auth.currentUser?.uid)
    );
    if (updatedPlayers.length !== players.length) {
      await updateDoc(doc(db, "campaigns", campaignId), {
        players: updatedPlayers,
        updatedAt: serverTimestamp(),
      });
    }
  };

  const handleLinkCampaign = async (campaignId: string) => {
    if (formData.campaignIds.includes(campaignId)) {
      setError("This character is already linked to this campaign");
      return true;
    }

    try {
      setError(null);

      if (!auth.currentUser || !id) {
        throw new Error("User not authenticated or character ID missing");
      }

      const campaignDoc = await getDoc(doc(db, "campaigns", campaignId));
      if (!campaignDoc.exists()) {
        throw new Error("Campaign not found. Please check the Campaign ID.");
      }

      const updatedCampaignIds = [...formData.campaignIds, campaignId];
      const playerInfo = {
        userId: auth.currentUser.uid,
        characterId: id,
        characterName: formData.characterName || "Unnamed Character",
        playerName:
          formData.playerName ||
          auth.currentUser.displayName ||
          auth.currentUser.email ||
          "Unknown Player",
      };

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

      setField("campaignIds", updatedCampaignIds);
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

  const handleUnlinkCampaign = async (campaignId: string) => {
    if (!auth.currentUser || !id) {
      setError("User not authenticated or character ID missing");
      return;
    }

    try {
      const updatedCampaignIds = formData.campaignIds.filter(
        (cid) => cid !== campaignId
      );

      await Promise.all([
        removeFromCampaign(campaignId),
        updateDoc(doc(db, "characters", id), {
          campaignIds: updatedCampaignIds,
          updatedAt: serverTimestamp(),
        }),
      ]);

      setField("campaignIds", updatedCampaignIds);
      setLinkedCampaigns((prev) => prev.filter((c) => c.id !== campaignId));
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

      await updateDoc(doc(db, "characters", id), {
        ...formData,
        updatedAt: serverTimestamp(),
      });
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

    if (deleteConfirmName !== formData.characterName) {
      setError(
        "Character name does not match. Please enter the exact character name to confirm deletion."
      );
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      // Remove the character from linked campaigns, but don't let a failure
      // there block deleting the character itself
      await Promise.all(
        formData.campaignIds.map((campaignId) =>
          removeFromCampaign(campaignId).catch((err) =>
            console.error(
              `Error removing character from campaign ${campaignId}:`,
              err
            )
          )
        )
      );

      await deleteDoc(doc(db, "characters", id));
      navigate("/characters");
    } catch (err: any) {
      setError(err.message || "Failed to delete character");
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
    } catch (err: any) {
      setError(err.message || "Failed to export PDF");
      console.error("Error exporting PDF:", err);
    } finally {
      setExportingPDF(false);
    }
  };

  const busy = saving || deleting || exportingPDF;

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
    </div>
  );
};

export default ViewEditCharacter;
