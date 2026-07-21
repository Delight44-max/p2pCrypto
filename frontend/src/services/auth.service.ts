import { api } from "@/lib/api";
import { ApiResponse, AuthUser } from "@/types";

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
}

export const authService = {
    login(data: LoginRequest) {
        return api.post<AuthUser>("/api/auth/login", data);
    },

    register(data: RegisterRequest) {
        return api.post<AuthUser>("/api/auth/register", data);
    },

    me() {
        return api.get<AuthUser>("/api/auth/me");
    },
};