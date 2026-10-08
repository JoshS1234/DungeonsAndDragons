import {
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import type { DocumentData } from "firebase/firestore";
import { db } from "../../firebaseSetup";

export interface CampaignDetails {
  campaignName: string;
  description: string;
  setting: string;
  dungeonMaster: string;
  currentLevel: number;
  startDate: string;
  status: string;
  world: string;
  theme: string;
}

export const CAMPAIGN_STATUSES = ["Active", "On Hold", "Completed", "Planning"];

export const DEFAULT_CAMPAIGN: CampaignDetails = {
  campaignName: "",
  description: "",
  setting: "",
  dungeonMaster: "",
  currentLevel: 1,
  startDate: "",
  status: "Active",
  world: "",
  theme: "",
};

export interface Campaign extends CampaignDetails {
  id: string;
  userId: string;
}

export type MemberRole = "dm" | "player";

export interface CampaignMember {
  userId: string;
  role: MemberRole;
  characterId: string | null;
  characterName: string;
  playerName: string;
}

export interface CampaignSummary {
  campaignName: string;
  dungeonMaster: string;
}

const campaignRef = (campaignId: string) => doc(db, "campaigns", campaignId);
const memberRef = (campaignId: string, uid: string) =>
  doc(db, "campaigns", campaignId, "members", uid);
const summaryRef = (campaignId: string) =>
  doc(db, "campaigns", campaignId, "public", "summary");
const privateRef = (campaignId: string) =>
  doc(db, "campaigns", campaignId, "private", "dm");

const toSummary = (details: CampaignDetails): CampaignSummary => ({
  campaignName: details.campaignName,
  dungeonMaster: details.dungeonMaster,
});

const toCampaign = (id: string, data: DocumentData): Campaign => {
  const campaign = { ...DEFAULT_CAMPAIGN, id, userId: data.userId };
  for (const key of Object.keys(
    DEFAULT_CAMPAIGN
  ) as (keyof CampaignDetails)[]) {
    if (data[key] !== undefined && data[key] !== null) {
      (campaign as Record<string, unknown>)[key] = data[key];
    }
  }
  return campaign;
};

export const createCampaign = async (
  uid: string,
  details: CampaignDetails,
  notes: string
): Promise<string> => {
  const ref = doc(collection(db, "campaigns"));
  const batch = writeBatch(db);
  batch.set(ref, {
    ...details,
    userId: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  batch.set(memberRef(ref.id, uid), {
    userId: uid,
    role: "dm",
    characterId: null,
    characterName: "",
    playerName: details.dungeonMaster,
    joinedAt: serverTimestamp(),
  });
  batch.set(summaryRef(ref.id), toSummary(details));
  batch.set(privateRef(ref.id), { notes });
  await batch.commit();
  return ref.id;
};

export const updateCampaign = async (
  campaignId: string,
  uid: string,
  details: CampaignDetails,
  notes: string
) => {
  const batch = writeBatch(db);
  batch.update(campaignRef(campaignId), {
    ...details,
    userId: uid,
    updatedAt: serverTimestamp(),
  });
  batch.set(summaryRef(campaignId), toSummary(details));
  batch.set(privateRef(campaignId), { notes });
  await batch.commit();
};

/**
 * Load a campaign the user belongs to. Returns null if it doesn't exist;
 * throws a permission error if the user isn't a member.
 */
export const getCampaign = async (campaignId: string, uid: string) => {
  const snapshot = await getDoc(campaignRef(campaignId));
  if (!snapshot.exists()) return null;

  const campaign = toCampaign(snapshot.id, snapshot.data());
  const isDm = campaign.userId === uid;

  const [membersSnapshot, privateSnapshot] = await Promise.all([
    getDocs(collection(db, "campaigns", campaignId, "members")),
    isDm ? getDoc(privateRef(campaignId)) : Promise.resolve(null),
  ]);

  return {
    campaign,
    isDm,
    players: membersSnapshot.docs
      .map((d) => d.data() as CampaignMember)
      .filter((m) => m.role === "player"),
    notes: privateSnapshot?.data()?.notes ?? "",
  };
};

export const getCampaignSummary = async (
  campaignId: string
): Promise<CampaignSummary | null> => {
  const snapshot = await getDoc(summaryRef(campaignId));
  return snapshot.exists() ? (snapshot.data() as CampaignSummary) : null;
};

export const isCampaignMember = async (campaignId: string, uid: string) =>
  (await getDoc(memberRef(campaignId, uid))).exists();

/** Campaigns the user runs or plays in, each sorted by name. */
export const listMyCampaigns = async (uid: string) => {
  const memberships = await getDocs(
    query(collectionGroup(db, "members"), where("userId", "==", uid))
  );

  const campaigns = await Promise.all(
    memberships.docs.map(async (membership) => {
      const campaignId = membership.ref.parent.parent!.id;
      const snapshot = await getDoc(campaignRef(campaignId));
      return snapshot.exists()
        ? {
            campaign: toCampaign(snapshot.id, snapshot.data()),
            role: (membership.data() as CampaignMember).role,
          }
        : null;
    })
  );

  const byName = (a: Campaign, b: Campaign) =>
    a.campaignName.localeCompare(b.campaignName);
  const withRole = (role: MemberRole) =>
    campaigns
      .filter((c) => c?.role === role)
      .map((c) => c!.campaign)
      .sort(byName);

  return { running: withRole("dm"), playing: withRole("player") };
};

/** DM removes a player from their campaign. */
export const removePlayer = (campaignId: string, playerUid: string) =>
  deleteDoc(memberRef(campaignId, playerUid));

/**
 * Checks a campaign ID before a character joins it. Throws a user-facing
 * error if it doesn't exist or the user is already in it.
 */
export const findJoinableCampaign = async (
  campaignId: string,
  uid: string
): Promise<CampaignSummary> => {
  const summary = await getCampaignSummary(campaignId);
  if (!summary) {
    throw new Error("Campaign not found. Please check the Campaign ID.");
  }
  if (await isCampaignMember(campaignId, uid)) {
    throw new Error(
      "You're already in this campaign. Each player can bring one character."
    );
  }
  return summary;
};

/** DM deletes their campaign, including every membership. */
export const deleteCampaign = async (campaignId: string) => {
  const members = await getDocs(
    collection(db, "campaigns", campaignId, "members")
  );
  const batch = writeBatch(db);
  members.docs.forEach((member) => batch.delete(member.ref));
  batch.delete(summaryRef(campaignId));
  batch.delete(privateRef(campaignId));
  batch.delete(campaignRef(campaignId));
  await batch.commit();
};
