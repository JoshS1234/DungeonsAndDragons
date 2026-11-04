// The Firebase functions that hit the network, wrapped so every call goes
// through the usage guard. Services import these instead of the originals.
import * as firestore from "firebase/firestore";
import * as storage from "firebase/storage";
import { recordCall } from "./usageGuard";

// Keeps the wrapped function's exact (generic) type
const guarded = <Fn extends (...args: never[]) => unknown>(fn: Fn): Fn =>
  ((...args: Parameters<Fn>) => {
    recordCall();
    return fn(...args);
  }) as Fn;

export const getDoc = guarded(firestore.getDoc);
export const getDocs = guarded(firestore.getDocs);
export const setDoc = guarded(firestore.setDoc);
export const updateDoc = guarded(firestore.updateDoc);
export const deleteDoc = guarded(firestore.deleteDoc);
export const onSnapshot = guarded(firestore.onSnapshot);

/** A write batch whose commit counts as one call. */
export const writeBatch = (db: firestore.Firestore) => {
  const batch = firestore.writeBatch(db);
  const commit = batch.commit.bind(batch);
  batch.commit = () => {
    recordCall();
    return commit();
  };
  return batch;
};

export const uploadBytes = guarded(storage.uploadBytes);
export const getDownloadURL = guarded(storage.getDownloadURL);
export const deleteObject = guarded(storage.deleteObject);
