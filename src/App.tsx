import { useEffect } from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Home from "./pages/Home/Home";
import Account from "./pages/Account/Account";
import Campaigns from "./pages/Campaigns/Campaigns";
import CreateCampaign from "./pages/Campaigns/CreateCampaign";
import ViewEditCampaign from "./pages/Campaigns/ViewEditCampaign";
import Characters from "./pages/Characters/Characters";
import CreateCharacter from "./pages/Characters/CreateCharacter";
import ViewEditCharacter from "./pages/Characters/ViewEditCharacter";
import Rules from "./pages/Rules/Rules";
import Instructions from "./pages/Instructions/Instructions";
import "./App.scss";

const App = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Redirect to homepage when App first mounts after login
    // This ensures users always land on homepage after logging in
    if (location.pathname !== "/") {
      navigate("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  return (
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/account" element={<Account />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/create" element={<CreateCampaign />} />
          <Route path="/campaigns/:id" element={<ViewEditCampaign />} />
          <Route path="/characters" element={<Characters />} />
          <Route path="/characters/create" element={<CreateCharacter />} />
          <Route path="/characters/:id" element={<ViewEditCharacter />} />
          <Route path="/rules" element={<Rules />} />
          <Route path="/instructions" element={<Instructions />} />
        </Routes>
  );
};

export default App;
