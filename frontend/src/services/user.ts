import axios from "axios";
import { loginCredentials } from "../common/type";

class UserService {
  private readonly AUTH_URL = `${import.meta.env.VITE_API_BASE_URL}/auth`;
  private readonly CLIENT_ID = import.meta.env.VITE_CLIENT_ID;
  private api = axios.create({
    baseURL: this.AUTH_URL,
    headers: { "Content-Type": "application/json" },
  });

  async register(data: loginCredentials) {
    return await this.api.post("/signup", {
      email: data.email,
      password: data.password,
      clientId: this.CLIENT_ID,
    });
  }

  async login(data: loginCredentials) {
    return await this.api.post("/login", {
      email: data.email,
      password: data.password,
      clientId: this.CLIENT_ID,
    });
  }

  async verifyUser(data: { email: string; code: string }) {
    return await this.api.post("/verify-user", {
      email: data.email,
      code: data.code,
      clientId: this.CLIENT_ID,
    });
  }

  async resendVerification(email: string) {
    return await this.api.post("/resend-verification", {
      email,
      clientId: this.CLIENT_ID,
    });
  }
}

const userService = new UserService();
export default userService;
