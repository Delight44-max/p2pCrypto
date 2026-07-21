// lib/websocket.ts

import { Client, IMessage } from '@stomp/stompjs';

let client: Client | null = null;

function getToken(): string {
    if (typeof window === 'undefined') {
        return '';
    }

    return localStorage.getItem('token') ?? '';
}

export function getStompClient(): Client {
    if (client) {
        return client;
    }

    const apiUrl =
        process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

    client = new Client({
        webSocketFactory: () => {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const SockJS = require('sockjs-client');
            return new SockJS(`${apiUrl}/ws`);
        },

        reconnectDelay: 5000,

        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,

        debug: (str) => {
            if (process.env.NODE_ENV === 'development') {
                console.log('[STOMP]', str);
            }
        },

        beforeConnect: () => {
            client!.connectHeaders = {
                Authorization: `Bearer ${getToken()}`,
            };
        },

        onConnect: () => {
            console.log('✅ WebSocket connected');
        },

        onDisconnect: () => {
            console.log('🔌 WebSocket disconnected');
        },

        onWebSocketClose: () => {
            console.log('❌ WebSocket closed');
        },

        onStompError: (frame) => {
            console.error(
                'STOMP Error:',
                frame.headers['message'],
                frame.body
            );
        },
    });

    client.activate();

    return client;
}

export async function disconnectStomp(): Promise<void> {
    if (client) {
        await client.deactivate();
        client = null;
    }
}

export type { IMessage };