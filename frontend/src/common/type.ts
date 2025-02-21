export type loginCredentials = {
    email: string;
    password: string;
    rememberMe?: boolean;
}

export type tokenPayload = {
    email: string;
    exp: number;
}

export type image = {
    id: string;
    fileName: string
    url: string;
    label: string;
    createdAt: string;
    createdBy: string;
    updatedAt?: string;
    updatedBy?: string;
}