import { signOut } from "firebase/auth";
import { auth } from "../../../firebaseSetup";
import { Link, useLocation } from "react-router-dom";
import "./Header.scss";

const Header = () => {
  const location = useLocation();
  const isAccountPage = location.pathname === "/account";

  const handleSignOut = () => {
    signOut(auth);
  };

  return (
    <div className="header-bar">
      <h1 className="header-bar__title">Dungeons and Dragons</h1>
      <div className="header-bar__actions">
        <Link
          to={isAccountPage ? "/" : "/account"}
          className="header-bar__account-link"
        >
          {isAccountPage ? "Home" : "My Account"}
        </Link>
        <button className="header-bar__logout" onClick={handleSignOut}>
          Log out
        </button>
      </div>
    </div>
  );
};

export default Header;
