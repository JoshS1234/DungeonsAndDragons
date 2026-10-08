import { Link } from "react-router-dom";

const NotFound = () => (
  <div className="page-content">
    <h2>Page not found</h2>
    <p>This page doesn't exist. It may have been moved or deleted.</p>
    <Link to="/" className="back-button">
      Back to home
    </Link>
  </div>
);

export default NotFound;
