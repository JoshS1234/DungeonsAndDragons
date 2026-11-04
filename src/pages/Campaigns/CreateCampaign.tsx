import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCurrentUser } from "../../auth/currentUser";
import { DEFAULT_CAMPAIGN, createCampaign } from "../../services/campaigns";
import CampaignFormFields from "../../components/CampaignForm/CampaignFormFields";
import type { CampaignFormValues } from "../../components/CampaignForm/CampaignFormFields";
import "./CreateCampaign.scss";
import { errorMessage } from "../../utils/errors";

const CreateCampaign = () => {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...DEFAULT_CAMPAIGN, notes: "" });

  const setField = <K extends keyof CampaignFormValues>(
    key: K,
    value: CampaignFormValues[K]
  ) => setFormData((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { notes, ...details } = formData;
      const id = await createCampaign(user.uid, details, notes);
      // Navigate to the view/edit page where the campaign ID will be displayed
      navigate(`/campaigns/${id}`);
    } catch (err) {
      setError(errorMessage(err, "Failed to create campaign"));
      console.error("Error creating campaign:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="campaign-creation-page">
      <div className="campaign-creation-page__container">
        <h2>Create New Campaign</h2>
        {error && <div className="campaign-form__error">{error}</div>}
        <form onSubmit={handleSubmit} className="campaign-form">
          <CampaignFormFields values={formData} onFieldChange={setField} />

          <section className="campaign-form__section">
            <h3>Players</h3>
            <p className="players-info-hint">
              Players will be automatically added when they link their
              characters to this campaign using the Campaign ID. After creating
              the campaign, share the Campaign ID with your players.
            </p>
            <p className="players-empty">
              No players linked yet. Players will appear here once they link
              their characters to this campaign.
            </p>
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
  );
};

export default CreateCampaign;
