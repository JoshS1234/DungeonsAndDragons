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

        // Verify the campaign belongs to the current user
        if (campaignData.userId !== auth.currentUser.uid) {
          throw new Error("You don't have permission to view this campaign");
        }

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
          <h2>Edit Campaign: {formData.campaignName || "Unnamed"}</h2>
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
                  rows={4}
                  placeholder="World-building details, locations, important places..."
                />
              </div>
              <div className="campaign-form__group">
                <label htmlFor="notes">DM Notes</label>
                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={6}
                  placeholder="Private notes, plot ideas, NPCs, future plans..."
                />
              </div>
            </section>

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
          </form>
        </div>
      </div>
    </div>
  );
};

export default ViewEditCampaign;
