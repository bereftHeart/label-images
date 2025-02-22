import { createContext } from "react";
import { loginCredentials } from "../common/type";

interface AuthContextType {
  user: string;
  token: string | null;
  login: (data: loginCredentials) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);
