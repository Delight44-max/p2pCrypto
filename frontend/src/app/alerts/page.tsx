'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api';
import { Price, PriceAlert} from '@/types';
import { formatNaira, formatUSD } from '@/lib/utils';
import { Bell, Plus, Trash2, ArrowUpRight, ArrowDownRight, X } from 'lucide-react';
import { DashboardShell } from '@/app/dashboard/layout';
import toast from 'react-hot-toast';

export default function AlertsPage() {
  const [prices, setPrices] = useState<Price[]>([]);
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ coin: 'BNB', currency: 'NGN', targetPrice: '', condition: 'ABOVE' });
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    try {
        const [pricesRes, alertsRes] = await Promise.all([
            api.get<Price[]>('/api/prices'),
            api.get<PriceAlert[]>('/api/prices/alerts'),
        ]);
        setPrices(pricesRes.success && pricesRes.data ? pricesRes.data : []);
        setAlerts(alertsRes.success && alertsRes.data ? alertsRes.data : []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.targetPrice) { toast.error('Enter a target price'); return; }
    setSaving(true);
    try {
      await api.post('/api/prices/alerts', {
        coin: form.coin,
        currency: form.currency,
        targetPrice: parseFloat(form.targetPrice),
        condition: form.condition,
      });
      toast.success('Alert created!');
      setShowForm(false);
      setForm({ coin: 'BNB', currency: 'NGN', targetPrice: '', condition: 'ABOVE' });
      fetchData();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/api/prices/alerts/${id}`);
      toast.success('Alert deleted');
      setAlerts(a => a.filter(x => x.id !== id));
    } catch { toast.error('Failed to delete'); }
  };

  const getPrice = (coin: string, currency: string) =>
    prices.find(p => p.coin === coin && p.currency === currency);

  const fmt = (currency: string, price: number) =>
    currency === 'NGN' ? formatNaira(price) : formatUSD(price);

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-responsive-2xl font-bold text-white">Price Alerts</h1>
            <p className="text-responsive-sm text-gray-400 mt-0.5">Get notified when prices hit your targets</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary px-5 py-2.5 text-responsive-sm flex items-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            New Alert
          </button>
        </div>

        {/* Live Prices */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {[
            { label: 'BNB / NGN', coin: 'BNB', currency: 'NGN', icon: '🟡' },
            { label: 'USDT / NGN', coin: 'USDT', currency: 'NGN', icon: '💵' },
            { label: 'BNB / USD', coin: 'BNB', currency: 'USD', icon: '🟡' },
          ].map(({ label, coin, currency, icon }) => {
            const data = getPrice(coin, currency);
            return (
              <div key={label} className="glass-card rounded-2xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-responsive-xs text-gray-400">{label}</span>
                  <span className="text-xl">{icon}</span>
                </div>
                <p className="text-responsive-xl font-bold font-mono text-white">
                  {data ? fmt(currency, data.price) : '---'}
                </p>
                {data && (
                  <span className={`flex items-center gap-1 text-responsive-xs mt-1 ${data.change24h >= 0 ? 'text-brand-400' : 'text-red-400'}`}>
                    {data.change24h >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {Math.abs(data.change24h).toFixed(2)}% 24h
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Alerts List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : alerts.length === 0 ? (
          <div className="glass-card rounded-2xl text-center py-16">
            <Bell className="w-10 h-10 text-gray-700 mx-auto mb-3" />
            <p className="text-responsive-sm text-gray-500 mb-4">No price alerts set</p>
            <button onClick={() => setShowForm(true)}
              className="btn-primary px-5 py-2.5 text-responsive-sm inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Set your first alert
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-responsive-base font-semibold text-white">Your Alerts ({alerts.length})</h2>
            {alerts.map(alert => {
              const currentPrice = getPrice(alert.coin, alert.currency);
              return (
                <div key={alert.id} className={`glass-card rounded-2xl p-4 flex items-center gap-4 ${
                  alert.isTriggered ? 'border-brand-500/30 bg-brand-500/5' : ''
                }`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    alert.isTriggered ? 'bg-brand-500/20' : 'bg-dark-500'
                  }`}>
                    <Bell className={`w-4 h-4 ${alert.isTriggered ? 'text-brand-400' : 'text-gray-500'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-responsive-sm font-semibold text-white">
                        {alert.coin}/{alert.currency}
                      </p>
                      <span className={`text-responsive-xs px-2 py-0.5 rounded-full font-medium ${
                        alert.condition === 'ABOVE'
                          ? 'bg-brand-500/20 text-brand-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {alert.condition === 'ABOVE' ? '▲ Above' : '▼ Below'}
                      </span>
                      {alert.isTriggered && (
                        <span className="text-responsive-xs bg-brand-500/20 text-brand-400 px-2 py-0.5 rounded-full">
                          ✓ Triggered
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className="text-responsive-xs text-gray-400 font-mono">
                        Target: {fmt(alert.currency, alert.targetPrice)}
                      </span>
                      {currentPrice && (
                        <span className="text-responsive-xs text-gray-600">
                          Current: {fmt(alert.currency, currentPrice.price)}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(alert.id)}
                    className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all flex-shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Create Alert Modal */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
            <div className="glass-card rounded-2xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-responsive-lg font-bold text-white">Set Price Alert</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateAlert} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-responsive-xs text-gray-400 mb-1.5">Coin</label>
                    <select
                      value={form.coin}
                      onChange={e => setForm(f => ({ ...f, coin: e.target.value }))}
                      className="input-dark px-3 py-2.5 text-responsive-sm w-full"
                    >
                      <option value="BNB">BNB</option>
                      <option value="USDT">USDT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-responsive-xs text-gray-400 mb-1.5">Currency</label>
                    <select
                      value={form.currency}
                      onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                      className="input-dark px-3 py-2.5 text-responsive-sm w-full"
                    >
                      <option value="NGN">NGN</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-responsive-xs text-gray-400 mb-1.5">Condition</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { value: 'ABOVE', label: '▲ Price goes above', color: 'brand' },
                      { value: 'BELOW', label: '▼ Price goes below', color: 'red' },
                    ].map(({ value, label, color }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setForm(f => ({ ...f, condition: value }))}
                        className={`py-2.5 px-3 rounded-xl border-2 text-responsive-xs font-medium transition-all ${
                          form.condition === value
                            ? color === 'brand'
                              ? 'border-brand-500 bg-brand-500/10 text-brand-400'
                              : 'border-red-500 bg-red-500/10 text-red-400'
                            : 'border-gray-800 text-gray-500 hover:border-gray-700'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-responsive-xs text-gray-400 mb-1.5">
                    Target Price ({form.currency})
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={form.targetPrice}
                    onChange={e => setForm(f => ({ ...f, targetPrice: e.target.value }))}
                    placeholder="e.g. 1600"
                    className="input-dark px-4 py-3 text-responsive-sm font-mono w-full"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowForm(false)}
                    className="flex-1 py-2.5 text-responsive-sm text-gray-400 border border-gray-700 rounded-xl hover:bg-gray-800/50 transition-all">
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    className="flex-1 btn-primary py-2.5 text-responsive-sm">
                    {saving ? 'Saving...' : 'Set Alert'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
