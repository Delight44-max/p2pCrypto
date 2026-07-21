import { api } from '@/lib/api';
import { Ad, CreateAdRequest } from '@/types';

export const adService = {
    getOpenAds: () =>
        api.get<Ad[]>('/api/ads'),

    getMyAds: () =>
        api.get<Ad[]>('/api/ads/mine'),

    getAd: (adId: string) =>
        api.get<Ad>(`/api/ads/${adId}`),

    createAd: (request: CreateAdRequest) =>
        api.post<Ad>('/api/ads', request),

    cancelAd: (adId: string) =>
        api.post<Ad>(`/api/ads/${adId}/cancel`, {}),

    expressInterest: (adId: string) =>
        api.post<Ad>(`/api/ads/${adId}/interested`, {}),
};