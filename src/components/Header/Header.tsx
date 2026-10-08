import { signOut } from "firebase/auth";
import { auth } from "../../../firebaseSetup";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./Header.scss";

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHomePage = location.pathname === "/";

  const handleSignOut = () => {
    // Start the next sign-in on the home page rather than wherever this
    // session ended
    navigate("/", { replace: true });
    signOut(auth);
  };

  return (
    <div className="header-bar">
      <h1 className="header-bar__title">Dungeons and Dragons</h1>
      <div className="header-bar__actions">
        {!isHomePage && (
          <Link to="/" className="header-bar__home-link">
            Home
          </Link>
        )}
        <Link to="/account" className="header-bar__account-link">
          My Account
        </Link>
        <button className="header-bar__logout" onClick={handleSignOut}>
          Log out
        </button>
      </div>
    </div>
  );
};

export default Header;
