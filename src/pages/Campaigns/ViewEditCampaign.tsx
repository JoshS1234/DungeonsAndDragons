import { useState, useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useCurrentUser } from "../../auth/currentUser";
import {
  DEFAULT_CAMPAIGN,
  deleteCampaign,
  getCampaign,
  removePlayer,
  updateCampaign,
} from "../../services/campaigns";
import type { CampaignMember } from "../../services/campaigns";
import { leaveCampaign } from "../../services/characters";
import SessionLog from "../../components/Sessions/SessionLog";
import ConfirmDeleteDialog from "../../components/ConfirmDeleteDialog/ConfirmDeleteDialog";
import CampaignFormFields from "../../components/CampaignForm/CampaignFormFields";
import type { CampaignFormValues } from "../../components/CampaignForm/CampaignFormFields";
import "./CreateCampaign.scss";
import { errorMessage, isPermissionDenied } from "../../utils/errors";

const ViewEditCampaign = () => {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const campaignId = id!;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Set when the page can't be shown at all (not found / no access)
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...DEFAULT_CAMPAIGN, notes: "" });
  const [linkedPlayers, setLinkedPlayers] = useState<CampaignMember[]>([]);
  const [removingPlayer, setRemovingPlayer] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        setLoading(true);
        setLoadError(null);

        const loaded = await getCampaign(campaignId, user.uid);
        if (!loaded) {
          throw new Error("Campaign not found");
        }

        const { campaign, isDm, players, notes } = loaded;
        const { id: _id, userId: _userId, ...details } = campaign;
        setCanEdit(isDm);
        setFormData({ ...details, notes });
        setLinkedPlayers(players);
      } catch (err) {
        setLoadError(
          isPermissionDenied(err)
            ? "You don't have permission to view this campaign"
            : errorMessage(err, "Failed to load campaign")
        );
        console.error("Error fetching campaign:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [campaignId, user.uid]);

  const setField = <K extends keyof CampaignFormValues>(
    key: K,
    value: CampaignFormValues[K]
  ) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handleCopyCampaignId = () => {
    navigator.clipboard.writeText(campaignId);
  };

  const handleRemovePlayer = async (player: CampaignMember) => {
    const isRemovingSelf = player.userId === user.uid;

    try {
      setRemovingPlayer(player.userId);
      setError(null);

      if (isRemovingSelf) {
        await leaveCampaign(player.characterId!, user.uid, campaignId);
        // They no longer have access to this campaign
        navigate("/campaigns");
        return;
      }

      await removePlayer(campaignId, player.userId);
      setLinkedPlayers((prev) =>
        prev.filter((p) => p.userId !== player.userId)
      );
    } catch (err) {
      setError(errorMessage(err, "Failed to remove player from campaign"));
      console.error("Error removing player:", err);
    } finally {
      setRemovingPlayer(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError(null);
    try {
      await deleteCampaign(campaignId);
      navigate("/campaigns");
    } catch (err) {
      setError(errorMessage(err, "Failed to delete campaign"));
      console.error("Error deleting campaign:", err);
      setDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const { notes, ...details } = formData;
      await updateCampaign(campaignId, user.uid, details, notes);
      navigate("/campaigns");
    } catch (err) {
      setError(errorMessage(err, "Failed to update campaign"));
      console.error("Error updating campaign:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="campaign-creation-page">
        <div className="campaign-creation-page__container">
          <h2>Loading Campaign...</h2>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="campaign-creation-page">
        <div className="campaign-creation-page__container">
          <h2>Campaign unavailable</h2>
          <div className="campaign-form__error" role="alert">
            {loadError}
          </div>
          <button
            type="button"
            className="back-button"
            onClick={() => navigate("/campaigns")}
          >
            ← Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="campaign-creation-page">
      <div className="campaign-creation-page__container">
        <div className="page-title-row">
          <h2>
            {canEdit ? "Edit Campaign" : "View Campaign"}:{" "}
            {formData.campaignName || "Unnamed"}
          </h2>
          <Link to={`/campaigns/${campaignId}/party`} className="back-button">
            ⚔️ Party &amp; initiative
          </Link>
          <button
            type="button"
            onClick={() => navigate("/campaigns")}
            className="back-button"
          >
            ← Back to Campaigns
          </button>
        </div>
        {!canEdit && (
          <p className="view-only-note">
            View-only mode: You are a player in this campaign
          </p>
        )}
        <div className="campaign-id-display">
          <label>Campaign ID:</label>
          <div className="campaign-id-display__container">
            <code className="campaign-id-display__id">{id}</code>
            <button
              type="button"
              onClick={handleCopyCampaignId}
              className="campaign-id-display__copy"
              title="Copy Campaign ID"
            >
              📋 Copy
            </button>
          </div>
          {canEdit && (
            <p className="campaign-id-display__hint">
              Share this ID with players to link them to this campaign
            </p>
          )}
        </div>
        {error && <div className="campaign-form__error">{error}</div>}
        <form onSubmit={handleSubmit} className="campaign-form">
          <CampaignFormFields
            values={formData}
            onFieldChange={setField}
            disabled={!canEdit}
            showNotes={canEdit}
          />

          <section className="campaign-form__section">
            <h3>Players</h3>
            <p className="players-info-hint">
              Players are automatically added when they link their characters to
              this campaign using the Campaign ID.
            </p>
            {linkedPlayers.length > 0 ? (
              <div className="players-list">
                <h4>Linked Players ({linkedPlayers.length})</h4>
                <div className="players-list__items">
                  {linkedPlayers.map((player) => {
                    const removeLabel =
                      player.userId === user.uid
                        ? "Remove yourself from this campaign"
                        : `Remove ${player.characterName} from campaign`;
                    return (
                      <div key={player.userId} className="players-list__item">
                        <div
                          className="players-list__info players-list__info--clickable"
                          onClick={() =>
                            navigate(`/characters/${player.characterId}`, {
                              state: { fromCampaign: id },
                            })
                          }
                          title="Click to view character sheet"
                        >
                          <span className="players-list__name">
                            {player.playerName}
                          </span>
                          <span className="players-list__character">
                            Character: {player.characterName}
                          </span>
                        </div>
                        {(canEdit || player.userId === user.uid) && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePlayer(player);
                            }}
                            className="players-list__remove"
                            title={removeLabel}
                            aria-label={removeLabel}
                            disabled={removingPlayer === player.userId}
                          >
                            {removingPlayer === player.userId ? "..." : "✕"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <p className="players-empty">
                No players linked yet. Share the Campaign ID above with players
                to have them link their characters.
              </p>
            )}
          </section>

          <SessionLog campaignId={campaignId} isDm={canEdit} />

          {canEdit && (
            <div className="campaign-form__actions">
              <button
                type="submit"
                className="campaign-form__submit"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
              <button
                type="button"
                className="campaign-form__cancel"
                onClick={() => navigate("/campaigns")}
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                className="campaign-form__delete"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={saving}
              >
                Delete Campaign
              </button>
            </div>
          )}
          {showDeleteConfirm && canEdit && (
            <ConfirmDeleteDialog
              title="Delete Campaign"
              description="This action cannot be undone. The campaign, its DM notes and every player's membership will be permanently deleted. Players keep their characters."
              confirmName={formData.campaignName}
              deleting={deleting}
              error={error}
              onConfirm={handleDelete}
              onCancel={() => {
                setShowDeleteConfirm(false);
                setError(null);
              }}
            />
          )}
          {!canEdit && (
            <div className="campaign-form__actions">
              <button
                type="button"
                className="campaign-form__cancel"
                onClick={() => navigate("/campaigns")}
              >
                Back to Campaigns
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default ViewEditCampaign;
