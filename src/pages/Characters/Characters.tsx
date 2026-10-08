import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { auth } from "../../../firebaseSetup";
import Header from "../../components/Header/Header";
import { listMyCharacters } from "../../services/characters";
import type { StoredCharacter } from "../../services/characters";
import { fillCharacterPDF } from "../../utils/fillCharacterPDF";
import "./Characters.scss";
import { errorMessage } from "../../utils/errors";

const Characters = () => {
  const [characters, setCharacters] = useState<StoredCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingPDF, setExportingPDF] = useState<string | null>(null);

  useEffect(() => {
    listMyCharacters(auth.currentUser!.uid)
      .then(setCharacters)
      .catch((err) => {
        console.error("Error fetching characters:", err);
        setError(
          errorMessage(err, "Failed to load characters. Please try again.")
        );
      })
      .finally(() => setLoading(false));
  }, []);

  const handleExportPDF = async ({ id, character }: StoredCharacter) => {
    setExportingPDF(id);
    setError(null);

    try {
      await fillCharacterPDF(character);
    } catch (err) {
      setError(errorMessage(err, "Failed to export PDF"));
      console.error("Error exporting PDF:", err);
    } finally {
      setExportingPDF(null);
    }
  };

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
                {characters.map((stored) => {
                  const { id, character } = stored;
                  return (
                    <div key={id} className="character-card">
                      <Link
                        to={`/characters/${id}`}
                        className="character-card__link"
                      >
                        <h4>
                          {character.characterName || "Unnamed Character"}
                        </h4>
                        <div className="character-card__details">
                          <p>
                            <span className="character-card__label">
                              Class:
                            </span>{" "}
                            {character.class || "—"}
                          </p>
                          <p>
                            <span className="character-card__label">
                              Level:
                            </span>{" "}
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
                      </Link>
                      <button
                        className="character-card__export-pdf"
                        onClick={() => handleExportPDF(stored)}
                        disabled={exportingPDF === id}
                        title="Export PDF"
                      >
                        {exportingPDF === id ? "Exporting..." : "📄 Export PDF"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Characters;
