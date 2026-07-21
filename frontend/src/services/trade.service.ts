import { api } from "@/lib/api";
import { ApiResponse, Trade, ChatMessage } from "@/types";

export interface CreateTradeRequest {
    buyerWalletAddress: string;
    tokenType: "BNB" | "USDT";
    amount: number;
    paymentMethod: "OPAY" | "PALMPAY" | "MONIEPOINT";
    fiatAmount: number;
    pricePerUnit: number;
    fiatCurrency: string;
}

export interface UpdateTradeStatusRequest {
    status:
        | "FUNDED"
        | "PAYMENT_SENT"
        | "COMPLETED"
        | "CANCELLED"
        | "DISPUTED"
        | "RESOLVED"
        | "EXPIRED";
    txHash?: string;
}

export interface OpenDisputeRequest {
    reason: string;
}

export interface SendMessageRequest {
    message: string;
}

class TradeService {
    // Create trade
    createTrade(data: CreateTradeRequest) {
        return api.post<Trade>(
            "/api/trades",
            data
        );
    }

    // My trades
    getMyTrades() {
        return api.get<Trade[]>(
            "/api/trades"
        );
    }

    // Single trade
    getTrade(tradeId: string) {
        return api.get<Trade>(
            `/api/trades/${tradeId}`
        );
    }

    // Update trade status
    updateStatus(
        tradeId: string,
        status: string,
        txHash?: string | undefined
    ) {
        return api.patch<Trade>(
            `/api/trades/${tradeId}/status`,
            {
                status,
                txHash,
            }
        );
    }

    // Open dispute
    openDispute(
        tradeId: string,
        reason: string
    ) {
        return api.post<Trade>(
            `/api/trades/${tradeId}/dispute`,
            {
                reason,
            }
        );
    }

    // Get chat messages
    getMessages(tradeId: string) {
        return api.get<ChatMessage[]>(
            `/api/trades/${tradeId}/messages`
        );
    }

    // Send chat message
    sendMessage(
        tradeId: string,
        message: string
    ) {
        return api.post<ChatMessage>(
            `/api/trades/${tradeId}/messages`,
            {
                message,
            }
        );
    }
}

export const tradeService = new TradeService();