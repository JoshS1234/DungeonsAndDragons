import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import type { RulesTestEnvironment } from "@firebase/rules-unit-testing";
import {
  arrayUnion,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  collection,
  setDoc,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import type { Firestore } from "firebase/firestore";
import { getBytes, ref, uploadBytes } from "firebase/storage";
import type { FirebaseStorage } from "firebase/storage";
import { getModularInstance } from "@firebase/util";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { DEFAULT_CHARACTER } from "../utils/dnd";
import type { CharacterData } from "../utils/dnd";
import {
  DEFAULT_CAMPAIGN,
  createCampaign,
  deleteCampaign,
  findJoinableCampaign,
  getCampaign,
  listMyCampaigns,
  removePlayer,
  updateCampaign,
} from "./campaigns";
import {
  createCharacter,
  deleteCharacter,
  getCharacter,
  getCharacterCampaigns,
  joinCampaign,
  leaveCampaign,
  updateCharacter,
  updateCharacterFields,
  watchCharacter,
} from "./characters";
import { removePortrait, uploadPortrait } from "./portraits";
import { resetUsageGuard } from "./usageGuard";
import { endEncounter, saveEncounter, watchEncounter } from "./encounters";
import { deleteSession, listSessions, saveSession } from "./sessions";
import { NEW_ENCOUNTER } from "../utils/encounter";
import type { Encounter } from "../utils/encounter";

// The services import `db` and `storage` from firebaseSetup; point them at
// whichever test user is currently acting.
let currentDb: Firestore;
let currentStorage!: FirebaseStorage;
vi.mock("../../firebaseSetup", () => ({
  get db() {
    return currentDb;
  },
  get storage() {
    return currentStorage;
  },
}));

let testEnv: RulesTestEnvironment;

const as = (uid: string) => {
  const context = testEnv.authenticatedContext(uid);
  currentDb = context.firestore() as unknown as Firestore;
  // The test context hands back compat instances; Storage's modular API
  // needs the underlying modular one
  currentStorage = getModularInstance(
    context.storage()
  ) as unknown as FirebaseStorage;
  return currentDb;
};

const character = (name: string): CharacterData => ({
  ...DEFAULT_CHARACTER,
  characterName: name,
  class: "Rogue",
});

/** Alice runs a campaign; Bob has a character in it; Carol is a stranger. */
const setUpParty = async () => {
  as("alice");
  const campaignId = await createCampaign(
    "alice",
    {
      ...DEFAULT_CAMPAIGN,
      campaignName: "Curse of Strahd",
      dungeonMaster: "Alice",
    },
    "Strahd is the vampire"
  );
  as("bob");
  const characterId = await createCharacter("bob", character("Thalia"), "Bob");
  await joinCampaign(
    characterId,
    "bob",
    campaignId,
    character("Thalia"),
    "Bob"
  );
  as("carol");
  const carolCharacterId = await createCharacter(
    "carol",
    character("Vex"),
    "Carol"
  );
  return { campaignId, characterId, carolCharacterId };
};

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-dnd",
    firestore: {
      rules: readFileSync(resolve(__dirname, "../../firestore.rules"), "utf8"),
    },
    storage: {
      rules: readFileSync(resolve(__dirname, "../../storage.rules"), "utf8"),
    },
  });
});

