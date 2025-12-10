import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home/Home";
import Account from "./pages/Account/Account";
import Campaigns from "./pages/Campaigns/Campaigns";
import CreateCampaign from "./pages/Campaigns/CreateCampaign";
import Characters from "./pages/Characters/Characters";
import CreateCharacter from "./pages/Characters/CreateCharacter";
import ViewEditCharacter from "./pages/Characters/ViewEditCharacter";
import Rules from "./pages/Rules/Rules";
import "./App.scss";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/account" element={<Account />} />
      <Route path="/campaigns" element={<Campaigns />} />
      <Route path="/campaigns/create" element={<CreateCampaign />} />
      <Route path="/characters" element={<Characters />} />
      <Route path="/characters/create" element={<CreateCharacter />} />
      <Route path="/characters/:id" element={<ViewEditCharacter />} />
      <Route path="/rules" element={<Rules />} />
    </Routes>
  );
};

export default App;
