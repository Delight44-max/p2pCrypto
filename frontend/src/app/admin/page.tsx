'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Trade, DashboardStats } from '@/types';
import {
    formatNaira, formatCrypto, formatDateTime,
    TRADE_STATUS_CONFIG, TOKEN_CONFIG, PAYMENT_METHOD_CONFIG
} from '@/lib/utils';
import {
    Shield, Users, ArrowLeftRight, AlertTriangle,
    CheckCircle, TrendingUp, Search, Filter,
    XCircle, ShieldCheck, Clock, BellRing
} from 'lucide-react';
import { DashboardShell } from '@/app/dashboard/layout';
import toast from 'react-hot-toast';

export default function AdminPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [trades, setTrades] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('');
    const [search, setSearch] = useState('');
    const [resolving, setResolving] = useState<string | null>(null);

    useEffect(() => {
        if (user && user.role !== 'ADMIN') router.replace('/dashboard');
    }, [user, router]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, tradesRes] = await Promise.all([
                api.get<DashboardStats>('/api/admin/dashboard'),
                api.get<Trade[]>(`/api/admin/trades${statusFilter ? `?status=${statusFilter}` : ''}`),
            ]);
            setStats(statsRes.data);
            setTrades(tradesRes.data || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    }, [statusFilter]);

    useEffect(() => { void fetchData(); }, [fetchData]);

    const handleResolveDispute = async (tradeId: string, winnerId: string) => {
        setResolving(tradeId);
        try {
            await api.post(`/api/admin/trades/${tradeId}/resolve`, { winnerId });
            toast.success('Dispute resolved successfully');
            await fetchData();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to resolve');
        } finally { setResolving(null); }
    };

    const filtered = trades.filter(t => {
        if (!search) return true;
        const s = search.toLowerCase();
        return (
            t.seller?.fullName?.toLowerCase().includes(s) ||
            t.buyer?.fullName?.toLowerCase().includes(s) ||
            t.tokenType.toLowerCase().includes(s) ||
            t.id.includes(s)
        );
    });

    const disputedTrades = trades.filter(t => t.status === 'DISPUTED');

    return (
        <DashboardShell>
            <div className="space-y-6">
                <div>
                    <h1 className="text-responsive-2xl font-bold text-white flex items-center gap-2">
                        <Shield className="w-6 h-6 text-brand-400" />
                        Admin Panel
                    </h1>
                    <p className="text-responsive-sm text-gray-400 mt-0.5">Manage trades, disputes, and platform stats</p>
                </div>

                {/* Stat Cards */}
                {stats ? (
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        {[
                            { label: 'Total Trades', value: stats.totalTrades, icon: <ArrowLeftRight />, color: 'brand' },
                            { label: 'Active', value: stats.activeTrades, icon: <TrendingUp />, color: 'cyan' },
                            { label: 'Completed', value: stats.completedTrades, icon: <CheckCircle />, color: 'green' },
                            { label: 'Disputed', value: stats.disputedTrades, icon: <AlertTriangle />, color: 'red' },
                            { label: 'Cancelled', value: stats.cancelledTrades, icon: <XCircle />, color: 'amber' },
                            { label: 'Total Users', value: stats.totalUsers, icon: <Users />, color: 'purple' },
                            { label: 'Verified Users', value: stats.verifiedUsers, icon: <ShieldCheck />, color: 'brand' },
                            { label: 'Pending KYC', value: stats.pendingKyc, icon: <Clock />, color: 'amber' },
                            { label: 'Price Alerts', value: stats.totalPriceAlerts, icon: <BellRing />, color: 'cyan' },
                        ].map(({ label, value, icon, color }) => {
                            const colorMap: Record<string, string> = {
                                brand: 'text-brand-400 bg-brand-500/10',
                                cyan: 'text-cyan-400 bg-cyan-500/10',
                                green: 'text-green-400 bg-green-500/10',
                                red: 'text-red-400 bg-red-500/10',
                                purple: 'text-purple-400 bg-purple-500/10',
                                amber: 'text-amber-400 bg-amber-500/10',
                            };
                            return (
                                <div key={label} className="glass-card rounded-2xl p-4">
                                    <div className={`inline-flex p-2 rounded-xl mb-3 ${colorMap[color]}`}>
                                        <span className="w-4 h-4">{icon}</span>
                                    </div>
                                    <p className="text-responsive-2xl font-bold text-white">{value}</p>
                                    <p className="text-responsive-xs text-gray-500 mt-0.5">{label}</p>
                                </div>
                            );
                        })}
                    </div>
                ) : null}

                {/* Disputed Trades Alert */}
                {disputedTrades.length > 0 ? (
                    <div className="glass-card rounded-2xl p-5 border border-red-500/30 bg-red-500/5">
                        <div className="flex items-center gap-3 mb-4">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                            <h2 className="text-responsive-base font-semibold text-red-400">
                                {disputedTrades.length} Disputed Trade{disputedTrades.length !== 1 ? 's' : ''} Require Attention
                            </h2>
                        </div>
                        <div className="space-y-3">
                            {disputedTrades.map(t => (
                                <div key={t.id} className="bg-dark-500/50 rounded-xl p-4">
                                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-responsive-sm font-bold text-white">
                          {TOKEN_CONFIG[t.tokenType].icon} {formatCrypto(t.amount)} {t.tokenType}
                        </span>
                                                <span className="text-responsive-xs text-gray-400">
                          = {formatNaira(t.fiatAmount)}
                        </span>
                                            </div>
                                            <p className="text-responsive-xs text-gray-400 mb-1">
                                                Seller: <strong className="text-white">{t.seller?.fullName}</strong> vs
                                                Buyer: <strong className="text-white">{t.buyer?.fullName}</strong>
                                            </p>
                                            {t.disputeReason ? (
                                                <p className="text-responsive-xs text-red-300/70 italic">
                                                    &quot;{t.disputeReason}&quot;
                                                </p>
                                            ) : null}
                                            <p className="text-responsive-xs text-gray-600 mt-1">
                                                {formatDateTime(t.createdAt)}
                                            </p>
                                        </div>
                                        {t.seller && t.buyer ? (
                                            <div className="flex flex-col gap-2 flex-shrink-0">
                                                <p className="text-responsive-xs text-gray-500 text-center">Resolve in favor of:</p>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleResolveDispute(t.id, t.seller.id)}
                                                        disabled={resolving === t.id}
                                                        className="px-3 py-1.5 text-responsive-xs bg-brand-500/20 text-brand-400 border border-brand-500/30 rounded-lg hover:bg-brand-500/30 transition-all disabled:opacity-50"
                                                    >
                                                        {resolving === t.id ? '...' : `Seller`}
                                                    </button>
                                                    <button
                                                        onClick={() => handleResolveDispute(t.id, t.buyer!.id)}
                                                        disabled={resolving === t.id}
                                                        className="px-3 py-1.5 text-responsive-xs bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg hover:bg-cyan-500/30 transition-all disabled:opacity-50"
                                                    >
                                                        {resolving === t.id ? '...' : `Buyer`}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : null}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : null}

                {/* All Trades Table */}
                <div className="glass-card rounded-2xl overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-gray-800/50">
                        <h2 className="text-responsive-base font-semibold text-white">All Trades</h2>
                        <div className="flex gap-3 sm:ml-auto">
                            <div className="relative flex-1 sm:flex-none">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
                                <input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search..."
                                    className="input-dark pl-8 pr-3 py-2 text-responsive-xs w-full sm:w-44"
                                />
                            </div>
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="input-dark px-3 py-2 text-responsive-xs sm:w-36"
                            >
                                <option value="">All Status</option>
                                {Object.entries(TRADE_STATUS_CONFIG).map(([key, cfg]) => (
                                    <option key={key} value={key}>{cfg.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-12">
                            <Filter className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                            <p className="text-responsive-sm text-gray-500">No trades found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[640px]">
                                <thead className="bg-dark-500/50 border-b border-gray-800/30">
                                <tr>
                                    {['Seller', 'Buyer', 'Token', 'Amount', 'Payment', 'Status', 'Date'].map(h => (
                                        <th key={h} className="px-4 py-3 text-left text-responsive-xs font-semibold text-gray-500 uppercase tracking-wide">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/30">
                                {filtered.map(t => {
                                    const statusCfg = TRADE_STATUS_CONFIG[t.status];
                                    return (
                                        <tr
                                            key={t.id}
                                            className="hover:bg-dark-400/30 transition-colors cursor-pointer"
                                            onClick={() => router.push(`/trade/${t.id}`)}
                                        >
                                            <td className="px-4 py-3 text-responsive-sm text-gray-300">
                                                {t.seller?.fullName?.split(' ')[0]}
                                            </td>
                                            <td className="px-4 py-3 text-responsive-sm text-gray-300">
                                                {t.buyer?.fullName?.split(' ')[0] || '—'}
                                            </td>
                                            <td className="px-4 py-3">
                          <span className="flex items-center gap-1.5 text-responsive-sm text-white">
                            {TOKEN_CONFIG[t.tokenType].icon} {t.tokenType}
                          </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-responsive-sm text-white font-mono">{formatCrypto(t.amount)}</p>
                                                <p className="text-responsive-xs text-gray-500">{formatNaira(t.fiatAmount)}</p>
                                            </td>
                                            <td className="px-4 py-3 text-responsive-xs text-gray-400">
                                                {PAYMENT_METHOD_CONFIG[t.paymentMethod]?.label}
                                            </td>
                                            <td className="px-4 py-3">
                          <span className={`status-badge ${statusCfg.bg} ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                                            </td>
                                            <td className="px-4 py-3 text-responsive-xs text-gray-500">
                                                {formatDateTime(t.createdAt)}
                                            </td>
                                        </tr>
                                    );
                                })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </DashboardShell>
    );
}
