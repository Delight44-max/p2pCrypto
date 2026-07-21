import { useEffect } from "react";
import { websocketService } from "@/services/websocket.service";

export function useWebSocket() {
    useEffect(() => {
        websocketService.connect();

        return () => {
            websocketService.disconnect();
        };
    }, []);

    return websocketService;
}