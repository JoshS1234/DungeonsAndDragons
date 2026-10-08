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
import { authErrorMessage } from "../../utils/authErrors";

const readForm = (form: HTMLFormElement): Record<string, string> =>
  Object.fromEntries(
    Array.from(new FormData(form), ([key, value]) => [key, String(value)])
  );

const LoginContainer = () => {
  const [isNewUser, setIsNewUser] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // On success, AppContainer swaps this page out for the app
  const attempt = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  };

  const handleSignUp = (e: FormEvent) => {
    e.preventDefault();
    const { email, password, password2 } = readForm(
      e.currentTarget as HTMLFormElement
    );

    if (password !== password2) {
      setError("Your passwords don't match.");
      return;
    }
    attempt(() => createUserWithEmailAndPassword(auth, email, password));
  };

  const handleSignIn = (e: FormEvent) => {
    e.preventDefault();
    const { email, password } = readForm(e.currentTarget as HTMLFormElement);
    attempt(() => signInWithEmailAndPassword(auth, email, password));
  };

  const switchTo = (newUser: boolean) => () => {
    setIsNewUser(newUser);
    setError(null);
  };

  return (
    <div className="login-page">
      <h1>Dungeons and Dragons</h1>
      {isNewUser ? (
        <LoginNewUser
          handleSignUp={handleSignUp}
          handleSwitchToCurrUser={switchTo(false)}
          busy={busy}
        />
      ) : (
        <LoginCurrUser
          handleSignIn={handleSignIn}
          handleSwitchToNewUser={switchTo(true)}
          busy={busy}
        />
      )}
      {error && (
        <p className="login-page__error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export default LoginContainer;
