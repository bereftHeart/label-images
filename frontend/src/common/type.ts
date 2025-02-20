export type loginCredentials = {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export type tokenPayload = {
    email: string;
    exp: number;
}