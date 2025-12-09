import Header from "../../components/Header/Header";
import "./Campaigns.scss";

const Campaigns = () => {
  return (
    <div className="app">
      <Header />
      <div className="page-content">
        <h2>🎲 Campaigns</h2>
        <p>Manage your campaigns and adventures</p>
        <div className="page-content__section">
          <div className="info-card">
            <h3>Your Campaigns</h3>
            <p>
              No campaigns yet. Create your first campaign to begin your
              adventure!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Campaigns;
