import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { auth, db } from "../../../firebaseSetup";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  query,
  where,
  getDocs,
  Timestamp,
  orderBy,
} from "firebase/firestore";
import Header from "../../components/Header/Header";
import "./Campaigns.scss";

interface Campaign {
  id: string;
  campaignName: string;
  description?: string;
  setting?: string;
  world?: string;
  dungeonMaster?: string;
  currentLevel?: number;
  startDate?: string;
  status?: string;
  theme?: string;
  notes?: string;
  createdAt?: Timestamp;
  [key: string]: any;
}

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCampaigns([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Query with orderBy - requires Firestore composite index
        const campaignsQuery = query(
          collection(db, "campaigns"),
          where("userId", "==", user.uid),
          orderBy("campaignName", "desc")
        );

        const querySnapshot = await getDocs(campaignsQuery);
        const campaignsData: Campaign[] = [];
        querySnapshot.forEach((doc) => {
          campaignsData.push({
            id: doc.id,
            ...doc.data(),
          } as Campaign);
        });

        setCampaigns(campaignsData);
      } catch (error: any) {
        console.error("Error fetching campaigns:", error);

        // Handle Firestore index error with helpful message
        if (error.code === "failed-precondition") {
          const indexUrl = error.message?.match(
            /https:\/\/console\.firebase\.google\.com[^\s]+/
          )?.[0];
          setError(
            indexUrl
              ? `Firestore index required. Click here to create it: ${indexUrl}`
              : "Firestore index required. Check the browser console for the index creation link."
          );
        } else {
          setError(
            error.message || "Failed to load campaigns. Please try again."
          );
        }
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="app">
      <Header />
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
          ) : campaigns.length === 0 ? (
            <div className="info-card">
              <h3>Your Campaigns</h3>
              <p>
                No campaigns yet. Create your first campaign to begin your
                adventure!
              </p>
            </div>
          ) : (
            <div className="campaigns-list">
              <h3>Your Campaigns ({campaigns.length})</h3>
              <div className="campaigns-grid">
                {campaigns.map((campaign) => (
                  <Link
                    key={campaign.id}
                    to={`/campaigns/${campaign.id}`}
                    className="campaign-card campaign-card--clickable"
                  >
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
                          <span className="campaign-card__label">World:</span>{" "}
                          {campaign.world}
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
                          <span className="campaign-card__label">Theme:</span>{" "}
                          {campaign.theme}
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
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Campaigns;
