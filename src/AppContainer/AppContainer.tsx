import { useEffect, useState } from "react";
import { HashRouter } from "react-router-dom";
import { auth } from "../../firebaseSetup.ts";
import LoginContainer from "../components/Login/LoginContainer.tsx";
import App from "../App.tsx";

const AppContainer = () => {
  const [component, setComponent] = useState(<></>);

  useEffect(() => {
    auth.onAuthStateChanged((user) => {
      if (user) {
        // Use user ID as key to force HashRouter to reset when user changes
        setComponent(
          <HashRouter key={user.uid}>
            <App />
          </HashRouter>
        );
      } else {
        setComponent(<LoginContainer />);
      }
    });
  }, []);

  return <div aria-label="whole-app">{component}</div>;
};

export default AppContainer;
