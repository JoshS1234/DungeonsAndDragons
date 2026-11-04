import { ref } from "firebase/storage";
import { deleteObject, getDownloadURL, uploadBytes } from "./firebaseCalls";
import { storage } from "../../firebaseSetup";
import { updateCharacterFields } from "./characters";

const portraitRef = (characterId: string) =>
  ref(storage, `portraits/${characterId}`);

/** Upload (or replace) a character's portrait. Returns its URL. */
export const uploadPortrait = async (characterId: string, image: Blob) => {
  const target = portraitRef(characterId);
  await uploadBytes(target, image, { contentType: image.type });
  // The URL changes on each upload, so browsers don't show a cached old one
  const portraitUrl = await getDownloadURL(target);
  await updateCharacterFields(characterId, { portraitUrl });
  return portraitUrl;
};

/** Delete the stored image, if there is one. */
export const deletePortraitFile = (characterId: string) =>
  deleteObject(portraitRef(characterId)).catch((err) => {
    if (err?.code !== "storage/object-not-found") throw err;
  });

export const removePortrait = async (characterId: string) => {
  await deletePortraitFile(characterId);
  await updateCharacterFields(characterId, { portraitUrl: "" });
};
