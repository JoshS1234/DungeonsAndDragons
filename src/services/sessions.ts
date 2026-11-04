import { collection, doc, serverTimestamp } from "firebase/firestore";
import { getDocs, writeBatch } from "./firebaseCalls";
import { db } from "../../firebaseSetup";

export interface Session {
  id: string;
  /** ISO date, e.g. "2026-10-08". */
  date: string;
  title: string;
  /** Shared with everyone in the campaign. */
  recap: string;
  /** DM only; empty for players. */
  dmNotes: string;
}

const sessionsRef = (campaignId: string) =>
  collection(db, "campaigns", campaignId, "sessions");
const notesRef = (campaignId: string, sessionId: string) =>
  doc(db, "campaigns", campaignId, "sessionNotes", sessionId);

/** Sessions, newest first. DM notes are only fetched for the DM. */
export const listSessions = async (
  campaignId: string,
  isDm: boolean
): Promise<Session[]> => {
  const [sessions, notes] = await Promise.all([
    getDocs(sessionsRef(campaignId)),
    isDm
      ? getDocs(collection(db, "campaigns", campaignId, "sessionNotes"))
      : Promise.resolve(null),
  ]);
  const notesById = new Map(
    notes?.docs.map((d) => [d.id, d.data().notes as string]) ?? []
  );
  return sessions.docs
    .map((d) => ({
      id: d.id,
      date: d.data().date ?? "",
      title: d.data().title ?? "",
      recap: d.data().recap ?? "",
      dmNotes: notesById.get(d.id) ?? "",
    }))
    .sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
};

/** Create (no id) or update a session. DM only. Returns its id. */
export const saveSession = async (
  campaignId: string,
  { id, dmNotes, ...session }: Omit<Session, "id"> & { id?: string }
): Promise<string> => {
  const ref = id
    ? doc(sessionsRef(campaignId), id)
    : doc(sessionsRef(campaignId));
  const batch = writeBatch(db);
  batch.set(ref, { ...session, updatedAt: serverTimestamp() });
  batch.set(notesRef(campaignId, ref.id), { notes: dmNotes });
  await batch.commit();
  return ref.id;
};

/** DM only. */
export const deleteSession = async (campaignId: string, sessionId: string) => {
  const batch = writeBatch(db);
  batch.delete(doc(sessionsRef(campaignId), sessionId));
  batch.delete(notesRef(campaignId, sessionId));
  await batch.commit();
};
