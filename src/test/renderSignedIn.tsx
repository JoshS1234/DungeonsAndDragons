import type { ReactElement } from "react";
import { render } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { User } from "firebase/auth";
import { CurrentUserContext } from "../auth/currentUser";
import DiceProvider from "../components/Dice/DiceProvider";

export const testUser = {
  uid: "user-1",
  displayName: "Josh",
  email: "josh@example.com",
} as User;

/**
 * Render a page as a signed-in user. `path` is the route pattern the page
 * is mounted on (e.g. "/characters/:id") and `url` the URL to open.
 */
export const renderSignedIn = (
  page: ReactElement,
  {
    user = testUser,
    path = "/",
    url = path,
  }: { user?: User; path?: string; url?: string } = {}
) =>
  render(
    <CurrentUserContext.Provider value={user}>
      <DiceProvider>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path={path} element={page} />
            <Route path="*" element={<p>Navigated to another page</p>} />
          </Routes>
        </MemoryRouter>
      </DiceProvider>
    </CurrentUserContext.Provider>
  );
