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
              <a
                href="https://media.wizards.com/2018/dnd/downloads/DnD_BasicRules_2018.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="rules-item rules-item--link"
              >
                <h4>Core Rules</h4>
                <p>Basic rules and mechanics for gameplay</p>
              </a>
              <a
                href="https://dndspellslist.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="rules-item rules-item--link"
              >
                <h4>Spells</h4>
                <p>Complete spell reference guide</p>
              </a>
              <a
                href="https://www.dndbeyond.com/equipment"
                target="_blank"
                rel="noopener noreferrer"
                className="rules-item rules-item--link"
              >
                <h4>Items & Equipment</h4>
                <p>Weapons, armor, and magical items</p>
              </a>
              <a
                href="https://www.dndbeyond.com/monsters"
                target="_blank"
                rel="noopener noreferrer"
                className="rules-item rules-item--link"
              >
                <h4>Monsters & Bestiary</h4>
                <p>Creature statistics and descriptions</p>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Rules;
