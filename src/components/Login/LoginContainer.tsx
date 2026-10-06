import { auth } from "../../../firebaseSetup";
import LoginCurrUser from "./LoginCurrUser";
import { useState } from "react";
import type { FormEvent } from "react";
import LoginNewUser from "./LoginNewUser";
import LoginForgotPassword from "./LoginForgotPassword";
import "./LoginStyles.scss";
import {
  // sendPasswordResetEmail,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";

const readForm = (form: HTMLFormElement): Record<string, string> =>
  Object.fromEntries(
    Array.from(new FormData(form), ([key, value]) => [key, String(value)])
  );

const LoginContainer = () => {
  const [isNewUser, setIsNewUser] = useState(false);
  const [hasForgottenPassword, setHasForgottenPassword] = useState(false);

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

  const handleForgotPasswordEmail = (e: FormEvent) => {
    e.preventDefault();
    const { email } = readForm(e.currentTarget as HTMLFormElement);
    if (email) {
      alert(
        "Normally this function would send a password reset email, however this feature has been disabled as it is a mockup site"
      );
      // sendPasswordResetEmail(auth, email)
      //   .then((data) => {
      //     alert(
      //       "If this email is registered, then a password reset email has been sent"
      //     );
      //   })
      //   .catch((err) => {
      //     alert(err);
      //   });
    } else {
      alert("Please enter your registered email");
    }
  };

  const handleSwitchToNewUser = () => {
    setIsNewUser(true);
    setHasForgottenPassword(false);
  };

  const handleSwitchToCurrUser = () => {
    setIsNewUser(false);
    setHasForgottenPassword(false);
  };

  const handleSwitchToForgotPass = () => {
    setIsNewUser(false);
    setHasForgottenPassword(true);
  };

  return (
    <div className="login-page">
      <h1>Dungeons and Dragons</h1>
      {isNewUser ? (
        <LoginNewUser
          handleSignUp={handleSignUp}
          handleSwitchToCurrUser={handleSwitchToCurrUser}
        />
      ) : hasForgottenPassword ? (
        <LoginForgotPassword
          handleForgotPasswordEmail={handleForgotPasswordEmail}
          handleSwitchToCurrUser={handleSwitchToCurrUser}
        />
      ) : (
        <LoginCurrUser
          handleSignIn={handleSignIn}
          handleSwitchToNewUser={handleSwitchToNewUser}
          handleSwitchToForgotPass={handleSwitchToForgotPass}
        />
      )}
    </div>
  );
};

export default LoginContainer;
