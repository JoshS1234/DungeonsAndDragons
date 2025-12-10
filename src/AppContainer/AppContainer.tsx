import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { auth } from "../../firebaseSetup.ts";
import LoginContainer from "../components/Login/LoginContainer.tsx";
import App from "../App.tsx";

const AppContainer = () => {
  const [component, setComponent] = useState(<></>);
  const [userKey, setUserKey] = useState<string | null>(null);

  useEffect(() => {
    auth.onAuthStateChanged((user) => {
      if (user) {
        // Use user ID as key to force BrowserRouter to reset when user changes
        setUserKey(user.uid);
        setComponent(
          <BrowserRouter key={user.uid}>
            <App />
          </BrowserRouter>
        );
      } else {
        setUserKey(null);
        setComponent(<LoginContainer />);
      }
    });
  }, []);

  return <div aria-label="whole-app">{component}</div>;
};

export default AppContainer;
