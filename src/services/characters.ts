import {
  arrayRemove,
  arrayUnion,
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../firebaseSetup";
import { normaliseCharacter } from "../utils/dnd";
import type { CharacterData } from "../utils/dnd";
import { getCampaignSummary } from "./campaigns";
import { deletePortraitFile } from "./portraits";

/** Enforced by the security rules too (see firestore.rules). */
export const MAX_CAMPAIGNS_PER_CHARACTER = 5;

export interface StoredCharacter {
  id: string;
  userId: string;
  character: CharacterData;
}

export interface LinkedCampaign {
  id: string;
  name: string;
}

const characterRef = (characterId: string) =>
  doc(db, "characters", characterId);
const memberRef = (campaignId: string, uid: string) =>
  doc(db, "campaigns", campaignId, "members", uid);

const memberInfo = (
  uid: string,
  characterId: string,
  character: CharacterData,
  fallbackPlayerName: string
) => ({
  userId: uid,
  role: "player",
  characterId,
  characterName: character.characterName || "Unnamed Character",
  playerName: character.playerName || fallbackPlayerName,
  joinedAt: serverTimestamp(),
});

/** IDs of the campaigns this character is currently a member of. */
const membershipCampaignIds = async (characterId: string, uid: string) => {
  const memberships = await getDocs(
    query(
      collectionGroup(db, "members"),
      where("userId", "==", uid),
      where("characterId", "==", characterId)
    )
  );
  return memberships.docs.map((m) => m.ref.parent.parent!.id);
};

export const listMyCharacters = async (
  uid: string
): Promise<StoredCharacter[]> => {
  const snapshot = await getDocs(
    query(
      collection(db, "characters"),
      where("userId", "==", uid),
      orderBy("characterName", "asc")
    )
  );
  return snapshot.docs.map((d) => ({
    id: d.id,
    userId: d.data().userId,
    character: normaliseCharacter(d.data()),
  }));
};

/** Returns null if the character doesn't exist. */
export const getCharacter = async (
  characterId: string
): Promise<StoredCharacter | null> => {
  const snapshot = await getDoc(characterRef(characterId));
  if (!snapshot.exists()) return null;
  return {
    id: snapshot.id,
    userId: snapshot.data().userId,
    character: normaliseCharacter(snapshot.data()),
  };
};

/**
 * Live updates for one character. Calls `onChange(null)` if it's deleted.
 * Returns an unsubscribe function.
 */
export const watchCharacter = (
  characterId: string,
  onChange: (character: StoredCharacter | null) => void,
  onError: (error: Error) => void
) =>
  onSnapshot(
    characterRef(characterId),
    (snapshot) =>
      onChange(
        snapshot.exists()
          ? {
              id: snapshot.id,
              userId: snapshot.data().userId,
              character: normaliseCharacter(snapshot.data()),
            }
          : null
      ),
    onError
  );

/** Save a few fields (e.g. HP during play) without touching the rest. */
export const updateCharacterFields = (
  characterId: string,
  fields: Partial<CharacterData>
) =>
  updateDoc(characterRef(characterId), {
    ...fields,
    updatedAt: serverTimestamp(),
  });

/** Creates the character and joins every campaign in `campaignIds`. */
export const createCharacter = async (
  uid: string,
  character: CharacterData,
  fallbackPlayerName: string
): Promise<string> => {
  const ref = doc(collection(db, "characters"));
  const batch = writeBatch(db);
  batch.set(ref, {
    ...character,
    userId: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  for (const campaignId of character.campaignIds) {
    batch.set(
      memberRef(campaignId, uid),
      memberInfo(uid, ref.id, character, fallbackPlayerName)
    );
  }
  await batch.commit();
  return ref.id;
};

/**
 * Saves the character and copies its name onto its campaign memberships.
 * `campaignIds` is resynced from the memberships, in case a DM has removed
 * the character from a campaign since it was loaded.
 */
export const updateCharacter = async (
  characterId: string,
  uid: string,
  character: CharacterData,
  fallbackPlayerName: string
) => {
  const campaignIds = await membershipCampaignIds(characterId, uid);
  const { characterName, playerName } = memberInfo(
    uid,
    characterId,
    character,
    fallbackPlayerName
  );

  const batch = writeBatch(db);
  batch.update(characterRef(characterId), {
    ...character,
    campaignIds,
    userId: uid,
    updatedAt: serverTimestamp(),
  });
  for (const campaignId of campaignIds) {
    batch.update(memberRef(campaignId, uid), { characterName, playerName });
  }
  await batch.commit();
};

/** Deletes the character (and portrait) and leaves every campaign it's in. */
export const deleteCharacter = async (characterId: string, uid: string) => {
  // Before the document goes: the storage rules check it to confirm ownership
  await deletePortraitFile(characterId).catch((err) =>
    console.error("Couldn't delete portrait:", err)
  );
  const campaignIds = await membershipCampaignIds(characterId, uid);
  const batch = writeBatch(db);
  for (const campaignId of campaignIds) {
    batch.delete(memberRef(campaignId, uid));
  }
  batch.delete(characterRef(characterId));
  await batch.commit();
};

export const joinCampaign = async (
  characterId: string,
  uid: string,
  campaignId: string,
  character: CharacterData,
  fallbackPlayerName: string
) => {
  const batch = writeBatch(db);
  batch.update(characterRef(characterId), {
    campaignIds: arrayUnion(campaignId),
    updatedAt: serverTimestamp(),
  });
  batch.set(
    memberRef(campaignId, uid),
    memberInfo(uid, characterId, character, fallbackPlayerName)
  );
  await batch.commit();
};

export const leaveCampaign = async (
  characterId: string,
  uid: string,
  campaignId: string
) => {
  const batch = writeBatch(db);
  batch.update(characterRef(characterId), {
    campaignIds: arrayRemove(campaignId),
    updatedAt: serverTimestamp(),
  });
  batch.delete(memberRef(campaignId, uid));
  await batch.commit();
};

/** Campaigns the user's character is a member of, with their names. */
export const getCharacterCampaigns = async (
  characterId: string,
  uid: string
): Promise<LinkedCampaign[]> => {
  const campaignIds = await membershipCampaignIds(characterId, uid);
  return Promise.all(
    campaignIds.map(async (id) => ({
      id,
      name: (await getCampaignSummary(id))?.campaignName || "Unnamed Campaign",
    }))
  );
};

/** Name shown in campaigns when a character has no player name set. */
export const fallbackPlayerName = (user: {
  displayName: string | null;
  email: string | null;
}) => user.displayName || user.email || "Unknown Player";
