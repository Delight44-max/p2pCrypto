import { Client, IMessage, StompSubscription } from "@stomp/stompjs";
import SockJS from "sockjs-client";

class WebSocketService {
    private client: Client | null = null;
    private connected = false;

    connect() {
        if (this.connected) return;

        this.client = new Client({
            webSocketFactory: () =>
                new SockJS(
                    `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}/ws`
                ),
            reconnectDelay: 5000,
            debug: () => {},
        });

        this.client.onConnect = () => {
            this.connected = true;
            console.log("✅ WebSocket Connected");
        };

        this.client.onDisconnect = () => {
            this.connected = false;
            console.log("❌ WebSocket Disconnected");
        };

        this.client.onStompError = (frame) => {
            console.error("STOMP Error:", frame.headers.message);
        };

        this.client.activate();
    }

    disconnect() {
        this.client?.deactivate();
        this.connected = false;
    }

    subscribe(
        destination: string,
        callback: (message: any) => void
    ): StompSubscription | null {
        if (!this.client || !this.connected) {
            return null;
        }

        return this.client.subscribe(destination, (msg: IMessage) => {
            callback(JSON.parse(msg.body));
        });
    }

    send(destination: string, body: any) {
        if (!this.client || !this.connected) {
            return;
        }

        this.client.publish({
            destination,
            body: JSON.stringify(body),
        });
    }

    isConnected() {
        return this.connected;
    }
}

export const websocketService = new WebSocketService();