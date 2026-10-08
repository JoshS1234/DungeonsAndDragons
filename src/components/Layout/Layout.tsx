import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import Header from "../Header/Header";

/** Shared frame for every signed-in page. */
const Layout = () => (
  <div className="app">
    <Header />
    <Suspense fallback={<p className="app-loading">Loading…</p>}>
      <Outlet />
    </Suspense>
  </div>
);

export default Layout;
