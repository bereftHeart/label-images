import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

const GuessGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const auth = useContext(AuthContext);
    return auth?.token ? <Navigate to="/" /> : children;
}

export default GuessGuard