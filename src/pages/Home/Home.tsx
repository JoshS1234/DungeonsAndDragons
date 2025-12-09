import Header from "../../components/Header/Header";
import "./Home.scss";

const Home = () => {
  return (
    <div className="app">
      <Header />
      <div className="landing-content">
        <h2>Welcome, Adventurer!</h2>
        <p>You have successfully logged into your D&D campaign.</p>
        <div className="landing-content__features">
          <div className="feature-card">
            <h3>🎲 Campaigns</h3>
            <p>Manage your campaigns and adventures</p>
          </div>
          <div className="feature-card">
            <h3>👥 Characters</h3>
            <p>Create and track your characters</p>
          </div>
          <div className="feature-card">
            <h3>📜 Rules</h3>
            <p>Access rulebooks and references</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
