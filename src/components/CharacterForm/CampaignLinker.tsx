import { useState } from "react";

export type LinkedCampaign = { id: string; name: string };

type CampaignLinkerProps = {
  linkedCampaigns: LinkedCampaign[];
  /** Resolves true if the input should be cleared afterwards. */
  onLink: (campaignId: string) => Promise<boolean>;
  onUnlink: (campaignId: string) => void;
};

const CampaignLinker = ({
  linkedCampaigns,
  onLink,
  onUnlink,
}: CampaignLinkerProps) => {
  const [campaignId, setCampaignId] = useState("");
  const [linking, setLinking] = useState(false);

  const handleLink = async () => {
    const trimmed = campaignId.trim();
    if (!trimmed || linking) return;

    setLinking(true);
    try {
      if (await onLink(trimmed)) setCampaignId("");
    } finally {
      setLinking(false);
    }
  };

  return (
    <section className="character-form__section">
      <h3>Linked Campaigns</h3>
      <div className="character-form__group">
        <label htmlFor="campaignId">Link to Campaign</label>
        <p className="campaign-link-hint">
          Enter a Campaign ID to link this character to a campaign. You can link
          this character to multiple campaigns.
        </p>
        <div className="campaign-link-container">
          <input
            type="text"
            id="campaignId"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            placeholder="Paste Campaign ID here"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleLink();
              }
            }}
          />
          <button
            type="button"
            onClick={handleLink}
            className="campaign-link-button"
            disabled={!campaignId.trim() || linking}
          >
            {linking ? "Linking..." : "Link Campaign"}
          </button>
        </div>
      </div>
      {linkedCampaigns.length > 0 ? (
        <div className="linked-campaigns-list">
          <h4>Linked Campaigns ({linkedCampaigns.length})</h4>
          <div className="linked-campaigns-list__items">
            {linkedCampaigns.map((campaign) => (
              <div key={campaign.id} className="linked-campaigns-list__item">
                <div className="linked-campaigns-list__info">
                  <span className="linked-campaigns-list__name">
                    {campaign.name}
                  </span>
                  <code className="linked-campaigns-list__id">
                    {campaign.id}
                  </code>
                </div>
                <button
                  type="button"
                  onClick={() => onUnlink(campaign.id)}
                  className="linked-campaigns-list__remove"
                  title="Unlink campaign"
                  aria-label={`Unlink ${campaign.name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="linked-campaigns-empty">
          No campaigns linked yet. Add a Campaign ID to link this character to a
          campaign.
        </p>
      )}
    </section>
  );
};

export default CampaignLinker;
