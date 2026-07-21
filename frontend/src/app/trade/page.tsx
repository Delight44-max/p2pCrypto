'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Trade, ApiResponse } from '@/types';
import {
  formatNaira, formatCrypto, formatDateTime,
  TRADE_STATUS_CONFIG, TOKEN_CONFIG, PAYMENT_METHOD_CONFIG
} from '@/lib/utils';
import { DashboardShell } from '@/app/dashboard/layout';
import { Plus, ArrowLeftRight, Search, Filter } from 'lucide-react';

export default function TradePage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

    const fetchTrades = useCallback(async () => {
        setLoading(true);

        try {
            const res = await api.get<Trade[]>('/api/trades');
            setTrades(res.success ? (res.data ?? []) : []);
        } catch (err) {
            console.error(err);
            setTrades([]);
        } finally {
            setLoading(false);
        }
    }, []);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  const filtered = trades.filter(t => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return t.tokenType.toLowerCase().includes(s) ||
        t.paymentMethod.toLowerCase().includes(s) ||
        t.seller?.fullName?.toLowerCase().includes(s) ||
        t.buyer?.fullName?.toLowerCase().includes(s);
    }
    return true;
  });

  return (
    <DashboardShell>
      <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-responsive-2xl font-bold text-white">My Trades</h1>
          <p className="text-responsive-sm text-gray-400 mt-0.5">{trades.length} total trades</p>
        </div>
        <Link href="/trade/new"
          className="btn-primary px-5 py-2.5 text-responsive-sm flex items-center gap-2 self-start sm:self-auto">
          <Plus className="w-4 h-4" />
          New Trade
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search trades..."
            className="input-dark pl-10 pr-4 py-2.5 text-responsive-sm w-full"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input-dark px-4 py-2.5 text-responsive-sm sm:w-44"
        >
          <option value="">All Status</option>
          {Object.entries(TRADE_STATUS_CONFIG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </select>
      </div>

      {/* Trades */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card rounded-2xl text-center py-16">
          <ArrowLeftRight className="w-10 h-10 text-gray-700 mx-auto mb-3" />
          <p className="text-responsive-sm text-gray-500 mb-4">
            {search || statusFilter ? 'No trades match your filter' : 'No trades yet'}
          </p>
          {!search && !statusFilter && (
            <Link href="/trade/new"
              className="btn-primary px-5 py-2.5 text-responsive-sm inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create your first trade
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => {
            const statusCfg = TRADE_STATUS_CONFIG[t.status];
            return (
              <Link key={t.id} href={`/trade/${t.id}`}
                className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 hover:border-brand-500/20 transition-all duration-200 block">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 bg-dark-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">{TOKEN_CONFIG[t.tokenType].icon}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-responsive-sm font-semibold text-white">
                        {formatCrypto(t.amount)} {t.tokenType}
                      </p>
                      <span className={`status-badge ${statusCfg.bg} ${statusCfg.color}`}>
                        {statusCfg.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-responsive-xs text-gray-400">
                        {formatNaira(t.fiatAmount)}
                      </span>
                      <span className="text-responsive-xs text-gray-600">•</span>
                      <span className="text-responsive-xs text-gray-400">
                        {PAYMENT_METHOD_CONFIG[t.paymentMethod]?.label}
                      </span>
                      <span className="text-responsive-xs text-gray-600">•</span>
                      <span className="text-responsive-xs text-gray-500">
                        {formatDateTime(t.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-responsive-xs text-gray-400 flex-shrink-0">
                  <span>Seller: {t.seller?.fullName?.split(' ')[0]}</span>
                  {t.buyer && <span>→ {t.buyer?.fullName?.split(' ')[0]}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
    </DashboardShell>
  );
}
