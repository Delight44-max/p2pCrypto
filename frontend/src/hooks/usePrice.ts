'use client';

import { usePrices as usePriceContext } from '@/providers/PriceProvider';

export function usePrices() {
    return usePriceContext();
}