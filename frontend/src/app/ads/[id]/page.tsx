'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { adService } from '@/services/ad.service';
import { Ad } from '@/types';
import {
    formatNaira, formatCrypto, formatDateTime, timeAgo,
    TOKEN_CONFIG, PAYMENT_METHOD_CONFIG, AD_STATUS_CONFIG
} from '@/lib/utils';
import { DashboardShell } from '@/app/dashboard/layout';
import {
    ArrowLeft, Wallet, Users, Copy, Check, Shield, Clock, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const [ad, setAd] = useState<Ad | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const adId = params?.id as string;

    const fetchAd = useCallback(async () => {
        try {
            const res = await adService.getAd(adId);
            if (res.success && res.data) {
                setAd(res.data);
            } else {
                toast.error('Ad not found');
                router.push('/ads');
            }
        } catch (err) {
            console.error(err);
            toast.error('Failed to load ad');
        } finally {
            setLoading(false);
        }
    }, [adId, router]);

    useEffect(() => { void fetchAd(); }, [fetchAd]);

    const isBuyer = ad?.buyer?.id === user?.id;
    const isSeller = ad?.interestedSeller?.id === user?.id;

    const handleCancelAd = async () => {
        if (!ad) return;
        setActionLoading(true);
        try {
            const res = await adService.cancelAd(ad.id);
            if (res.success && res.data) {
                setAd(res.data);
                toast.success('Ad cancelled');
            } else {
                toast.error(res.message || 'Failed to cancel');
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to cancel');
        } finally {
            setActionLoading(false);
        }
    };

    const handleExpressInterest = async () => {
        if (!ad) return;
        setActionLoading(true);
        try {
            const res = await adService.expressInterest(ad.id);
            if (res.success && res.data) {
                setAd(res.data);
                toast.success('Interest expressed! Redirecting to create trade...');

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
                toast.error(res.message || 'Failed to express interest');
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCopyWallet = async () => {
        if (!ad?.walletAddress) return;
        try {
            await navigator.clipboard.writeText(ad.walletAddress);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // clipboard not available
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!ad) {
        return (
            <div className="text-center py-16">
                <p className="text-gray-400">Ad not found</p>
                <button onClick={() => router.push('/ads')} className="text-brand-400 mt-2 text-responsive-sm">
                    Back to Ads
                </button>
            </div>
        );
    }

    const statusCfg = AD_STATUS_CONFIG[ad.status];
    const tokenCfg = TOKEN_CONFIG[ad.tokenType];
    const payCfg = PAYMENT_METHOD_CONFIG[ad.paymentMethod];

    return (
        <DashboardShell>
            <div className="max-w-3xl mx-auto space-y-4 sm:space-y-5">
            {/* Header */}
            <div className="flex items-start sm:items-center gap-3">
                <button onClick={() => router.push('/ads')}
                        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-xl transition-all">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                        <h1 className="text-responsive-lg sm:text-responsive-xl font-bold text-white">
                            {tokenCfg.icon} Buying {formatCrypto(ad.amount)} {ad.tokenType}
                        </h1>
                        <span className={`status-badge ${statusCfg.bg} ${statusCfg.color}`}>
                            {statusCfg.label}
                        </span>
                    </div>
                    <p className="text-responsive-xs text-gray-500 mt-0.5">
                        Posted {timeAgo(ad.createdAt)} by {ad.buyer?.fullName}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
                {/* Left: Ad Info */}
                <div className="lg:col-span-1 space-y-3 sm:space-y-4">
                    {/* Ad Details */}
                    <div className="glass-card rounded-2xl p-4 sm:p-5 space-y-3">
                        <h2 className="text-responsive-sm font-semibold text-white mb-3">Ad Details</h2>
                        {[
                            { label: 'Token', value: `${ad.tokenType} (BEP-20)` },
                            { label: 'Amount', value: `${formatCrypto(ad.amount)} ${ad.tokenType}` },
                            { label: 'Fee (1%)', value: `${formatCrypto(ad.feeAmount)} ${ad.tokenType}` },
                            { label: 'Net Amount', value: `${formatCrypto(ad.netAmount)} ${ad.tokenType}` },
                            { label: 'Fiat Value', value: formatNaira(ad.fiatAmount) },
                            { label: 'Price/Unit', value: formatNaira(ad.pricePerUnit) },
                            { label: 'Payment', value: payCfg?.label ?? ad.paymentMethod },
                        ].map(({ label, value }) => (
                            <div key={label} className="flex justify-between text-responsive-xs">
                                <span className="text-gray-500">{label}</span>
                                <span className="text-gray-200 font-mono text-right ml-2">{value}</span>
                            </div>
                        ))}
                    </div>

                    {/* Buyer Info */}
                    <div className="glass-card rounded-2xl p-4 sm:p-5 space-y-3">
                        <h2 className="text-responsive-sm font-semibold text-white">Buyer</h2>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-brand-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                                <span className="text-responsive-xs font-bold text-brand-400">
                                    {ad.buyer?.fullName?.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="min-w-0">
                                <p className="text-responsive-xs font-medium text-white truncate">{ad.buyer?.fullName}</p>
                                <p className="text-responsive-xs text-gray-500">{ad.buyer?.completedTrades} trades • ⭐ {ad.buyer?.rating?.toFixed(1) ?? '0.0'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Wallet Address */}
                    <div className="glass-card rounded-2xl p-4 sm:p-5 space-y-3">
                        <h2 className="text-responsive-sm font-semibold text-white">Wallet Address</h2>
                        <p className="text-responsive-xs text-gray-400">
                            Where the seller should send the crypto
                        </p>
                        <div className="flex items-center gap-2 bg-dark-500/60 border border-gray-800/50 rounded-xl px-3 py-2.5 break-all">
                            <Wallet className="w-4 h-4 text-gray-500 flex-shrink-0" />
                            <span className="text-responsive-xs font-mono text-gray-300 break-all flex-1">
                                {ad.walletAddress}
                            </span>
                            <button
                                onClick={handleCopyWallet}
                                className="p-1.5 text-gray-500 hover:text-brand-400 transition-colors flex-shrink-0"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-brand-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>

                    {/* Note */}
                    {ad.note && (
                        <div className="glass-card rounded-2xl p-4 sm:p-5">
                            <h2 className="text-responsive-sm font-semibold text-white mb-2">Note</h2>
                            <p className="text-responsive-sm text-gray-400 italic">&ldquo;{ad.note}&rdquo;</p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="glass-card rounded-2xl p-4 sm:p-5 space-y-3">
                        <h2 className="text-responsive-sm font-semibold text-white">Actions</h2>

                        {isBuyer && ad.status === 'OPEN' && (
                            <button
                                onClick={handleCancelAd}
                                disabled={actionLoading}
                                className="w-full py-2.5 text-responsive-sm text-red-400 border border-red-500/30 hover:bg-red-500/10 rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                <XCircle className="w-4 h-4" />
                                {actionLoading ? 'Cancelling...' : 'Cancel / Clear Ad'}
                            </button>
                        )}

                        {!isBuyer && ad.status === 'OPEN' && (
                            <button
                                onClick={handleExpressInterest}
                                disabled={actionLoading}
                                className="btn-primary w-full py-2.5 text-responsive-sm flex items-center justify-center gap-2"
                            >
                                <Users className="w-4 h-4" />
                                {actionLoading ? 'Processing...' : "I'm Interested — Notify Buyer"}
                            </button>
                        )}

                        {ad.status !== 'OPEN' && (
                            <div className="text-center py-3">
                                <div className="flex items-center justify-center gap-2 text-responsive-sm text-gray-400">
                                    {ad.status === 'INTERESTED' && <Clock className="w-4 h-4 text-blue-400" />}
                                    {ad.status === 'FULFILLED' && <Shield className="w-4 h-4 text-purple-400" />}
                                    {ad.status === 'CLOSED' && <XCircle className="w-4 h-4 text-gray-400" />}
                                    <span>
                                        {ad.status === 'INTERESTED' && 'A seller has expressed interest. Awaiting trade creation.'}
                                        {ad.status === 'FULFILLED' && 'This ad has been fulfilled (trade created).'}
                                        {ad.status === 'CLOSED' && 'This ad has been cancelled by the buyer.'}
                                    </span>
                                </div>
                            </div>
                        )}

                        {ad.status === 'FULFILLED' && ad.resultingTradeId && (
                            <button
                                onClick={() => router.push(`/trade/${ad.resultingTradeId}`)}
                                className="w-full py-2.5 text-responsive-sm text-brand-400 border border-brand-500/30 hover:bg-brand-500/10 rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                <Shield className="w-4 h-4" />
                                View Trade
                            </button>
                        )}

                        {ad.interestedSeller && (
                            <div className="pt-2 border-t border-gray-800/30">
                                <p className="text-responsive-xs text-gray-500 mb-2">Interested Seller:</p>
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-responsive-xs font-bold text-blue-400">
                                            {ad.interestedSeller.fullName?.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-responsive-xs font-medium text-white truncate">{ad.interestedSeller.fullName}</p>
                                        <p className="text-responsive-xs text-gray-500">{ad.interestedSeller.completedTrades} trades</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Info Panel */}
                <div className="lg:col-span-2 space-y-4 sm:space-y-5">
                    <div className="glass-card rounded-2xl p-4 sm:p-5 space-y-4">
                        <h2 className="text-responsive-base font-semibold text-white">How This Works</h2>

                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="w-7 h-7 bg-brand-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-responsive-xs font-bold text-brand-400">1</span>
                                </div>
                                <div>
                                    <p className="text-responsive-sm font-medium text-white">Buyer Posts Intent</p>
                                    <p className="text-responsive-xs text-gray-400">
                                        The buyer posts an ad with the amount they want, their wallet address,
                                        and their preferred payment method. A 1% platform fee is shown upfront.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="w-7 h-7 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-responsive-xs font-bold text-blue-400">2</span>
                                </div>
                                <div>
                                    <p className="text-responsive-sm font-medium text-white">Seller Expresses Interest</p>
                                    <p className="text-responsive-xs text-gray-400">
                                        When a seller sees an ad they want to fulfill, they click "I'm Interested".
                                        The buyer gets notified in real-time.
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="w-7 h-7 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-responsive-xs font-bold text-cyan-400">3</span>
                                </div>
                                <div>
                                    <p className="text-responsive-sm font-medium text-white">Trade is Created</p>
                                    <p className="text-responsive-xs text-gray-400">
                                        The seller uses the wallet address from the ad to create an escrow trade.
                                        Both parties then follow the standard trade flow (fund → pay → release).
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="w-7 h-7 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                    <span className="text-responsive-xs font-bold text-purple-400">4</span>
                                </div>
                                <div>
                                    <p className="text-responsive-sm font-medium text-white">Trade Completed</p>
                                    <p className="text-responsive-xs text-gray-400">
                                        After the buyer pays and the seller confirms, the escrow releases crypto
                                        to the buyer's wallet. The ad is marked as fulfilled.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {ad.resultingTradeId && (
                            <div className="pt-4 border-t border-gray-800/30">
                                <button
                                    onClick={() => router.push(`/trade/${ad.resultingTradeId}`)}
                                    className="btn-primary w-full py-2.5 text-responsive-sm flex items-center justify-center gap-2"
                                >
                                    <Shield className="w-4 h-4" />
                                    View Resulting Trade
                                </button>
                            </div>
                        )}
                    </div>

                    {ad.status === 'INTERESTED' && (
                        <div className="glass-card rounded-2xl p-4 sm:p-5 border border-blue-500/20 bg-blue-500/5">
                            <div className="flex items-start gap-3">
                                <Users className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-responsive-sm font-medium text-white mb-1">Seller Found!</p>
                                    {isBuyer && (
                                        <p className="text-responsive-xs text-gray-400">
                                            <strong className="text-white">{ad.interestedSeller?.fullName}</strong> is interested in your ad.
                                            They will create a trade using your wallet address. You can communicate with them
                                            once the trade is created.
                                        </p>
                                    )}
                                    {isSeller && (
                                        <p className="text-responsive-xs text-gray-400">
                                            You expressed interest! To proceed, create a trade using the buyer's wallet
                                            address shown above. Go to <strong className="text-white">Trades → New Trade</strong>
                                            {' '}and enter this wallet address as the buyer.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            </div>
        </DashboardShell>
    );
}
