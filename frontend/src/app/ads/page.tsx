'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { adService } from '@/services/ad.service';
import { Ad } from '@/types';
import {
    formatNaira, formatCrypto, formatDateTime,
    TOKEN_CONFIG, PAYMENT_METHOD_CONFIG, AD_STATUS_CONFIG
} from '@/lib/utils';
import { DashboardShell } from '@/app/dashboard/layout';
import { Plus, Megaphone, Eye, EyeOff, Users } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdsPage() {
    const router = useRouter();
    const { user } = useAuth();
    const [openAds, setOpenAds] = useState<Ad[]>([]);
    const [myAds, setMyAds] = useState<Ad[]>([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState<'open' | 'mine'>('open');

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [openRes, myRes] = await Promise.all([
                adService.getOpenAds(),
                adService.getMyAds(),
            ]);
            setOpenAds(openRes.success ? (openRes.data ?? []) : []);
            setMyAds(myRes.success ? (myRes.data ?? []) : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void fetchData(); }, [fetchData]);

    const isMyAd = (ad: Ad) => ad.buyer?.id === user?.id;

    const handleCancelAd = async (adId: string) => {
        await adService.cancelAd(adId);
        void fetchData();
    };

    const handleExpressInterest = async (ad: Ad) => {
        toast.loading('Notifying buyer...', { id: 'interest' });
        try {
            const res = await adService.expressInterest(ad.id);
            if (res.success && res.data) {
                toast.success('Buyer notified! Redirecting to create trade...', { id: 'interest' });
                const params = new URLSearchParams({
                    walletAddress: ad.walletAddress || ad.buyer?.walletAddress || '',
                    tokenType: ad.tokenType,
                    amount: ad.amount.toString(),
                    paymentMethod: ad.paymentMethod,
                    pricePerUnit: ad.pricePerUnit.toString(),
                    fiatAmount: ad.fiatAmount.toString(),
                    fiatCurrency: ad.fiatCurrency,
                });
                router.push(`/trade/new?${params.toString()}`);
            } else {
                toast.error(res.message || 'Failed to express interest', { id: 'interest' });
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to notify buyer', { id: 'interest' });
        }
    };

    const ads = tab === 'open' ? openAds : myAds;

    return (
        <DashboardShell>
            <div className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-responsive-2xl font-bold text-white">Buy Ads</h1>
                    <p className="text-responsive-sm text-gray-400 mt-0.5">
                        Buyers post their intent — sellers pick the ad that matches
                    </p>
                </div>
                <Link href="/ads/new"
                      className="btn-primary px-5 py-2.5 text-responsive-sm flex items-center gap-2 self-start sm:self-auto">
                    <Plus className="w-4 h-4" />
                    Post Buy Ad
                </Link>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 glass-card rounded-xl p-1 w-full sm:w-fit overflow-x-auto">
                <button
                    onClick={() => setTab('open')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-responsive-sm font-medium transition-all ${
                        tab === 'open'
                            ? 'bg-brand-500/20 text-brand-400 shadow-sm'
                            : 'text-gray-400 hover:text-gray-200'
                    }`}
                >
                    <Eye className="w-4 h-4" />
                    Open Ads
                    <span className="text-responsive-xs text-gray-500">({openAds.length})</span>
                </button>
                <button
                    onClick={() => setTab('mine')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-responsive-sm font-medium transition-all ${
                        tab === 'mine'
                            ? 'bg-brand-500/20 text-brand-400 shadow-sm'
                            : 'text-gray-400 hover:text-gray-200'
                    }`}
                >
                    <EyeOff className="w-4 h-4" />
                    My Ads
                    <span className="text-responsive-xs text-gray-500">({myAds.length})</span>
                </button>
            </div>

            {/* Loading */}
            {loading ? (
                <div className="flex justify-center py-16">
                    <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : ads.length === 0 ? (
                <div className="glass-card rounded-2xl text-center py-16">
                    <Megaphone className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                    <p className="text-responsive-sm text-gray-500 mb-4">
                        {tab === 'open' ? 'No open buy ads right now' : "You haven't posted any buy ads"}
                    </p>
                    {tab === 'mine' && (
                        <Link href="/ads/new"
                              className="btn-primary px-5 py-2.5 text-responsive-sm inline-flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Post Your First Ad
                        </Link>
                    )}
                </div>
            ) : (
                <div className="space-y-2 sm:space-y-3">
                    {ads.map(ad => {
                        const tokenCfg = TOKEN_CONFIG[ad.tokenType];
                        const payCfg = PAYMENT_METHOD_CONFIG[ad.paymentMethod];
                        const statusCfg = AD_STATUS_CONFIG[ad.status];
                        const mine = isMyAd(ad);
                        return (
                            <div key={ad.id} className="glass-card rounded-2xl p-4 sm:p-5 hover:border-brand-500/20 transition-all duration-200">
                                <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <div className="w-10 h-10 bg-dark-500 rounded-xl flex items-center justify-center flex-shrink-0">
                                            <span className="text-xl">{tokenCfg?.icon ?? '🪙'}</span>
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <p className="text-responsive-sm font-semibold text-white">
                                                    Buying {formatCrypto(ad.amount)} {ad.tokenType}
                                                </p>
                                                <span className={`status-badge ${statusCfg?.bg ?? 'bg-gray-500/10'} ${statusCfg?.color ?? 'text-gray-400'}`}>
                                                    {statusCfg?.label ?? ad.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                <span className="text-responsive-xs text-brand-400 font-mono">
                                                    {formatNaira(ad.fiatAmount)}
                                                </span>
                                                <span className="text-responsive-xs text-gray-600">•</span>
                                                <span className="text-responsive-xs text-gray-400">
                                                    {payCfg?.label ?? ad.paymentMethod}
                                                </span>
                                                <span className="text-responsive-xs text-gray-600">•</span>
                                                <span className="text-responsive-xs text-gray-500">
                                                    {formatNaira(ad.pricePerUnit)}/unit
                                                </span>
                                                <span className="text-responsive-xs text-gray-600">•</span>
                                                <span className="text-responsive-xs text-gray-500">
                                                    {formatDateTime(ad.createdAt)}
                                                </span>
                                            </div>
                                            {ad.note && (
                                                <p className="text-responsive-xs text-gray-500 mt-1 italic">
                                                    &ldquo;{ad.note}&rdquo;
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 flex-shrink-0 flex-wrap sm:flex-nowrap">
                                        {/* Buyer info */}
                                        <div className="text-responsive-xs text-gray-400 mr-2 hidden sm:block">
                                            by {ad.buyer?.fullName?.split(' ')[0]}
                                        </div>

                                        {mine && ad.status === 'OPEN' && (
                                            <button
                                                onClick={() => handleCancelAd(ad.id)}
                                                className="px-3 py-1.5 text-responsive-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 rounded-lg transition-all"
                                            >
                                                Clear / Cancel
                                            </button>
                                        )}

                                        {!mine && ad.status === 'OPEN' && (
                                            <button
                                                onClick={() => handleExpressInterest(ad)}
                                                className="btn-primary px-3 sm:px-4 py-1.5 text-responsive-xs flex items-center gap-1.5"
                                            >
                                                <Users className="w-3.5 h-3.5" />
                                                <span className="hidden sm:inline">I'm Interested</span>
                                                <span className="sm:hidden">Interested</span>
                                            </button>
                                        )}

                                        {ad.status !== 'OPEN' && (
                                            <Link
                                                href={`/ads/${ad.id}`}
                                                className="px-3 py-1.5 text-responsive-xs text-gray-400 border border-gray-700/50 hover:bg-gray-800/50 rounded-lg transition-all"
                                            >
                                                View Details
                                            </Link>
                                        )}
                                    </div>
                                </div>

                                {/* Wallet address shown for mine or interested sellers */}
                                {(mine || ad.interestedSeller?.id === user?.id) && (
                                    <div className="mt-3 pt-3 border-t border-gray-800/30">
                                        <p className="text-responsive-xs text-gray-500 mb-1">
                                            {mine ? 'Your wallet address (seller sends crypto here):' : "Buyer's wallet address:"}
                                        </p>
                                        <p className="text-responsive-xs font-mono text-gray-300 bg-dark-500/60 px-3 py-2 rounded-lg border border-gray-800/50 break-all">
                                            {ad.walletAddress}
                                        </p>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
        </DashboardShell>
    );
}
