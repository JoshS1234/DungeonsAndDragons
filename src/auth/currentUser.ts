import { createContext, useContext } from "react";
import type { User } from "firebase/auth";

export const CurrentUserContext = createContext<User | null>(null);

/** The signed-in user. Only usable inside the signed-in part of the app. */
export const useCurrentUser = (): User => {
  const user = useContext(CurrentUserContext);
  if (!user) {
    throw new Error("useCurrentUser must be used while signed in");
  }
  return user;
};
