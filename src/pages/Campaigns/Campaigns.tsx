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
  doc,
  getDoc,
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
  isOwner?: boolean;
  isPlayer?: boolean;
  [key: string]: any;
}

const Campaigns = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [ownedCampaigns, setOwnedCampaigns] = useState<Campaign[]>([]);
  const [playerCampaigns, setPlayerCampaigns] = useState<Campaign[]>([]);
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

        const campaignsMap = new Map<string, Campaign>();

        // Query campaigns where user is the owner
        const ownedCampaignsQuery = query(
          collection(db, "campaigns"),
          where("userId", "==", user.uid)
        );

        const ownedSnapshot = await getDocs(ownedCampaignsQuery);
        ownedSnapshot.forEach((doc) => {
          campaignsMap.set(doc.id, {
            id: doc.id,
            ...doc.data(),
            isOwner: true,
            isPlayer: false,
          } as Campaign);
        });

        // Query characters where user is owner to find campaigns they're a player in
        const charactersQuery = query(
          collection(db, "characters"),
          where("userId", "==", user.uid)
        );

        const charactersSnapshot = await getDocs(charactersQuery);
        const campaignIds = new Set<string>();

        charactersSnapshot.forEach((charDoc) => {
          const charData = charDoc.data();
          if (charData.campaignIds && Array.isArray(charData.campaignIds)) {
            charData.campaignIds.forEach((campaignId: string) => {
              // Only add if not already marked as owner
              if (!campaignsMap.has(campaignId)) {
                campaignIds.add(campaignId);
              }
            });
          }
        });

        // Fetch campaigns where user is a player
        const playerCampaignPromises = Array.from(campaignIds).map(
          async (campaignId) => {
            try {
              const campaignDoc = await getDoc(doc(db, "campaigns", campaignId));
              if (campaignDoc.exists()) {
                const campaignData = campaignDoc.data();
                // Check if user is actually in the players array
                const players = campaignData.players || [];
                const isPlayer = players.some(
                  (p: any) => p.userId === user.uid
                );
                if (isPlayer) {
                  return {
                    id: campaignDoc.id,
                    ...campaignData,
                    isOwner: false,
                    isPlayer: true,
                  } as Campaign;
                }
              }
              return null;
            } catch {
              return null;
            }
          }
        );

        const playerCampaignsResults = await Promise.all(playerCampaignPromises);
        playerCampaignsResults.forEach((campaign) => {
          if (campaign) {
            campaignsMap.set(campaign.id, campaign);
          }
        });

        // Convert map to array and separate into owned and player campaigns
        const allCampaigns = Array.from(campaignsMap.values());
        const ownedCampaignsList = allCampaigns
          .filter((c) => c.isOwner)
          .sort((a, b) =>
            (a.campaignName || "").localeCompare(b.campaignName || "")
          );
        const playerCampaignsList = allCampaigns
          .filter((c) => c.isPlayer && !c.isOwner)
          .sort((a, b) =>
            (a.campaignName || "").localeCompare(b.campaignName || "")
          );

        setCampaigns(allCampaigns);
        setOwnedCampaigns(ownedCampaignsList);
        setPlayerCampaigns(playerCampaignsList);
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
                      <Link
                        key={campaign.id}
                        to={`/campaigns/${campaign.id}`}
                        className="campaign-card campaign-card--clickable campaign-card--dm"
                      >
                        <div className="campaign-card__dm-badge">
                          ⭐ Dungeon Master
                        </div>
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

              {/* Player Campaigns Section */}
              {playerCampaigns.length > 0 && (
                <div className="campaigns-list">
                  <h3>Campaigns I'm Playing In ({playerCampaigns.length})</h3>
                  <div className="campaigns-grid">
                    {playerCampaigns.map((campaign) => (
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Campaigns;
