import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useCurrentUser } from "../../auth/currentUser";
import { listMyCampaigns } from "../../services/campaigns";
import type { Campaign } from "../../services/campaigns";
import "./Campaigns.scss";
import { errorMessage } from "../../utils/errors";

const CampaignCard = ({
  campaign,
  isDm,
}: {
  campaign: Campaign;
  isDm: boolean;
}) => (
  <Link
    to={`/campaigns/${campaign.id}`}
    className={`campaign-card campaign-card--clickable${
      isDm ? " campaign-card--dm" : ""
    }`}
  >
    {isDm && <div className="campaign-card__dm-badge">⭐ Dungeon Master</div>}
    <h4>{campaign.campaignName || "Unnamed Campaign"}</h4>
    <div className="campaign-card__details">
      {campaign.dungeonMaster && (
        <p>
          <span className="campaign-card__label">DM:</span>{" "}
          {campaign.dungeonMaster}
        </p>
      )}
      {campaign.setting && (
        <p>
          <span className="campaign-card__label">Setting:</span>{" "}
          {campaign.setting}
        </p>
      )}
      {campaign.world && (
        <p>
          <span className="campaign-card__label">World:</span> {campaign.world}
        </p>
      )}
      <p>
        <span className="campaign-card__label">Level:</span>{" "}
        {campaign.currentLevel || 1}
      </p>
      {campaign.startDate && (
        <p>
          <span className="campaign-card__label">Started:</span>{" "}
          {campaign.startDate}
        </p>
      )}
      {campaign.status && (
        <p>
          <span className="campaign-card__label">Status:</span>{" "}
          <span
            className={`campaign-card__status campaign-card__status--${campaign.status
              .toLowerCase()
              .replace(" ", "-")}`}
          >
            {campaign.status}
          </span>
        </p>
      )}
      {campaign.theme && (
        <p>
          <span className="campaign-card__label">Theme:</span> {campaign.theme}
        </p>
      )}
      {campaign.description && (
        <p className="campaign-card__description">
          {campaign.description.length > 100
            ? `${campaign.description.substring(0, 100)}...`
            : campaign.description}
        </p>
      )}
    </div>
  </Link>
);

const Campaigns = () => {
  const user = useCurrentUser();
  const [ownedCampaigns, setOwnedCampaigns] = useState<Campaign[]>([]);
  const [playerCampaigns, setPlayerCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listMyCampaigns(user.uid)
      .then(({ running, playing }) => {
        setOwnedCampaigns(running);
        setPlayerCampaigns(playing);
      })
      .catch((err) => {
        console.error("Error fetching campaigns:", err);
        setError(
          errorMessage(err, "Failed to load campaigns. Please try again.")
        );
      })
      .finally(() => setLoading(false));
  }, [user.uid]);

  return (
    <div className="page-content">
      <h2>🎲 Campaigns</h2>
      <p>Manage your campaigns and adventures</p>
      <div className="page-content__section">
        <Link to="/campaigns/create" className="create-campaign-button">
          Create New Campaign
        </Link>

        {error && (
          <div className="info-card info-card--error">
            <h3>Error</h3>
            <p>{error}</p>
          </div>
        )}

        {loading ? (
          <div className="info-card">
            <p>Loading campaigns...</p>
          </div>
        ) : ownedCampaigns.length === 0 && playerCampaigns.length === 0 ? (
          <div className="info-card">
            <h3>Your Campaigns</h3>
            <p>
              No campaigns yet. Create your first campaign to begin your
              adventure!
            </p>
          </div>
        ) : (
          <>
            {/* Owned Campaigns Section */}
            {ownedCampaigns.length > 0 && (
              <div className="campaigns-list">
                <h3>My Campaigns ({ownedCampaigns.length})</h3>
                <div className="campaigns-grid">
                  {ownedCampaigns.map((campaign) => (
                    <CampaignCard
                      key={campaign.id}
                      campaign={campaign}
                      isDm={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Player Campaigns Section */}
            {playerCampaigns.length > 0 && (
              <div className="campaigns-list">
                <h3>Campaigns I'm Playing In ({playerCampaigns.length})</h3>
                <div className="campaigns-grid">
                  {playerCampaigns.map((campaign) => (
                    <CampaignCard
                      key={campaign.id}
                      campaign={campaign}
                      isDm={false}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Campaigns;
