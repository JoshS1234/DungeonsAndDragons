import { Link } from "react-router-dom";
import "./Home.scss";

const Home = () => {
  return (
    <div className="landing-content">
      <h2>Welcome, Adventurer!</h2>
      <p>You have successfully logged into your D&D campaign.</p>
      <Link to="/instructions" className="instructions-link">
        📖 How to Use This Site - Instructions for Players & DMs
      </Link>
      <div className="landing-content__features">
        <Link to="/campaigns" className="feature-card">
          <h3>🗺️ Campaigns</h3>
          <p>Manage your campaigns and adventures</p>
        </Link>
        <Link to="/characters" className="feature-card">
          <h3>👥 Characters</h3>
          <p>Create and track your characters</p>
        </Link>
        <Link to="/rules" className="feature-card">
          <h3>📜 Rules</h3>
          <p>Access rulebooks and references</p>
        </Link>
      </div>
    </div>
  );
};

export default Home;
