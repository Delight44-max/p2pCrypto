import { api } from "@/lib/api";
import { ApiResponse, PriceAlert } from "@/types";

export interface CreateAlertRequest {
    coin: string;
    currency: string;
    targetPrice: number;
    condition: "ABOVE" | "BELOW";
}

export const alertService = {
    create(data: CreateAlertRequest) {
        return api.post<PriceAlert>(
            "/api/prices/alerts",
            data
        );
    },

    getAll() {
        return api.get<PriceAlert[]>(
            "/api/prices/alerts"
        );
    },

    delete(id: string) {
        return api.delete<void>(
            `/api/prices/alerts/${id}`
        );
    },
};