beforeEach(async () => {
  // This suite makes hundreds of calls a minute on purpose
  resetUsageGuard();
  await Promise.all([testEnv.clearFirestore(), testEnv.clearStorage()]);
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe("campaigns", () => {
  it("lets the DM create, read and update a campaign with private notes", async () => {
    as("alice");
    const id = await createCampaign(
      "alice",
      { ...DEFAULT_CAMPAIGN, campaignName: "Tomb of Annihilation" },
      "secret"
    );
    await updateCampaign(
      id,
      "alice",
      { ...DEFAULT_CAMPAIGN, campaignName: "Tomb of Annihilation II" },
      "new secret"
    );

    const loaded = await getCampaign(id, "alice");
    expect(loaded?.isDm).toBe(true);
    expect(loaded?.campaign.campaignName).toBe("Tomb of Annihilation II");
    expect(loaded?.notes).toBe("new secret");
  });

  it("returns null for a campaign that doesn't exist", async () => {
    as("alice");
    expect(await getCampaign("missing", "alice")).toBeNull();
  });

  it("hides campaigns from non-members, but shows the name to join with", async () => {
    const { campaignId } = await setUpParty();
    as("carol");

    await assertFails(getCampaign(campaignId, "carol"));
    expect(await findJoinableCampaign(campaignId, "carol")).toEqual({
      campaignName: "Curse of Strahd",
      dungeonMaster: "Alice",
    });
  });

  it("lets players read the campaign and party but not DM notes", async () => {
    const { campaignId } = await setUpParty();
    const db = as("bob");

    const loaded = await getCampaign(campaignId, "bob");
    expect(loaded?.isDm).toBe(false);
    expect(loaded?.players.map((p) => p.characterName)).toEqual(["Thalia"]);
    await assertFails(
      getDoc(doc(db, "campaigns", campaignId, "private", "dm"))
    );
  });

  it("stops players editing the campaign", async () => {
    const { campaignId } = await setUpParty();
    const db = as("bob");

    await assertFails(
      updateDoc(doc(db, "campaigns", campaignId), { campaignName: "Hacked" })
    );
  });

  it("lists campaigns by role", async () => {
    const { campaignId } = await setUpParty();

    as("alice");
    const alice = await listMyCampaigns("alice");
    expect(alice.running.map((c) => c.id)).toEqual([campaignId]);
    expect(alice.playing).toEqual([]);

    as("bob");
    const bob = await listMyCampaigns("bob");
    expect(bob.playing.map((c) => c.id)).toEqual([campaignId]);
  });

  it("rejects joining a missing campaign or one you're already in", async () => {
    const { campaignId } = await setUpParty();
    as("bob");

    await expect(findJoinableCampaign("missing", "bob")).rejects.toThrow(
      "Campaign not found"
    );
    await expect(findJoinableCampaign(campaignId, "bob")).rejects.toThrow(
      "already in this campaign"
    );
  });
});

describe("characters", () => {
  it("lets campaign members read each other's characters, and nobody else", async () => {
    const { characterId } = await setUpParty();

    as("alice");
    expect((await getCharacter(characterId))?.character.characterName).toBe(
      "Thalia"
    );
    as("carol");
    await assertFails(getCharacter(characterId));
  });

  it("returns null for a character that doesn't exist", async () => {
    as("bob");
    expect(await getCharacter("missing")).toBeNull();
  });

  it("joins campaigns when created with campaign IDs", async () => {
    const { campaignId } = await setUpParty();
    as("carol");

    const id = await createCharacter(
      "carol",
      { ...character("Vex"), campaignIds: [campaignId] },
      "Carol"
    );

    expect(await getCharacterCampaigns(id, "carol")).toEqual([
      { id: campaignId, name: "Curse of Strahd" },
    ]);
  });

  it("copies renames onto the campaign's player list", async () => {
    const { campaignId, characterId } = await setUpParty();
    as("bob");

    await updateCharacter(
      characterId,
      "bob",
      character("Thalia the Bold"),
      "Bob"
    );

    as("alice");
    const loaded = await getCampaign(campaignId, "alice");
    expect(loaded?.players[0].characterName).toBe("Thalia the Bold");
  });

  it("lets a player leave a campaign", async () => {
    const { campaignId, characterId } = await setUpParty();
    as("bob");

    await leaveCampaign(characterId, "bob", campaignId);

    expect(await getCharacterCampaigns(characterId, "bob")).toEqual([]);
    await assertFails(getCampaign(campaignId, "bob"));
  });

  it("lets the DM remove a player, and the character recovers on next save", async () => {
    const { campaignId, characterId } = await setUpParty();
    as("alice");

    await removePlayer(campaignId, "bob");
    // The DM loses access straight away, before Bob's next save
    await assertFails(getCharacter(characterId));

    as("bob");
    expect(await getCharacterCampaigns(characterId, "bob")).toEqual([]);
    await updateCharacter(characterId, "bob", character("Thalia"), "Bob");
    expect((await getCharacter(characterId))?.character.campaignIds).toEqual(
      []
    );
  });

  it("removes memberships when a character is deleted", async () => {
    const { campaignId, characterId } = await setUpParty();
    as("bob");

    await deleteCharacter(characterId, "bob");

    as("alice");
    expect((await getCampaign(campaignId, "alice"))?.players).toEqual([]);
  });
});

describe("play mode", () => {
  it("saves session changes and streams them to campaign-mates", async () => {
    const { characterId } = await setUpParty();

    as("alice");
    const seen: number[] = [];
    const stop = watchCharacter(
      characterId,
      (c) => c && seen.push(c.character.currentHitPoints),
      (err) => {
        throw err;
      }
    );

    as("bob");
    await updateCharacterFields(characterId, {
      currentHitPoints: 3,
      conditions: ["Poisoned"],
    });

    await vi.waitFor(() => expect(seen).toContain(3));
    stop();
  });

  it("stops the DM changing a player's HP", async () => {
    const { characterId } = await setUpParty();
    as("alice");
    await assertFails(
      updateCharacterFields(characterId, { currentHitPoints: 0 })
    );
  });
});

describe("encounters", () => {
  const goblin = {
    id: "g1",
    name: "Goblin",
    initiative: 12,
    kind: "monster" as const,
    hitPoints: 7,
    maxHitPoints: 7,
  };

  it("lets the DM run an encounter that players can watch", async () => {
    const { campaignId } = await setUpParty();
    as("alice");
    await saveEncounter(campaignId, {
      ...NEW_ENCOUNTER,
      combatants: [goblin],
    });

    as("bob");
    const seen: Array<Encounter | null> = [];
    const stop = watchEncounter(
      campaignId,
      (e) => seen.push(e),
      (err) => {
        throw err;
      }
    );
    await vi.waitFor(() =>
      expect(seen.at(-1)?.combatants[0].name).toBe("Goblin")
    );
    stop();

    await assertFails(
      saveEncounter(campaignId, { ...NEW_ENCOUNTER, round: 99 })
    );
    await assertFails(endEncounter(campaignId));

    as("alice");
    await endEncounter(campaignId);
  });

  it("hides encounters from people outside the campaign", async () => {
    const { campaignId } = await setUpParty();
    as("alice");
    await saveEncounter(campaignId, NEW_ENCOUNTER);

    const db = as("carol");
    await assertFails(
      getDoc(doc(db, "campaigns", campaignId, "encounter", "current"))
    );
  });

  it("is removed with the campaign", async () => {
    const { campaignId } = await setUpParty();
    as("alice");
    await saveEncounter(campaignId, NEW_ENCOUNTER);
    await deleteCampaign(campaignId);

    let exists = true;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore() as unknown as Firestore;
      exists = (
        await getDoc(doc(db, "campaigns", campaignId, "encounter", "current"))
      ).exists();
    });
    expect(exists).toBe(false);
  });
});

