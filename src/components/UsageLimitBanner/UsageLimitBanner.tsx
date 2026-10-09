import { useEffect, useState } from "react";
import { isTripped, onTrip, UsageLimitError } from "../../services/usageGuard";

/** Shown across the app if the usage guard has paused Firebase calls. */
const UsageLimitBanner = () => {
  const [tripped, setTripped] = useState(isTripped);

  useEffect(() => onTrip(() => setTripped(true)), []);

  if (!tripped) return null;
  return (
    <div className="usage-limit-banner" role="alert">
      <p>{new UsageLimitError().message}</p>
      <button type="button" onClick={() => window.location.reload()}>
        Reload
      </button>
    </div>
  );
};

export default UsageLimitBanner;
