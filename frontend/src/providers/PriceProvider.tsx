'use client';

import {
    createContext,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from 'react';

import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

import { api } from '@/lib/api';
import { Price } from '@/types';

interface PriceContextType {
    prices: Price[];
    backendOnline: boolean;
}

const PriceContext = createContext<PriceContextType>({
    prices: [],
    backendOnline: false,
});

const API_URL =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export function PriceProvider({
                                  children,
                              }: {
    children: ReactNode;
}) {
    const [prices, setPrices] = useState<Price[]>([]);
    const [backendOnline, setBackendOnline] = useState(false);

    useEffect(() => {
        let client: Client | null = null;
        let cancelled = false;

        async function initialize() {
            const result = await api.get<Price[]>('/api/prices');

            if (cancelled) return;

            if (!result.success || result.offline || !result.data) {
                console.warn('Backend unavailable. Running in offline mode.');

                setBackendOnline(false);
                setPrices([]);

                return;
            }

            // result.data is already Price[]
            setPrices(result.data);
            setBackendOnline(true);

            client = new Client({
                webSocketFactory: () => new SockJS(`${API_URL}/ws`),
                reconnectDelay: 5000,
                debug: () => {},
            });

            client.onConnect = () => {
                console.log('✅ Connected to WebSocket');

                client!.subscribe('/topic/prices', (message) => {
                    if (!message.body) return;

                    try {
                        const data = JSON.parse(message.body) as Price[];

                        setPrices(data);
                    } catch (err) {
                        console.error('Invalid price payload', err);
                    }
                });
            };

            client.onStompError = (frame) => {
                console.error('STOMP Error:', frame.headers['message']);
            };

            client.onWebSocketError = (event) => {
                console.warn('WebSocket error', event);
            };

            client.onWebSocketClose = () => {
                console.log('WebSocket disconnected');
                setBackendOnline(false);
            };

            client.activate();
        }

        initialize();

        return () => {
            cancelled = true;

            if (client?.active) {
                client.deactivate();
            }
        };
    }, []);

    return (
        <PriceContext.Provider
            value={{
                prices,
                backendOnline,
            }}
        >
            {children}
        </PriceContext.Provider>
    );
}

export function usePrices() {
    return useContext(PriceContext);
}