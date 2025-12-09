import Header from "../../components/Header/Header";
import "./Rules.scss";

const Rules = () => {
  return (
    <div className="app">
      <Header />
      <div className="page-content">
        <h2>📜 Rules</h2>
        <p>Access rulebooks and references</p>
        <div className="page-content__section">
          <div className="info-card">
            <h3>D&D Rules & References</h3>
            <p>
              Browse through D&D rules, spells, items, and reference materials.
            </p>
            <div className="rules-list">
              <div className="rules-item">
                <h4>Core Rules</h4>
                <p>Basic rules and mechanics for gameplay</p>
              </div>
              <div className="rules-item">
                <h4>Spells</h4>
                <p>Complete spell reference guide</p>
              </div>
              <div className="rules-item">
                <h4>Items & Equipment</h4>
                <p>Weapons, armor, and magical items</p>
              </div>
              <div className="rules-item">
                <h4>Monsters & Bestiary</h4>
                <p>Creature statistics and descriptions</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rules;
