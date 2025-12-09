import type { FormEvent } from "react";
import "./LoginStyles.scss";

type LoginNewUserProps = {
  handleSignUp: (e: FormEvent) => void;
  handleSwitchToCurrUser: () => void;
};

const LoginNewUser = ({
  handleSignUp,
  handleSwitchToCurrUser,
}: LoginNewUserProps) => {
  return (
    <form className="login-page__form" onSubmit={handleSignUp}>
      <label className="login-page__form-label" htmlFor="email">
        Email
      </label>
      <input type="text" className="login-page__form-textbox" name="email" />
      <label className="login-page__form-label" htmlFor="password">
        Password
      </label>
      <input
        type="password"
        className="login-page__form-textbox"
        name="password"
      />
      <label className="login-page__form-label" htmlFor="password2">
        Confirm password
      </label>
      <input
        type="password"
        className="login-page__form-textbox"
        name="password2"
      />
      <button type="submit" className="login-page__form-button">
        Submit
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
