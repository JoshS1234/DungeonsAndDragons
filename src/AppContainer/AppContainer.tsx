import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { auth } from "../../firebaseSetup.ts";
import LoginContainer from "../components/Login/LoginContainer.tsx";
import App from "../App.tsx";

const AppContainer = () => {
  const [component, setComponent] = useState(<></>);

  useEffect(() => {
    auth.onAuthStateChanged((user) => {
      if (user) {
        setComponent(
          <BrowserRouter>
            <App />
          </BrowserRouter>
        );
      } else {
        setComponent(<LoginContainer />);
      }
    });
  }, []);

  return <div aria-label="whole-app">{component}</div>;
};

export default AppContainer;
