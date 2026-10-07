import type { FormEvent } from "react";
import "./LoginStyles.scss";

type LoginCurrUserProps = {
  handleSignIn: (e: FormEvent) => void;
  handleSwitchToNewUser: () => void;
};

const LoginCurrUser = ({
  handleSignIn,
  handleSwitchToNewUser,
}: LoginCurrUserProps) => {
  return (
    <form className="login-page__form" onSubmit={handleSignIn}>
      <label className="login-page__form-label" htmlFor="email">
        Email
      </label>
      <input
        type="text"
        className="login-page__form-textbox"
        name="email"
        id="email"
      />
      <label className="login-page__form-label" htmlFor="password">
        Password
      </label>
      <input
        type="password"
        className="login-page__form-textbox"
        name="password"
        id="password"
      />
      <button type="submit" className="login-page__form-button">
        Submit
      </button>
      <button
        type="button"
        className="login-page__form-button"
        onClick={handleSwitchToNewUser}
      >
        New user
      </button>
    </form>
  );
};

export default LoginCurrUser;
