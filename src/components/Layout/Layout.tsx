import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Header from "../Header/Header";
import DiceProvider from "../Dice/DiceProvider";

/** Shared frame for every signed-in page. */
const Layout = () => (
  <DiceProvider>
    <div className="app">
      <Header />
      <Suspense fallback={<p className="app-loading">Loading…</p>}>
        <Outlet />
      </Suspense>
    </div>
  </DiceProvider>
);

export default Layout;
