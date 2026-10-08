import type { FormEvent } from "react";
import "./LoginStyles.scss";

type LoginNewUserProps = {
  handleSignUp: (e: FormEvent) => void;
  handleSwitchToCurrUser: () => void;
  busy: boolean;
};

const LoginNewUser = ({
  handleSignUp,
  handleSwitchToCurrUser,
  busy,
}: LoginNewUserProps) => {
  return (
    <form className="login-page__form" onSubmit={handleSignUp}>
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
        autoComplete="new-password"
        minLength={6}
        required
      />
      <label className="login-page__form-label" htmlFor="password2">
        Confirm password
      </label>
      <input
        type="password"
        className="login-page__form-textbox"
        name="password2"
        id="password2"
        autoComplete="new-password"
        required
      />
      <button type="submit" className="login-page__form-button" disabled={busy}>
        {busy ? "Creating account..." : "Create account"}
      </button>
      <button
        type="button"
        className="login-page__form-button"
        onClick={handleSwitchToCurrUser}
      >
        Already have account
      </button>
    </form>
  );
};

export default LoginNewUser;
