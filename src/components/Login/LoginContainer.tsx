import { auth } from "../../../firebaseSetup";
import LoginCurrUser from "./LoginCurrUser";
import { useState } from "react";
import type { FormEvent } from "react";
import LoginNewUser from "./LoginNewUser";
import "./LoginStyles.scss";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";

const readForm = (form: HTMLFormElement): Record<string, string> =>
  Object.fromEntries(
    Array.from(new FormData(form), ([key, value]) => [key, String(value)])
  );

const LoginContainer = () => {
  const [isNewUser, setIsNewUser] = useState(false);

  const handleSignUp = (e: FormEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLFormElement;
    const { email, password: password1, password2 } = readForm(target);

    if (password1 == password2) {
      createUserWithEmailAndPassword(auth, email, password1).catch((err) => {
        alert(err);
      });
    } else {
      target.reset();
      alert("your passwords did not match");
    }
  };

  const handleSignIn = (e: FormEvent) => {
    e.preventDefault();
    const { email, password } = readForm(e.currentTarget as HTMLFormElement);

    signInWithEmailAndPassword(auth, email, password).catch((err) => {
      alert(err);
    });
  };

  const handleSwitchToNewUser = () => setIsNewUser(true);
  const handleSwitchToCurrUser = () => setIsNewUser(false);

  return (
    <div className="login-page">
      <h1>Dungeons and Dragons</h1>
      {isNewUser ? (
        <LoginNewUser
          handleSignUp={handleSignUp}
          handleSwitchToCurrUser={handleSwitchToCurrUser}
        />
      ) : (
        <LoginCurrUser
          handleSignIn={handleSignIn}
          handleSwitchToNewUser={handleSwitchToNewUser}
        />
      )}
    </div>
  );
};

export default LoginContainer;
