const MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/invalid-email": "That doesn't look like a valid email address.",
  "auth/missing-password": "Please enter a password.",
  "auth/email-already-in-use": "An account with that email already exists.",
  "auth/weak-password": "Passwords must be at least 6 characters.",
  "auth/too-many-requests":
    "Too many attempts. Please wait a moment and try again.",
  // Sign-up switched off in Firebase (Authentication → Settings)
  "auth/admin-restricted-operation":
    "New sign-ups are closed. Ask whoever runs the site to let you in.",
  "auth/network-request-failed":
    "Couldn't reach the server. Check your connection and try again.",
};

/** A friendly message for a Firebase Auth error. */
export const authErrorMessage = (err: unknown): string => {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String(err.code)
      : "";
  return MESSAGES[code] ?? "Something went wrong. Please try again.";
};
