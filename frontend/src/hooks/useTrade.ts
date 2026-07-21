'use client';

import { useCallback, useEffect, useState } from 'react';
import { Trade } from '@/types';
import { tradeService } from '@/services/trade.service';

export function useTrades() {
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setLoading(true);

        try {
            const res = await tradeService.getMyTrades();

            if (!res.success || !res.data) {
                setTrades([]);
                return;
            }

            setTrades(res.data);
        } catch (err) {
            console.error(err);
            setTrades([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    return {
        trades,
        loading,
        refresh,
    };
}