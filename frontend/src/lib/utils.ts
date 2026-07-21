import { clsx, type ClassValue } from 'clsx';
import { TradeStatus, AdStatus } from '@/types';

export function cn(...inputs: ClassValue[]) { return clsx(inputs); }

export function formatCrypto(amount: number, decimals = 6): string {
  return amount?.toFixed(decimals).replace(/\.?0+$/, '') ?? '0';
}

export function formatNaira(amount: number): string {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(amount);
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(amount);
}

export function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const TRADE_STATUS_CONFIG: Record<TradeStatus, { label: string; color: string; bg: string }> = {
  PENDING:      { label: 'Pending',       color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
  FUNDED:       { label: 'Funded',        color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  PAYMENT_SENT: { label: 'Payment Sent',  color: 'text-cyan-400',   bg: 'bg-cyan-400/10' },
  COMPLETED:    { label: 'Completed',     color: 'text-green-400',  bg: 'bg-green-400/10' },
  CANCELLED:    { label: 'Cancelled',     color: 'text-gray-400',   bg: 'bg-gray-400/10' },
  DISPUTED:     { label: 'Disputed',      color: 'text-red-400',    bg: 'bg-red-400/10' },
  RESOLVED:     { label: 'Resolved',      color: 'text-purple-400', bg: 'bg-purple-400/10' },
  EXPIRED:      { label: 'Expired',       color: 'text-gray-500',   bg: 'bg-gray-500/10' },
};

export const PAYMENT_METHOD_CONFIG = {
  OPAY:        { label: 'OPay',       color: '#00a651' },
  PALMPAY:     { label: 'PalmPay',    color: '#01b768' },
  MONIEPOINT:  { label: 'Moniepoint', color: '#f05a28' },
};

export const TOKEN_CONFIG = {
  USDT: { label: 'USDT', icon: '💵', color: '#26a17b' },
  BNB:  { label: 'BNB',  icon: '🟡', color: '#f3ba2f' },
};

export const AD_STATUS_CONFIG: Record<AdStatus, { label: string; color: string; bg: string }> = {
  OPEN:        { label: 'Open',         color: 'text-green-400',  bg: 'bg-green-400/10' },
  INTERESTED:  { label: 'Interested',   color: 'text-blue-400',   bg: 'bg-blue-400/10' },
  FULFILLED:   { label: 'Fulfilled',    color: 'text-purple-400', bg: 'bg-purple-400/10' },
  CLOSED:      { label: 'Cancelled',    color: 'text-gray-400',   bg: 'bg-gray-400/10' },
};
