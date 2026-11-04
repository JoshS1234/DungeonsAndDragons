import { useEffect, useState } from "react";
import { HashRouter } from "react-router-dom";
import type { User } from "firebase/auth";
import { auth } from "../../firebaseSetup.ts";
import { CurrentUserContext } from "../auth/currentUser.ts";
import LoginContainer from "../components/Login/LoginContainer.tsx";
import App from "../App.tsx";

const AppContainer = () => {
  // undefined until Firebase has worked out whether anyone is signed in
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => auth.onAuthStateChanged(setUser), []);

  return (
    <div aria-label="whole-app">
      {user === undefined ? (
        <p className="app-loading">Loading…</p>
      ) : user === null ? (
        <LoginContainer />
      ) : (
        <CurrentUserContext.Provider value={user}>
          {/* Keyed by user so the router resets when the user changes */}
          <HashRouter key={user.uid}>
            <App />
          </HashRouter>
        </CurrentUserContext.Provider>
      )}
    </div>
  );
};

export default AppContainer;
