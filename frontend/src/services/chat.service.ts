import { api } from "@/lib/api";
import { ApiResponse, ChatMessage } from "@/types";

export const chatService = {
    getMessages(tradeId: string) {
        return api.get<ChatMessage[]>(
            `/api/trades/${tradeId}/messages`
        );
    },

    sendMessage(tradeId: string, message: string) {
        return api.post<ChatMessage>(
            `/api/trades/${tradeId}/messages`,
            {
                message,
            }
        );
    },
};