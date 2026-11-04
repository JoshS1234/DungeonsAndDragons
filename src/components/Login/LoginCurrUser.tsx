import type { FormEvent } from "react";
import "./LoginStyles.scss";

type LoginCurrUserProps = {
  handleSignIn: (e: FormEvent) => void;
  handleSwitchToNewUser: () => void;
  busy: boolean;
};

const LoginCurrUser = ({
  handleSignIn,
  handleSwitchToNewUser,
  busy,
}: LoginCurrUserProps) => {
  return (
    <form className="login-page__form" onSubmit={handleSignIn}>
      <label className="login-page__form-label" htmlFor="email">
        Email
      </label>
      <input
        type="email"
        className="login-page__form-textbox"
        name="email"
        id="email"
        autoComplete="email"
        required
      />
      <label className="login-page__form-label" htmlFor="password">
        Password
      </label>
      <input
        type="password"
        className="login-page__form-textbox"
        name="password"
        id="password"
        autoComplete="current-password"
        required
      />
      <button type="submit" className="login-page__form-button" disabled={busy}>
        {busy ? "Signing in..." : "Sign in"}
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
