import axios from "axios";
import { loginCredentials } from "../common/type";

class UserService {
    private readonly AUTH_URL = `${import.meta.env.VITE_API_BASE_URL}/auth`;
    private api = axios.create({ baseURL: this.AUTH_URL, headers: { "Content-Type": "application/json" } });

    async register(data: loginCredentials) {
        return await this.api.post("/signup", { email: data.email, password: data.password });
    }

    async login(data: loginCredentials) {
        return await this.api.post("/login", { email: data.email, password: data.password });
    }

    async verifyUser(data: { email: string, code: string }) {
        return await this.api.post("/verify-user", { email: data.email, code: data.code });
    }

    async resendVerification(email: string) {
        return await this.api.post("/resend-verification", { email });
    }
}

const userService = new UserService();
export default userService;