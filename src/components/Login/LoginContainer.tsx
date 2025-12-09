import { auth, db } from "../../../firebaseSetup";
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
import { setDoc, doc } from "firebase/firestore";

const LoginContainer = () => {
  const [isNewUser, setIsNewUser] = useState(false);
  const [hasForgottenPassword, setHasForgottenPassword] = useState(false);

  const handleSignUp = (e: FormEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLFormElement;

    const email = target.email.value;
    const password1 = target.password.value;
    const password2 = target.password2.value;

    if (password1 == password2) {
      createUserWithEmailAndPassword(auth, email, password1)
        .then(() => {
          if (auth.currentUser) {
            setDoc(doc(db, "users", auth.currentUser.uid), {
              favouriteBeers: [],
            });
          }
        })
        .catch((err) => {
          alert(err);
        });
    } else {
      target.reset();
      alert("your passwords did not match");
    }
  };

  const handleSignIn = (e: FormEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLFormElement;

    const email = target.email.value;
    const password = target.password.value;

    signInWithEmailAndPassword(auth, email, password).catch((err) => {
      alert(err);
    });
  };

  const handleForgotPasswordEmail = (e: FormEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLFormElement;

    const email = target.email.value;
    if (!email) {
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
