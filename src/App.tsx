import { lazy } from "react";
import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import Home from "./pages/Home/Home";
import "./App.scss";

// Pages other than Home load on demand to keep the initial download small
const Account = lazy(() => import("./pages/Account/Account"));
const Campaigns = lazy(() => import("./pages/Campaigns/Campaigns"));
const CreateCampaign = lazy(() => import("./pages/Campaigns/CreateCampaign"));
const ViewEditCampaign = lazy(
  () => import("./pages/Campaigns/ViewEditCampaign")
);
const Characters = lazy(() => import("./pages/Characters/Characters"));
const CreateCharacter = lazy(
  () => import("./pages/Characters/CreateCharacter")
);
const ViewEditCharacter = lazy(
  () => import("./pages/Characters/ViewEditCharacter")
);
const Rules = lazy(() => import("./pages/Rules/Rules"));
const Instructions = lazy(() => import("./pages/Instructions/Instructions"));
const NotFound = lazy(() => import("./pages/NotFound/NotFound"));

const App = () => (
  <Routes>
    <Route element={<Layout />}>
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
      <Route path="*" element={<NotFound />} />
    </Route>
  </Routes>
);

export default App;