describe("session log", () => {
  const session = {
    date: "2026-10-08",
    title: "Into the mists",
    recap: "The party reached Barovia.",
    dmNotes: "Strahd is watching",
  };

  it("shares recaps with players but keeps DM notes private", async () => {
    const { campaignId } = await setUpParty();
    as("alice");
    const id = await saveSession(campaignId, session);
    expect(await listSessions(campaignId, true)).toEqual([{ id, ...session }]);

    const db = as("bob");
    expect(await listSessions(campaignId, false)).toEqual([
      { id, ...session, dmNotes: "" },
    ]);
    await assertFails(
      getDoc(doc(db, "campaigns", campaignId, "sessionNotes", id))
    );
    await assertFails(saveSession(campaignId, { ...session, title: "Mine" }));
    await assertFails(deleteSession(campaignId, id));

    as("carol");
    await assertFails(listSessions(campaignId, false));
  });

  it("lets the DM edit and delete sessions", async () => {
    const { campaignId } = await setUpParty();
    as("alice");
    const id = await saveSession(campaignId, session);
    await saveSession(campaignId, { ...session, id, title: "Renamed" });
    expect((await listSessions(campaignId, true))[0].title).toBe("Renamed");

    await deleteSession(campaignId, id);
    expect(await listSessions(campaignId, true)).toEqual([]);
  });

  it("rejects overlong titles", async () => {
    const { campaignId } = await setUpParty();
    as("alice");
    await assertFails(
      saveSession(campaignId, { ...session, title: "x".repeat(101) })
    );
  });

  it("is removed with the campaign", async () => {
    const { campaignId } = await setUpParty();
    as("alice");
    await saveSession(campaignId, session);
    await deleteCampaign(campaignId);

    let remaining = -1;
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore() as unknown as Firestore;
      remaining = (
        await getDocs(collection(db, "campaigns", campaignId, "sessions"))
      ).size;
    });
    expect(remaining).toBe(0);
  });
});

