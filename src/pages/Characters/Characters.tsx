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
import "./Characters.scss";

interface Character {
  id: string;
  characterName: string;
  class: string;
  level: number;
  race: string;
  background: string;
  alignment: string;
  createdAt?: Timestamp;
  [key: string]: any;
}

const Characters = () => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setCharacters([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Query with orderBy - requires Firestore composite index
        const charactersQuery = query(
          collection(db, "characters"),
          where("userId", "==", user.uid),
          orderBy("characterName", "desc")
        );

        const querySnapshot = await getDocs(charactersQuery);
        const charactersData: Character[] = [];
        querySnapshot.forEach((doc) => {
          charactersData.push({
            id: doc.id,
            ...doc.data(),
          } as Character);
        });

        setCharacters(charactersData);
      } catch (error: any) {
        console.error("Error fetching characters:", error);

        // Handle Firestore index error with helpful message
        if (error.code === "failed-precondition") {
          const indexUrl = error.message?.match(
            /https:\/\/console\.firebase\.google\.com[^\s]+/
          )?.[0];
          setError(
            indexUrl
              ? `Firestore index required. Click here to create it: ${indexUrl}`
              : "Firestore index required. Check the browser console for the index creation link, or see FIRESTORE_INDEX_SETUP.md for instructions."
          );
        } else {
          setError(
            error.message || "Failed to load characters. Please try again."
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
        <h2>👥 Characters</h2>
        <p>Create and track your characters</p>
        <div className="page-content__section">
          <Link to="/characters/create" className="create-character-button">
            Create New Character
          </Link>

          {error && (
            <div className="info-card info-card--error">
              <h3>Error</h3>
              <p>{error}</p>
            </div>
          )}

          {loading ? (
            <div className="info-card">
              <p>Loading characters...</p>
            </div>
          ) : characters.length === 0 ? (
            <div className="info-card">
              <h3>Your Characters</h3>
              <p>
                No characters created yet. Create your first character to start
                your journey!
              </p>
            </div>
          ) : (
            <div className="characters-list">
              <h3>Your Characters ({characters.length})</h3>
              <div className="characters-grid">
                {characters.map((character) => (
                  <div key={character.id} className="character-card">
                    <h4>{character.characterName || "Unnamed Character"}</h4>
                    <div className="character-card__details">
                      <p>
                        <span className="character-card__label">Class:</span>{" "}
                        {character.class || "—"}
                      </p>
                      <p>
                        <span className="character-card__label">Level:</span>{" "}
                        {character.level || 1}
                      </p>
                      <p>
                        <span className="character-card__label">Race:</span>{" "}
                        {character.race || "—"}
                      </p>
                      {character.background && (
                        <p>
                          <span className="character-card__label">
                            Background:
                          </span>{" "}
                          {character.background}
                        </p>
                      )}
                      {character.alignment && (
                        <p>
                          <span className="character-card__label">
                            Alignment:
                          </span>{" "}
                          {character.alignment}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Characters;
