import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../../firebaseSetup";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import Header from "../../components/Header/Header";
import "./CreateCampaign.scss";

const CreateCampaign = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (!auth.currentUser) {
        throw new Error("You must be logged in to create a campaign");
      }

      const campaignData = {
        ...formData,
        userId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await addDoc(collection(db, "campaigns"), campaignData);
      navigate("/campaigns");
    } catch (err: any) {
      setError(err.message || "Failed to create campaign");
      console.error("Error creating campaign:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <Header />
      <div className="campaign-creation-page">
        <div className="campaign-creation-page__container">
          <h2>Create New Campaign</h2>
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
                  <label htmlFor="startDate">Start Date</label>
                  <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleInputChange}
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
                disabled={loading}
              >
                {loading ? "Creating..." : "Create Campaign"}
              </button>
              <button
                type="button"
                className="campaign-form__cancel"
                onClick={() => navigate("/campaigns")}
                disabled={loading}
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

export default CreateCampaign;

