import "./Portrait.scss";

/** A character's portrait, or their initial if there isn't one. */
const Portrait = ({
  url,
  name,
  size = "medium",
}: {
  url: string;
  name: string;
  size?: "small" | "medium" | "large";
}) =>
  url ? (
    <img
      className={`portrait portrait--${size}`}
      src={url}
      alt={`Portrait of ${name || "character"}`}
    />
  ) : (
    <span
      className={`portrait portrait--${size} portrait--placeholder`}
      aria-hidden="true"
    >
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );

export default Portrait;
