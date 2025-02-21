import { useContext } from "react";
import { Navigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import Header from "../components/Header";

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const auth = useContext(AuthContext);
    return auth?.token ?
        <>
            <Header />
            {children}
        </>
        : <Navigate to="/login" />;
}

export default AuthGuard
