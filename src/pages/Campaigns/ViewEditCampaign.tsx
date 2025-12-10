import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { auth, db } from "../../../firebaseSetup";
import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import Header from "../../components/Header/Header";
import "./CreateCampaign.scss";

const ViewEditCampaign = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    campaignName: "",
    description: "",
    setting: "",
    dungeonMaster: "",
    currentLevel: 1,
    startDate: "",
    status: "Active",
    notes: "",
    world: "",
    theme: "",
  });
  const [linkedPlayers, setLinkedPlayers] = useState<
    Array<{
      userId: string;
      characterId: string;
      characterName: string;
      playerName: string;
    }>
  >([]);
  const [removingPlayer, setRemovingPlayer] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    const fetchCampaign = async () => {
      if (!id || !auth.currentUser) {
        setError("Campaign ID missing or user not authenticated");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const campaignDoc = await getDoc(doc(db, "campaigns", id));

        if (!campaignDoc.exists()) {
          throw new Error("Campaign not found");
        }

        const campaignData = campaignDoc.data();

        if (!auth.currentUser) {
          throw new Error("User not authenticated");
        }

        // Check if user is the owner
        const isOwner = campaignData.userId === auth.currentUser.uid;

        // Check if user is a player in this campaign
        const players = campaignData.players || [];
        const isPlayer = players.some(
          (p: any) => p.userId === auth.currentUser!.uid
        );

        // Allow viewing if user is owner OR player
        if (!isOwner && !isPlayer) {
          throw new Error("You don't have permission to view this campaign");
        }

        setCanEdit(isOwner);

        // Populate form with campaign data
        setFormData({
          campaignName: campaignData.campaignName || "",
          description: campaignData.description || "",
          setting: campaignData.setting || "",
          dungeonMaster: campaignData.dungeonMaster || "",
          currentLevel: campaignData.currentLevel || 1,
          startDate: campaignData.startDate || "",
          status: campaignData.status || "Active",
          notes: campaignData.notes || "",
          world: campaignData.world || "",
          theme: campaignData.theme || "",
        });

        // Fetch linked players from campaign data
        if (campaignData.players && Array.isArray(campaignData.players)) {
          setLinkedPlayers(campaignData.players);
        } else {
          setLinkedPlayers([]);
        }
      } catch (err: any) {
        setError(err.message || "Failed to load campaign");
        console.error("Error fetching campaign:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCampaign();
  }, [id]);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    // Format date input for DD/MM/YYYY
    if (name === "startDate") {
      // Remove all non-numeric characters
      let formattedValue = value.replace(/\D/g, "");

      // Add slashes automatically
      if (formattedValue.length > 2) {
        formattedValue =
          formattedValue.substring(0, 2) + "/" + formattedValue.substring(2);
      }
      if (formattedValue.length > 5) {
        formattedValue =
          formattedValue.substring(0, 5) + "/" + formattedValue.substring(5, 9);
      }

      setFormData((prev) => ({
        ...prev,
        [name]: formattedValue,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleCopyCampaignId = () => {
    if (id) {
      navigator.clipboard.writeText(id);
      // You could add a toast notification here if desired
    }
  };

  const handleRemovePlayer = async (player: {
    userId: string;
    characterId: string;
    characterName: string;
    playerName: string;
  }) => {
    if (!id || !auth.currentUser) return;

    try {
      setRemovingPlayer(player.characterId);
      setError(null);

      // Check if player is removing themselves
      const isRemovingSelf = player.userId === auth.currentUser.uid;

      // Get the character document
      const characterDoc = await getDoc(
        doc(db, "characters", player.characterId)
      );
      if (!characterDoc.exists()) {
        throw new Error("Character not found");
      }

      const characterData = characterDoc.data();
      const currentCampaignIds = characterData.campaignIds || [];

      // Remove this campaign ID from the character's campaignIds array
      const updatedCampaignIds = currentCampaignIds.filter(
        (campaignId: string) => campaignId !== id
      );

      // Remove the player from the campaign's players array
      const updatedPlayers = linkedPlayers.filter(
        (p) =>
          !(p.characterId === player.characterId && p.userId === player.userId)
      );

      // Update both documents
      await Promise.all([
        updateDoc(doc(db, "campaigns", id), {
          players: updatedPlayers,
          updatedAt: serverTimestamp(),
        }),
        updateDoc(doc(db, "characters", player.characterId), {
          campaignIds: updatedCampaignIds,
          updatedAt: serverTimestamp(),
        }),
      ]);

      // If player is removing themselves, redirect to campaigns page
      // since they no longer have access to view this campaign
      if (isRemovingSelf) {
        navigate("/campaigns");
      } else {
        // Update local state
        setLinkedPlayers(updatedPlayers);
      }
    } catch (err: any) {
      setError(err.message || "Failed to remove player from campaign");
      console.error("Error removing player:", err);
      setRemovingPlayer(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;

    setSaving(true);
    setError(null);

    try {
      if (!auth.currentUser) {
        throw new Error("You must be logged in to update a campaign");
      }

      const campaignData = {
        ...formData,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, "campaigns", id), campaignData);
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
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "1rem",
              flexWrap: "wrap",
              gap: "1rem",
            }}
          >
            <h2 style={{ margin: 0 }}>
              {canEdit ? "Edit Campaign" : "View Campaign"}:{" "}
              {formData.campaignName || "Unnamed"}
            </h2>
            <button
              type="button"
              onClick={() => navigate("/campaigns")}
              className="campaign-form__back-button"
              style={{
                padding: "0.5rem 1rem",
                fontSize: "1em",
                fontWeight: 600,
                background: "rgba(139, 0, 0, 0.5)",
                color: "#fff",
                border: "2px solid #ffd700",
                borderRadius: "6px",
                cursor: "pointer",
                transition: "all 0.3s ease",
                fontFamily: '"Cinzel", "Times New Roman", serif',
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(139, 0, 0, 0.7)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(139, 0, 0, 0.5)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              ← Back to Campaigns
            </button>
          </div>
          {!canEdit && (
            <p
              style={{
                color: "#ffd700",
                fontStyle: "italic",
                marginBottom: "1rem",
              }}
            >
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
                  <input
                    type="number"
                    id="currentLevel"
                    name="currentLevel"
                    value={formData.currentLevel}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        currentLevel: parseInt(e.target.value) || 1,
                      }))
                    }
                    disabled={!canEdit}
                    min="1"
                    max="20"
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
                    <span
                      style={{
                        fontSize: "0.85em",
                        fontStyle: "italic",
                        color: "#ffd700",
                      }}
                    >
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
                      <div
                        key={`${player.userId}-${player.characterId}`}
                        className="players-list__item"
                      >
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
                        {(canEdit ||
                          (auth.currentUser &&
                            player.userId === auth.currentUser.uid)) && (
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
                            disabled={removingPlayer === player.characterId}
                          >
                            {removingPlayer === player.characterId
                              ? "..."
                              : "✕"}
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
