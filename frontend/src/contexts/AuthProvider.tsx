import { jwtDecode } from "jwt-decode";
import React, { useEffect, useState } from "react";
import { notify } from "../common/functions";
import { loginCredentials, tokenPayload } from "../common/type";
import userService from "../services/user";
import { AuthContext } from "./AuthContext";


export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<string>("");
    const [token, setToken] = useState<string | null>(localStorage.getItem("token"));

    useEffect(() => {
        if (token) {
            try {
                const decoded: tokenPayload = jwtDecode(token);
                const currentTime = Math.floor(Date.now() / 1000);

                // Notice user that the token will be expired in 10 seconds
                if (decoded.exp - currentTime < 10) {
                    notify("Token will be expired in 10 seconds", "warning");
                }

                if (decoded.exp < currentTime) {
                    logout();
                } else {
                    setUser(decoded.email);
                }
            } catch (error) {
                console.error("Invalid token:", error);
                logout();
            }
        }
    }, [token]);

    const login = async (data: loginCredentials) => {
        const response = await userService.login(data);

        const { idToken } = response.data;
        setToken(idToken);
        localStorage.setItem("token", idToken);

        const decoded: tokenPayload = jwtDecode(idToken);
        setUser(decoded.email);

        if (data.rememberMe) {
            localStorage.setItem("email", data.email);
            localStorage.setItem("rememberMe", "true");
        } else {
            localStorage.removeItem("email");
            localStorage.removeItem("rememberMe");
        }

        notify("Login successful", "success");
    };

    const logout = () => {
        setToken(null);
        setUser("");
        localStorage.removeItem("token");
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
