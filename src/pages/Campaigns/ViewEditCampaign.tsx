import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth } from "../../../firebaseSetup";
import Header from "../../components/Header/Header";
import NumberInput from "../../components/NumberInput/NumberInput";
import {
  DEFAULT_CAMPAIGN,
  getCampaign,
  removePlayer,
  updateCampaign,
} from "../../services/campaigns";
import type { CampaignMember } from "../../services/campaigns";
import { leaveCampaign } from "../../services/characters";
import { formatDateInput } from "../../utils/formatDateInput";
import "./CreateCampaign.scss";

const ViewEditCampaign = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const campaignId = id!;
  const user = auth.currentUser!;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...DEFAULT_CAMPAIGN, notes: "" });
  const [linkedPlayers, setLinkedPlayers] = useState<CampaignMember[]>([]);
  const [removingPlayer, setRemovingPlayer] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    const fetchCampaign = async () => {
      try {
        setLoading(true);
        setError(null);

        const loaded = await getCampaign(campaignId, user.uid);
        if (!loaded) {
          throw new Error("Campaign not found");
        }

        const { campaign, isDm, players, notes } = loaded;
        const { id: _id, userId: _userId, ...details } = campaign;
        setCanEdit(isDm);
        setFormData({ ...details, notes });
        setLinkedPlayers(players);
      } catch (err: any) {
        setError(
          err.code === "permission-denied"
            ? "You don't have permission to view this campaign"
            : err.message || "Failed to load campaign"
        );
        console.error("Error fetching campaign:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [campaignId, user.uid]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "startDate" ? formatDateInput(value) : value,
    }));
  };

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
    } catch (err: any) {
      setError(err.message || "Failed to remove player from campaign");
      console.error("Error removing player:", err);
    } finally {
      setRemovingPlayer(null);
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
    } catch (err: any) {
      setError(err.message || "Failed to update campaign");
      console.error("Error updating campaign:", err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="app">
        <Header />
        <div className="campaign-creation-page">
          <div className="campaign-creation-page__container">
            <h2>Loading Campaign...</h2>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Header />
      <div className="campaign-creation-page">
        <div className="campaign-creation-page__container">
          <div className="page-title-row">
            <h2>
              {canEdit ? "Edit Campaign" : "View Campaign"}:{" "}
              {formData.campaignName || "Unnamed"}
            </h2>
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
            <section className="campaign-form__section">
              <h3>Campaign Information</h3>
              <div className="campaign-form__grid campaign-form__grid--2">
                <div className="campaign-form__group">
                  <label htmlFor="campaignName">Campaign Name *</label>
                  <input
                    type="text"
                    id="campaignName"
                    name="campaignName"
                    value={formData.campaignName}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    required
                    placeholder="Enter campaign name"
                  />
                </div>
                <div className="campaign-form__group">
                  <label htmlFor="dungeonMaster">Dungeon Master</label>
                  <input
                    type="text"
                    id="dungeonMaster"
                    name="dungeonMaster"
                    value={formData.dungeonMaster}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    placeholder="DM name"
                  />
                </div>
                <div className="campaign-form__group">
                  <label htmlFor="setting">Setting / World</label>
                  <input
                    type="text"
                    id="setting"
                    name="setting"
                    value={formData.setting}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    placeholder="e.g., Forgotten Realms, Homebrew"
                  />
                </div>
                <div className="campaign-form__group">
                  <label htmlFor="currentLevel">Current Party Level</label>
                  <NumberInput
                    id="currentLevel"
                    name="currentLevel"
                    value={formData.currentLevel}
                    onChange={(currentLevel) =>
                      setFormData((prev) => ({ ...prev, currentLevel }))
                    }
                    fallback={1}
                    min={1}
                    max={20}
                    disabled={!canEdit}
                  />
                </div>
                <div className="campaign-form__group">
                  <label htmlFor="startDate">Start Date (DD/MM/YYYY)</label>
                  <input
                    type="text"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                    placeholder="DD/MM/YYYY"
                    pattern="^(0[1-9]|[12][0-9]|3[01])/(0[1-9]|1[0-2])/\d{4}$"
                    title="Please enter date in DD/MM/YYYY format"
                  />
                </div>
                <div className="campaign-form__group">
                  <label htmlFor="status">Status</label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    disabled={!canEdit}
                  >
                    <option value="Active">Active</option>
                    <option value="On Hold">On Hold</option>
                    <option value="Completed">Completed</option>
                    <option value="Planning">Planning</option>
                  </select>
                </div>
              </div>
            </section>

            <section className="campaign-form__section">
              <h3>Campaign Details</h3>
              <div className="campaign-form__group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  disabled={!canEdit}
                  rows={6}
                  placeholder="Describe your campaign, its story, and key events..."
                />
              </div>
              <div className="campaign-form__group">
                <label htmlFor="theme">Theme</label>
                <input
                  type="text"
                  id="theme"
                  name="theme"
                  value={formData.theme}
                  onChange={handleInputChange}
                  placeholder="e.g., Mystery, Exploration, Political Intrigue"
                />
              </div>
              <div className="campaign-form__group">
                <label htmlFor="world">World Information</label>
                <textarea
                  id="world"
                  name="world"
                  value={formData.world}
                  onChange={handleInputChange}
                  disabled={!canEdit}
                  rows={4}
                  placeholder="World-building details, locations, important places..."
                />
              </div>
              {canEdit && (
                <div className="campaign-form__group">
                  <label htmlFor="notes">
                    DM Notes{" "}
                    <span className="campaign-form__label-note">
                      *This will not be shown to players*
                    </span>
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={6}
                    placeholder="Private notes, plot ideas, NPCs, future plans..."
                  />
                </div>
              )}
            </section>

            <section className="campaign-form__section">
              <h3>Players</h3>
              <p className="players-info-hint">
                Players are automatically added when they link their characters
                to this campaign using the Campaign ID.
              </p>
              {linkedPlayers.length > 0 ? (
                <div className="players-list">
                  <h4>Linked Players ({linkedPlayers.length})</h4>
                  <div className="players-list__items">
                    {linkedPlayers.map((player) => (
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
                            title={
                              canEdit
                                ? "Remove player from campaign"
                                : "Remove yourself from this campaign"
                            }
                            disabled={removingPlayer === player.userId}
                          >
                            {removingPlayer === player.userId ? "..." : "✕"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="players-empty">
                  No players linked yet. Share the Campaign ID above with
                  players to have them link their characters.
                </p>
              )}
            </section>

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
              </div>
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
    </div>
  );
};

export default ViewEditCampaign;