describe("portraits", () => {
  const jpeg = new Uint8Array(
    readFileSync(resolve(__dirname, "../test/portrait.jpg"))
  );
  const image = new Blob([jpeg], { type: "image/jpeg" });

  it("lets owners upload a portrait that campaign-mates can view", async () => {
    const { characterId } = await setUpParty();
    as("bob");
    const url = await uploadPortrait(characterId, image);
    expect(url).toContain(`portraits%2F${characterId}`);
    expect((await getCharacter(characterId))?.character.portraitUrl).toBe(url);

    as("alice");
    const bytes = await getBytes(
      ref(currentStorage, `portraits/${characterId}`)
    );
    expect(bytes.byteLength).toBe(jpeg.byteLength);
  });

  it("stops anyone else changing a character's portrait", async () => {
    const { characterId } = await setUpParty();
    as("alice");
    await assertFails(
      uploadBytes(ref(currentStorage, `portraits/${characterId}`), image, {
        contentType: "image/jpeg",
      })
    );
  });

  it("only accepts images", async () => {
    const { characterId } = await setUpParty();
    as("bob");
    await assertFails(
      uploadBytes(
        ref(currentStorage, `portraits/${characterId}`),
        new Blob(["hello"], { type: "text/plain" }),
        { contentType: "text/plain" }
      )
    );
  });

  it("removes the portrait, including when the character is deleted", async () => {
    const { characterId } = await setUpParty();
    as("bob");
    await uploadPortrait(characterId, image);
    await removePortrait(characterId);
    expect((await getCharacter(characterId))?.character.portraitUrl).toBe("");

    await uploadPortrait(characterId, image);
    await deleteCharacter(characterId, "bob");
    await expect(
      getBytes(ref(currentStorage, `portraits/${characterId}`))
    ).rejects.toMatchObject({ code: "storage/object-not-found" });
  });
});

describe("deleting campaigns", () => {
  it("lets the DM delete a campaign and its memberships", async () => {
    const { campaignId, characterId } = await setUpParty();
    as("alice");

    await deleteCampaign(campaignId);

    expect(await getCampaign(campaignId, "alice")).toBeNull();
    as("bob");
    expect(await getCharacterCampaigns(characterId, "bob")).toEqual([]);
    expect((await listMyCampaigns("bob")).playing).toEqual([]);
  });

  it("stops players deleting the campaign", async () => {
    const { campaignId } = await setUpParty();
    as("bob");

    await assertFails(deleteCampaign(campaignId));
  });
});

