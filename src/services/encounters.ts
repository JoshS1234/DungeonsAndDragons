import { deleteDoc, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "../../firebaseSetup";
import { NEW_ENCOUNTER } from "../utils/encounter";
import type { Encounter } from "../utils/encounter";

export const encounterRef = (campaignId: string) =>
  doc(db, "campaigns", campaignId, "encounter", "current");

/** Live updates for a campaign's encounter (null when there isn't one). */
export const watchEncounter = (
  campaignId: string,
  onChange: (encounter: Encounter | null) => void,
  onError: (error: Error) => void
) =>
  onSnapshot(
    encounterRef(campaignId),
    (snapshot) =>
      onChange(
        snapshot.exists()
          ? { ...NEW_ENCOUNTER, ...(snapshot.data() as Encounter) }
          : null
      ),
    onError
  );

/** DM only. */
export const saveEncounter = (campaignId: string, encounter: Encounter) =>
  setDoc(encounterRef(campaignId), encounter);

/** DM only. */
export const endEncounter = (campaignId: string) =>
  deleteDoc(encounterRef(campaignId));
