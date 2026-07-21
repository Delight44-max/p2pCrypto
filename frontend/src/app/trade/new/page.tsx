'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { tradeService } from '@/services/trade.service';
import { priceService } from '@/services/price.service';
import { Price } from '@/types';
import { formatNaira } from '@/lib/utils';
import { DashboardShell } from '@/app/dashboard/layout';
import { ArrowLeft, Info } from 'lucide-react';
import toast from 'react-hot-toast';

const PAYMENT_METHODS: {
    value: 'OPAY' | 'PALMPAY' | 'MONIEPOINT';
    label: string;
    emoji: string;
}[] = [
    {
        value: 'OPAY',
        label: 'OPay',
        emoji: '',
    },
    {
        value: 'PALMPAY',
        label: 'PalmPay',
        emoji: '',
    },
    {
        value: 'MONIEPOINT',
        label: 'Moniepoint',
        emoji: '',
    },
];
const TOKENS: {
    value: 'USDT' | 'BNB';
    label: string;
    icon: string;
    desc: string;
}[] = [
    {
        value: 'USDT',
        label: 'USDT',
        icon: '💵',
        desc: 'Tether USD (BEP-20)',
    },
    {
        value: 'BNB',
        label: 'BNB',
        icon: '🟡',
        desc: 'Binance Coin',
    },
];

