import { api } from "@/lib/api";
import { ApiResponse, User } from "@/types";

export interface UpdateProfileRequest {
    fullName?: string;
    phone?: string;
}

export const profileService = {
    getProfile() {
        return api.get<User>("/api/users/profile");
    },

    update(data: UpdateProfileRequest) {
        return api.put<User>(
            "/api/users/profile",
            data
        );
    },
};