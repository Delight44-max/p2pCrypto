import { api } from "@/lib/api";
import { ApiResponse, Price } from "@/types";

export const priceService = {
    getPrices() {
        return api.get<Price[]>("/api/prices");
    },
};