/** Inner component that uses useSearchParams (must be wrapped in Suspense). */
function NewTradeForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(false);

    // Read pre-fill params from the URL (passed from ads/[id] after "I'm Interested")
    const prefill = {
        walletAddress: searchParams.get('walletAddress') || '',
        tokenType: (searchParams.get('tokenType') || 'USDT') as 'USDT' | 'BNB',
        amount: searchParams.get('amount') || '',
        paymentMethod: (searchParams.get('paymentMethod') || 'OPAY') as 'OPAY' | 'PALMPAY' | 'MONIEPOINT',
    };

    const [form, setForm] = useState({
        buyerWalletAddress: prefill.walletAddress,
        tokenType: prefill.tokenType,
        amount: prefill.amount,
        paymentMethod: prefill.paymentMethod,
        fiatCurrency: 'NGN',
    });

    useEffect(() => {
        priceService
            .getPrices()
            .then((res) => {
                if (res) {
                    setPrices(res.data ?? []);
                }
            })
            .catch(console.error);
    }, []);

  const currentPrice = prices.find(
    p => p.coin === form.tokenType && p.currency === 'NGN'
  );

  const fiatAmount = currentPrice && form.amount
    ? parseFloat(form.amount) * currentPrice.price
    : 0;

  const fee = form.amount ? parseFloat(form.amount) * 0.01 : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.buyerWalletAddress.trim()) {
            toast.error('Buyer wallet address is required');
            return;
        }

        if (!form.buyerWalletAddress.startsWith('0x')) {
            toast.error('Invalid BSC wallet address');
            return;
        }

        if (form.buyerWalletAddress.length !== 42) {
            toast.error('Wallet address must be 42 characters');
            return;
        }

        const amount = Number(form.amount);

        if (isNaN(amount) || amount <= 0) {
            toast.error('Enter a valid amount');
            return;
        }

        if (!currentPrice) {
            toast.error('Unable to fetch current market price.');
            return;
        }

        setLoading(true);

        try {
            const res = await tradeService.createTrade({
                buyerWalletAddress: form.buyerWalletAddress.trim(),
                tokenType: form.tokenType,
                amount,
                paymentMethod: form.paymentMethod,
                fiatAmount,
                pricePerUnit: currentPrice.price,
                fiatCurrency: 'NGN',
            });
            if (!res?.data) {
                toast.error('Failed to create trade');
                return;
            }

            toast.success('Trade created successfully!');

            router.push(`/trade/${res.data.id}`);
        } catch (err: unknown) {
            toast.error(
                err instanceof Error ? err.message : 'Failed to create trade'
            );
        } finally {
            setLoading(false);
        }
    };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-xl transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-responsive-2xl font-bold text-white">Create Trade</h1>
          <p className="text-responsive-sm text-gray-400 mt-0.5">Set up a new P2P escrow trade</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="glass-card rounded-2xl p-3 sm:p-4 border border-brand-500/20 bg-brand-500/5">
        <div className="flex items-start gap-3">
          <Info className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
          <p className="text-responsive-xs text-gray-400 leading-relaxed">
            As the <strong className="text-white">seller</strong>, you will deposit crypto into the smart contract escrow.
            After the buyer sends fiat payment and you confirm receipt, the contract releases crypto to the buyer automatically.
            A <strong className="text-brand-400">1% fee</strong> is deducted from the trade amount.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">

        {/* Token Selection */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 space-y-4">
          <h2 className="text-responsive-base font-semibold text-white">Select Token</h2>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {TOKENS.map(({ value, label, icon, desc }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm(f => ({ ...f, tokenType: value }))}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                  form.tokenType === value
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-gray-800/50 bg-dark-400/30 hover:border-gray-700'
                }`}
              >
                <span className="text-2xl flex-shrink-0">{icon}</span>
                <div className="min-w-0">
                  <p className="text-responsive-sm font-bold text-white">{label}</p>
                  <p className="text-responsive-xs text-gray-400 truncate">{desc}</p>
                  {currentPrice && value === form.tokenType && (
                    <p className="text-responsive-xs text-brand-400 font-mono mt-0.5">
                      {formatNaira(currentPrice.price)}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Trade Details */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 space-y-4">
          <h2 className="text-responsive-base font-semibold text-white">Trade Details</h2>

          <div>
            <label className="block text-responsive-sm font-medium text-gray-300 mb-1.5">
              Buyer's BSC Wallet Address
            </label>
            <input
              type="text"
              required
              value={form.buyerWalletAddress}
              onChange={e => setForm(f => ({ ...f, buyerWalletAddress: e.target.value }))}
              placeholder="0x..."
              className="input-dark px-4 py-3 text-responsive-sm font-mono"
            />
            <p className="text-responsive-xs text-gray-600 mt-1">
              The buyer must be registered on De-tech P2P with this wallet address
            </p>
          </div>

          <div>
            <label className="block text-responsive-sm font-medium text-gray-300 mb-1.5">
              Amount ({form.tokenType})
            </label>
            <input
              type="number"
              required
              min="0"
              step="0.000001"
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              className="input-dark px-4 py-3 text-responsive-sm font-mono"
            />
            {fiatAmount > 0 && (
              <p className="text-responsive-xs text-brand-400 mt-1.5 font-mono">
                ≈ {formatNaira(fiatAmount)} at current rate
              </p>
            )}
          </div>
        </div>

        {/* Payment Method */}
        <div className="glass-card rounded-2xl p-4 sm:p-5 space-y-4">
          <h2 className="text-responsive-base font-semibold text-white">Payment Method</h2>
          <p className="text-responsive-xs text-gray-400">How will the buyer pay you fiat?</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
            {PAYMENT_METHODS.map(({ value, label, emoji }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm(f => ({ ...f, paymentMethod: value }))}
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all ${
                  form.paymentMethod === value
                    ? 'border-brand-500 bg-brand-500/10'
                    : 'border-gray-800/50 bg-dark-400/30 hover:border-gray-700'
                }`}
              >
                <span className="text-xl">{emoji}</span>
                <span className="text-responsive-sm font-medium text-white">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        {form.amount && parseFloat(form.amount) > 0 && (
          <div className="glass-card rounded-2xl p-4 sm:p-5 space-y-3">
            <h2 className="text-responsive-base font-semibold text-white">Trade Summary</h2>
            <div className="space-y-2">
              {[
                { label: 'You sell', value: `${form.amount} ${form.tokenType}` },
                { label: 'Buyer pays', value: fiatAmount > 0 ? formatNaira(fiatAmount) : '---' },
                { label: 'Platform fee (1%)', value: `${fee.toFixed(6)} ${form.tokenType}` },
                { label: 'You receive (net)', value: `${(parseFloat(form.amount) - fee).toFixed(6)} ${form.tokenType} value` },
                { label: 'Payment via', value: PAYMENT_METHODS.find(m => m.value === form.paymentMethod)?.label || '' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between text-responsive-sm">
                  <span className="text-gray-400">{label}</span>
                  <span className="text-white font-mono text-right ml-4">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full py-3 sm:py-4 text-responsive-base"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Creating Trade...
            </span>
          ) : 'Create Trade'}
        </button>
      </form>
    </div>
  );
}

/** Public export: wraps the form in a Suspense boundary for useSearchParams. */
export default function NewTradePage() {
  return (
    <DashboardShell>
      <div className="max-w-2xl mx-auto space-y-6">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        }>
          <NewTradeForm />
        </Suspense>
      </div>
    </DashboardShell>
  );
}