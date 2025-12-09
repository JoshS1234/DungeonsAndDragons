import Header from "../../components/Header/Header";
import "./Characters.scss";

const Characters = () => {
  return (
    <div className="app">
      <Header />
      <div className="page-content">
        <h2>👥 Characters</h2>
        <p>Create and track your characters</p>
        <div className="page-content__section">
          <div className="info-card">
            <h3>Your Characters</h3>
            <p>
              No characters created yet. Create your first character to start
              your journey!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Characters;
