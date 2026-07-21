import { api } from "@/lib/api";
import { ApiResponse, DashboardStats, Trade, User } from "@/types";

export const adminService = {
    getDashboard() {
        return api.get<DashboardStats>(
            "/api/admin/dashboard"
        );
    },

    getAllTrades(status?: string) {
        return api.get<Trade[]>(
            `/api/admin/trades${status ? `?status=${status}` : ""}`
        );
    },

    resolveDispute(tradeId: string, winnerId: string) {
        return api.post<Trade>(
            `/api/admin/trades/${tradeId}/resolve`,
            { winnerId }
        );
    },

    getUsers() {
        return api.get<User[]>(
            "/api/admin/users"
        );
    },

    toggleUser(userId: string) {
        return api.patch<void>(
            `/api/admin/users/${userId}/toggle`
        );
    },
};
