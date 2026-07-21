'use client';

import { useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { api, ApiResult } from '@/lib/api';
import { Trade, Price } from '@/types';
import {
    formatNaira, formatCrypto, formatDateTime,
    TRADE_STATUS_CONFIG, TOKEN_CONFIG, PAYMENT_METHOD_CONFIG
} from '@/lib/utils';
import {
    ArrowLeftRight, TrendingUp, Shield, Plus,
    ArrowUpRight, ArrowDownRight, Clock, Wallet,
    Check, Copy, Megaphone,
} from 'lucide-react';
import { useWallet } from '@/context/WalletContext';

export default function DashboardPage() {
    const { user } = useAuth();
    const { walletAddress } = useWallet();
    const [trades, setTrades] = useState<Trade[]>([]);
    const [prices, setPrices] = useState<Price[]>([]);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    const savedWallet = user?.walletAddress ?? null;
    const displayWallet = savedWallet ?? walletAddress;

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [tradesRes, pricesRes]: [ApiResult<Trade[]>, ApiResult<Price[]>] =
                await Promise.all([
                    api.get<Trade[]>('/api/trades'),
                    api.get<Price[]>('/api/prices'),
                ]);
            setTrades(tradesRes.data || []);
            setPrices(pricesRes.data || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const activeTrades = trades.filter(t => ['PENDING', 'FUNDED', 'PAYMENT_SENT', 'DISPUTED'].includes(t.status));
    const completedTrades = trades.filter(t => t.status === 'COMPLETED');
    const bnbNgn = prices?.find(p => p.coin === 'BNB' && p.currency === 'NGN');
    const usdtNgn = prices?.find(p => p.coin === 'USDT' && p.currency === 'NGN');

    const shortenAddress = (addr: string) =>
        addr.length > 12 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr;

    const handleCopyWallet = async () => {
        if (!displayWallet) return;
        try {
            await navigator.clipboard.writeText(displayWallet);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            // clipboard unavailable, ignore
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-responsive-2xl font-bold text-white">
                        Welcome, {user?.fullName?.split(' ')[0]}
                    </h1>
                    <p className="text-responsive-sm text-gray-400 mt-0.5">
                        Your P2P trading dashboard
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/ads/new"
                          className="btn-secondary px-4 py-2.5 text-responsive-sm flex items-center gap-2 self-start sm:self-auto">
                        <Megaphone className="w-4 h-4" />
                        Post Buy Ad
                    </Link>
                    <Link href="/trade/new"
                          className="btn-primary px-4 py-2.5 text-responsive-sm flex items-center gap-2 self-start sm:self-auto">
                        <Plus className="w-4 h-4" />
                        New Trade
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
                <StatCard icon={<ArrowLeftRight />} label="Total Trades" value={trades.length} color="brand" />
                <StatCard icon={<Clock />} label="Active Trades" value={activeTrades.length} color="cyan" />
                <StatCard icon={<Shield />} label="Completed" value={completedTrades.length} color="green" />
                <StatCard
                    icon={<TrendingUp />}
                    label="Success Rate"
                    value={trades.length > 0
                        ? `${Math.round((completedTrades.length / trades.length) * 100)}%`
                        : '0%'}
                    color="purple"
                />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {[
                    { label: 'BNB / NGN', data: bnbNgn, icon: '🟡' },
                    { label: 'USDT / NGN', data: usdtNgn, icon: '💵' },
                ].map(({ label, data, icon }) => (
                    <div key={label} className="glass-card rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <span className="text-2xl">{icon}</span>
                                <span className="text-responsive-sm text-gray-400">{label}</span>
                            </div>
                            {data ? (
                                <span className={`flex items-center gap-1 text-responsive-xs font-medium px-2 py-1 rounded-lg ${
                                    data.change24h >= 0
                                        ? 'bg-brand-500/10 text-brand-400'
                                        : 'bg-red-500/10 text-red-400'
                                }`}>
                                    {data.change24h >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                    {Math.abs(data.change24h).toFixed(2)}%
                                </span>
                            ) : null}
                        </div>
                        <p className="text-responsive-3xl font-bold font-mono text-white">
                            {data ? formatNaira(data.price) : '---'}
                        </p>
                        <p className="text-responsive-xs text-gray-600 mt-1">Live price • Updates every 30s</p>
                    </div>
                ))}
            </div>

            {/* Wallet — display only, no connect/switch buttons here */}
            {displayWallet && (
                <div className="glass-card rounded-2xl p-5 border border-gray-800/40 bg-dark-500/20">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-800/50 rounded-xl flex items-center justify-center flex-shrink-0">
                            <Wallet className="w-5 h-5 text-gray-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-responsive-sm font-semibold text-gray-300 mb-1">Wallet Address</h3>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-responsive-xs font-mono text-gray-300 bg-dark-500/60 px-2.5 py-1 rounded-lg border border-gray-800/50">
                                    {shortenAddress(displayWallet)}
                                </span>
                                <button
                                    onClick={handleCopyWallet}
                                    className="flex items-center gap-1 text-responsive-xs text-gray-500 hover:text-brand-400 transition-colors"
                                >
                                    {copied ? (<><Check className="w-3.5 h-3.5" />Copied</>) : (<><Copy className="w-3.5 h-3.5" />Copy</>)}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="glass-card rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800/50">
                    <h2 className="text-responsive-base font-semibold text-white">Recent Trades</h2>
                    <Link href="/trade" className="text-responsive-xs text-brand-400 hover:text-brand-300 transition-colors">
                        View all →
                    </Link>
                </div>

                {trades.length === 0 ? (
                    <div className="text-center py-16">
                        <ArrowLeftRight className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                        <p className="text-responsive-sm text-gray-500 mb-4">No trades yet</p>
                        <Link href="/trade/new" className="btn-primary px-5 py-2.5 text-responsive-sm inline-flex items-center gap-2">
                            <Plus className="w-4 h-4" />
                            Start your first trade
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto -mx-5 px-5">
                        <div className="min-w-[520px]">
                            <table className="w-full">
                                <thead className="bg-dark-500/50 border-b border-gray-800/30">
                                <tr>
                                    {['Token', 'Amount', 'Payment', 'Status', 'Date'].map(h => (
                                        <th key={h} className="px-5 py-3 text-left text-responsive-xs font-semibold text-gray-500 uppercase tracking-wide">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/30">
                                {trades.slice(0, 5).map(t => {
                                    const statusCfg = TRADE_STATUS_CONFIG[t.status];
                                    const tokenCfg = TOKEN_CONFIG[t.tokenType];
                                    return (
                                        <tr key={t.id} className="hover:bg-dark-400/30 transition-colors cursor-pointer"
                                            onClick={() => window.location.href = `/trade/${t.id}`}>
                                            <td className="px-5 py-3.5">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">{tokenCfg?.icon ?? '🪙'}</span>
                                                    <span className="text-responsive-sm font-medium text-white">{t.tokenType}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <p className="text-responsive-sm text-white font-mono">{formatCrypto(t.amount)} {t.tokenType}</p>
                                                <p className="text-responsive-xs text-gray-500">{formatNaira(t.fiatAmount)}</p>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className="text-responsive-xs text-gray-400">
                                                    {PAYMENT_METHOD_CONFIG[t.paymentMethod]?.label ?? t.paymentMethod}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <span className={`status-badge ${statusCfg?.bg ?? 'bg-gray-500/10'} ${statusCfg?.color ?? 'text-gray-400'}`}>
                                                    {statusCfg?.label ?? t.status}
                                                </span>
                                            </td>
                                            <td className="px-5 py-3.5 text-responsive-xs text-gray-500">
                                                {formatDateTime(t.createdAt)}
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

interface StatCardProps {
    icon: ReactNode;
    label: string;
    value: string | number;
    color: 'brand' | 'cyan' | 'green' | 'purple';
}

function StatCard({ icon, label, value, color }: StatCardProps) {
    const colorMap: Record<StatCardProps['color'], string> = {
        brand: 'text-brand-400 bg-brand-500/10',
        cyan: 'text-cyan-400 bg-cyan-500/10',
        green: 'text-green-400 bg-green-500/10',
        purple: 'text-purple-400 bg-purple-500/10',
    };
    return (
        <div className="glass-card rounded-2xl p-4">
            <div className={`inline-flex p-2 rounded-xl mb-3 ${colorMap[color]}`}>
                <span className="w-4 h-4">{icon}</span>
            </div>
            <p className="text-responsive-2xl font-bold text-white">{value}</p>
            <p className="text-responsive-xs text-gray-500 mt-0.5">{label}</p>
        </div>
    );
}