describe("validation", () => {
  it("rejects overlong names and impossible levels", async () => {
    const db = as("bob");

    await assertFails(
      setDoc(doc(db, "characters", "long"), {
        ...character("x".repeat(101)),
        userId: "bob",
      })
    );
    await assertFails(
      setDoc(doc(db, "characters", "level"), {
        ...character("Ok"),
        level: 25,
        userId: "bob",
      })
    );
    await assertSucceeds(
      setDoc(doc(db, "characters", "fine"), {
        ...character("Ok"),
        level: 20,
        userId: "bob",
      })
    );
  });

  it("rejects a campaign without a name", async () => {
    as("alice");
    await assertFails(
      createCampaign("alice", { ...DEFAULT_CAMPAIGN, campaignName: "" }, "")
    );
  });

  it("limits a character to five campaigns", async () => {
    const db = as("bob");
    await assertFails(
      setDoc(doc(db, "characters", "busy"), {
        ...character("Busy"),
        campaignIds: ["a", "b", "c", "d", "e", "f"],
        userId: "bob",
      })
    );
  });
});

describe("blocked writes", () => {
  it("stops users creating characters for someone else", async () => {
    const db = as("carol");
    await assertFails(
      setDoc(doc(db, "characters", "fake"), {
        ...character("X"),
        userId: "bob",
      })
    );
  });

  it("stops users editing or deleting someone else's character", async () => {
    const { characterId } = await setUpParty();
    const db = as("alice");

    await assertFails(
      updateDoc(doc(db, "characters", characterId), { characterName: "Mine" })
    );
    await assertFails(deleteDoc(doc(db, "characters", characterId)));
  });

  it("stops joining with someone else's character", async () => {
    const { campaignId, characterId } = await setUpParty();
    const db = as("carol");

    await assertFails(
      setDoc(doc(db, "campaigns", campaignId, "members", "carol"), {
        userId: "carol",
        role: "player",
        characterId,
        characterName: "Thalia",
        playerName: "Carol",
      })
    );
  });

  it("stops joining without recording the campaign on the character", async () => {
    const { campaignId, carolCharacterId } = await setUpParty();
    const db = as("carol");

    await assertFails(
      setDoc(doc(db, "campaigns", campaignId, "members", "carol"), {
        userId: "carol",
        role: "player",
        characterId: carolCharacterId,
        characterName: "Vex",
        playerName: "Carol",
      })
    );
  });

  it("stops players promoting themselves to DM", async () => {
    const { campaignId, carolCharacterId } = await setUpParty();
    const db = as("carol");
    const batch = writeBatch(db);
    batch.update(doc(db, "characters", carolCharacterId), {
      campaignIds: arrayUnion(campaignId),
    });
    batch.set(doc(db, "campaigns", campaignId, "members", "carol"), {
      userId: "carol",
      role: "dm",
      characterId: null,
      characterName: "",
      playerName: "Carol",
    });

    await assertFails(batch.commit());
  });

  it("stops players removing other players or reading the member list from outside", async () => {
    const { campaignId } = await setUpParty();
    const db = as("carol");

    await assertFails(
      deleteDoc(doc(db, "campaigns", campaignId, "members", "bob"))
    );
    await assertFails(
      getDocs(collection(db, "campaigns", campaignId, "members"))
    );
  });

  it("stops anyone reading data while signed out", async () => {
    const { campaignId, characterId } = await setUpParty();
    const db = testEnv
      .unauthenticatedContext()
      .firestore() as unknown as Firestore;

    await assertFails(getDoc(doc(db, "characters", characterId)));
    await assertFails(
      getDoc(doc(db, "campaigns", campaignId, "public", "summary"))
    );
  });

  it("allows the happy path writes these tests rely on", async () => {
    const { campaignId } = await setUpParty();
    const db = as("bob");
    await assertSucceeds(getDoc(doc(db, "campaigns", campaignId)));
  });
});
