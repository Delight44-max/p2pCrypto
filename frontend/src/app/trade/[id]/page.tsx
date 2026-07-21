'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { useWallet } from '@/context/WalletContext';
import { useEscrowContract } from '@/hooks/useEscrowContract';
import { Trade, ChatMessage } from '@/types';
import {
    formatNaira, formatCrypto, formatDateTime, timeAgo,
    TRADE_STATUS_CONFIG, TOKEN_CONFIG, PAYMENT_METHOD_CONFIG
} from '@/lib/utils';
import { DashboardShell } from '@/app/dashboard/layout';
import {
    ArrowLeft, Send, Shield, AlertTriangle,
    CheckCircle, XCircle, Clock, MessageSquare
} from 'lucide-react';
import toast from 'react-hot-toast';
import { tradeService } from '@/services/trade.service';
import { chatService } from '@/services/chat.service';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export default function TradeDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { user } = useAuth();
    const { connected, walletAddress, approveUSDT, connect, usdtAddress } = useWallet();
    const { escrowAddress, fundEscrowNative, fundEscrowToken, releaseEscrow, cancelEscrow } = useEscrowContract();
    const [trade, setTrade] = useState<Trade | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [sendingMsg, setSendingMsg] = useState(false);
    const [showDispute, setShowDispute] = useState(false);
    const [disputeReason, setDisputeReason] = useState('');
    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const tradeId = params?.id as string;

    const fetchTrade = useCallback(async () => {
        try {
            const tradeRes = await tradeService.getTrade(tradeId);
            const msgRes = await chatService.getMessages(tradeId);
            if (tradeRes.success && tradeRes.data) {
                setTrade(tradeRes.data);
            }
            setMessages(msgRes.data ?? []);
        } catch (err) {
            toast.error('Failed to load trade');
        } finally {
            setLoading(false);
        }
    }, [tradeId]);

    useEffect(() => { fetchTrade(); }, [fetchTrade]);

    useEffect(() => {
        const interval = setInterval(() => {
            fetchTrade();
        }, 30000);
        return () => clearInterval(interval);
    }, [fetchTrade]);

    useEffect(() => {
        if (!tradeId) return;
        const client = new Client({
            webSocketFactory: () => new SockJS(`${API_URL}/ws`),
            reconnectDelay: 5000,
            debug: () => {},
        });
        client.onConnect = () => {
            client.subscribe(`/topic/trades/${tradeId}`, (frame) => {
                try {
                    const incoming: ChatMessage = JSON.parse(frame.body);
                    setMessages((prev) =>
                        prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
                    );
                } catch (err) {
                    console.error('Invalid chat payload', err);
                }
            });
        };
        client.activate();
        return () => { client.deactivate(); };
    }, [tradeId]);

    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [messages]);

    const isSeller = trade?.seller?.id === user?.id;
    const isBuyer = trade?.buyer?.id === user?.id;
    const [pendingAction, setPendingAction] = useState<'FUND' | 'RELEASE' | 'CANCEL' | null>(null);

    useEffect(() => {
        if (!connected || !pendingAction) return;
        const action = pendingAction;
        setPendingAction(null);
        if (action === 'FUND') void runFundEscrow();
        if (action === 'RELEASE') void runReleaseEscrow();
        if (action === 'CANCEL') void runCancelEscrow();
    }, [connected]);

    const handleAction = async (status: string, txHash?: string) => {
        setActionLoading(true);
        try {
            const res = await tradeService.updateStatus(tradeId, status, txHash);
            if (res.success) {
                toast.success(`Trade ${status.toLowerCase().replace('_', ' ')} successfully`);
                if (res.data) {
                    setTrade(res.data);
                } else {
                    await fetchTrade();
                }
            } else {
                toast.error(res.message || 'Failed to update trade status');
            }
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Action failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleFundEscrow = async () => {
        if (!connected || !walletAddress) {
            setPendingAction('FUND');
            try { await connect(); } catch {
                setPendingAction(null);
                toast.error('Wallet connection cancelled');
            }
            return;
        }
        await runFundEscrow();
    };

    const runFundEscrow = async () => {
        if (!trade) return;
        if (!trade.onChainTradeId) {
            toast.error('This trade has no on-chain ID — cannot fund on-chain.');
            return;
        }
        if (!trade.buyer?.walletAddress) {
            toast.error('Buyer has no wallet address on file yet.');
            return;
        }
        setActionLoading(true);
        try {
            let txHash: string;
            if (trade.tokenType === 'BNB') {
                txHash = await fundEscrowNative(trade.onChainTradeId, trade.buyer.walletAddress, trade.amount.toString());
            } else {
                if (!escrowAddress) throw new Error('Escrow contract not configured for this network.');
                if (!usdtAddress) throw new Error('USDT is not configured for the current network.');
                toast.loading('Approving USDT spend...', { id: 'approve' });
                await approveUSDT(escrowAddress, trade.amount.toString());
                toast.dismiss('approve');
                txHash = await fundEscrowToken(trade.onChainTradeId, trade.buyer.walletAddress, usdtAddress, trade.amount.toString());
            }
            await handleAction('FUNDED', txHash);
        } catch (err: unknown) {
            toast.dismiss('approve');
            console.error('Fund escrow failed:', err);
            toast.error(err instanceof Error ? err.message : 'On-chain funding failed. Please try again.');
        } finally {
            setActionLoading(false);
        }
    };

    const handleReleaseEscrow = async () => {
        if (!connected || !walletAddress) {
            setPendingAction('RELEASE');
            try { await connect(); } catch {
                setPendingAction(null);
                toast.error('Wallet connection cancelled');
            }
            return;
        }
        await runReleaseEscrow();
    };

    const runReleaseEscrow = async () => {
        if (!trade?.onChainTradeId) {
            toast.error('This trade has no on-chain ID.');
            return;
        }
        setActionLoading(true);
        try {
            const txHash = await releaseEscrow(trade.onChainTradeId);
            await handleAction('COMPLETED', txHash);
        } catch (err: unknown) {
            console.error('Release escrow failed:', err);
            toast.error(err instanceof Error ? err.message : 'Release failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCancelEscrow = async () => {
        if (!trade) return;
        if (trade.status === 'PENDING') {
            await handleAction('CANCELLED');
            return;
        }
        if (!connected || !walletAddress) {
            setPendingAction('CANCEL');
            try { await connect(); } catch {
                setPendingAction(null);
                toast.error('Wallet connection cancelled');
            }
            return;
        }
        await runCancelEscrow();
    };

    const runCancelEscrow = async () => {
        if (!trade?.onChainTradeId) {
            toast.error('This trade has no on-chain ID.');
            return;
        }
        setActionLoading(true);
        try {
            const txHash = await cancelEscrow(trade.onChainTradeId);
            await handleAction('CANCELLED', txHash);
        } catch (err: unknown) {
            console.error('Cancel escrow failed:', err);
            toast.error(err instanceof Error ? err.message : 'Cancel failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleDispute = async () => {
        if (!disputeReason.trim()) { toast.error('Please provide a reason'); return; }
        setActionLoading(true);
        try {
            await tradeService.openDispute(tradeId, disputeReason);
            toast.success('Dispute opened successfully');
            setShowDispute(false);
            setDisputeReason('');
            await fetchTrade();
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        setSendingMsg(true);
        try {
            const res = await chatService.sendMessage(tradeId, message);
            if (!res.success || !res.data) {
                toast.error(res.message || 'Failed to send message');
                return;
            }
            setMessages(prev =>
                prev.some(msg => msg.id === res.data!.id) ? prev : [...prev, res.data!]
            );
            setMessage('');
        } catch (err: unknown) {
            toast.error(err instanceof Error ? err.message : 'Failed to send message');
        } finally {
            setSendingMsg(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!trade) {
        return (
            <div className="text-center py-16">
                <p className="text-gray-400">Trade not found</p>
                <button onClick={() => router.push('/trade')} className="text-brand-400 mt-2 text-responsive-sm">
                    Back to trades
                </button>
            </div>
        );
    }

    const statusCfg = TRADE_STATUS_CONFIG[trade.status];

    return (
        <DashboardShell>
            <div className="max-w-4xl mx-auto space-y-5">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <button onClick={() => router.back()} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800/50 rounded-xl transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                            <h1 className="text-responsive-lg sm:text-responsive-xl font-bold text-white">
                                {TOKEN_CONFIG[trade.tokenType].icon} {formatCrypto(trade.amount)} {trade.tokenType}
                            </h1>
                            <span className={`status-badge ${statusCfg.bg} ${statusCfg.color}`}>
                                {statusCfg.label}
                            </span>
                        </div>
                        <div className="text-responsive-xs text-gray-500 mt-0.5">
                            <div className="flex items-center gap-2">
                                <span>Trade ID: {trade?.id?.substring(0, 8)}...</span>
                                <button onClick={() => {
                                    if ('id' in trade) {
                                        navigator.clipboard.writeText(trade.id);
                                    }
                                    toast.success('Trade ID copied');
                                }}>
                                    📋
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    {/* Left: Trade Info + Actions */}
                    <div className="lg:col-span-1 space-y-4">
                        <div className="glass-card rounded-2xl p-5 space-y-3">
                            <h2 className="text-responsive-sm font-semibold text-white mb-3">Trade Details</h2>
                            {[
                                { label: 'Token', value: `${trade.tokenType} (BEP-20)` },
                                { label: 'Amount', value: `${formatCrypto(trade.amount)} ${trade.tokenType}` },
                                { label: 'Fee (1%)', value: `${formatCrypto(trade.feeAmount)} ${trade.tokenType}` },
                                { label: 'Fiat Amount', value: formatNaira(trade.fiatAmount) },
                                { label: 'Price/Unit', value: formatNaira(trade.pricePerUnit) },
                                { label: 'Payment', value: PAYMENT_METHOD_CONFIG[trade.paymentMethod]?.label },
                            ].map(({ label, value }) => (
                                <div key={label} className="flex justify-between text-responsive-xs">
                                    <span className="text-gray-500">{label}</span>
                                    <span className="text-gray-200 font-mono text-right ml-2">{value}</span>
                                </div>
                            ))}
                        </div>

                        <div className="glass-card rounded-2xl p-5 space-y-3">
                            <h2 className="text-responsive-sm font-semibold text-white">Participants</h2>
                            {[
                                { role: 'Seller', data: trade.seller },
                                { role: 'Buyer', data: trade.buyer },
                            ].map(({ role, data }) => data && (
                                <div key={role} className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-brand-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-responsive-xs font-bold text-brand-400">
                                            {data.fullName?.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-responsive-xs font-medium text-white truncate">{data.fullName}</p>
                                        <p className="text-responsive-xs text-gray-500">{role} • {data.completedTrades} trades</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="glass-card rounded-2xl p-5">
                            <h2 className="text-responsive-sm font-semibold text-white mb-4">Progress</h2>
                            <div className="space-y-3">
                                {[
                                    { label: 'Trade Created', done: true },
                                    { label: 'Seller Funds Escrow', done: ['FUNDED', 'PAYMENT_SENT', 'COMPLETED', 'RESOLVED'].includes(trade.status) },
                                    { label: 'Buyer Sends Payment', done: ['PAYMENT_SENT', 'COMPLETED', 'RESOLVED'].includes(trade.status) },
                                    { label: 'Trade Completed', done: ['COMPLETED', 'RESOLVED'].includes(trade.status) },
                                ].map(({ label, done }) => (
                                    <div key={label} className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-brand-500' : 'bg-gray-800 border border-gray-700'}`}>
                                            {done && <CheckCircle className="w-3 h-3 text-white" />}
                                        </div>
                                        <span className={`text-responsive-xs ${done ? 'text-white' : 'text-gray-600'}`}>{label}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {['PENDING', 'FUNDED', 'PAYMENT_SENT'].includes(trade.status) && (
                            <div className="glass-card rounded-2xl p-5 space-y-3">
                                <h2 className="text-responsive-sm font-semibold text-white">Actions</h2>
                                {isSeller && trade.status === 'PENDING' && (
                                    <button onClick={handleFundEscrow} disabled={actionLoading} className="btn-primary w-full py-2.5 text-responsive-sm flex items-center justify-center gap-2">
                                        <Shield className="w-4 h-4" />
                                        {actionLoading ? 'Confirm in wallet...' : 'Fund Escrow'}
                                    </button>
                                )}
                                {isBuyer && trade.status === 'FUNDED' && (
                                    <button onClick={() => handleAction('PAYMENT_SENT')} disabled={actionLoading} className="btn-primary w-full py-2.5 text-responsive-sm flex items-center justify-center gap-2">
                                        <CheckCircle className="w-4 h-4" />
                                        I've Sent Payment
                                    </button>
                                )}
                                {isSeller && trade.status === 'PAYMENT_SENT' && (
                                    <button onClick={handleReleaseEscrow} disabled={actionLoading} className="btn-primary w-full py-2.5 text-responsive-sm flex items-center justify-center gap-2">
                                        <CheckCircle className="w-4 h-4" />
                                        {actionLoading ? 'Confirm in wallet...' : 'Release Funds to Buyer'}
                                    </button>
                                )}
                                {['FUNDED', 'PAYMENT_SENT'].includes(trade.status) && (
                                    <>
                                        {!showDispute ? (
                                            <button onClick={() => setShowDispute(true)} className="w-full py-2.5 text-responsive-sm text-red-400 border border-red-500/30 hover:bg-red-500/10 rounded-xl transition-all flex items-center justify-center gap-2">
                                                <AlertTriangle className="w-4 h-4" />
                                                Open Dispute
                                            </button>
                                        ) : (
                                            <div className="space-y-2">
                                                <textarea rows={3} value={disputeReason} onChange={e => setDisputeReason(e.target.value)} placeholder="Explain the issue..." className="input-dark px-3 py-2 text-responsive-xs resize-none w-full" />
                                                <div className="flex gap-2">
                                                    <button onClick={() => setShowDispute(false)} className="flex-1 py-2 text-responsive-xs text-gray-400 border border-gray-700 rounded-xl hover:bg-gray-800/50 transition-all">Cancel</button>
                                                    <button onClick={handleDispute} disabled={actionLoading} className="flex-1 py-2 text-responsive-xs text-red-400 border border-red-500/30 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition-all">Submit</button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                                {(isSeller || isBuyer) && trade.status === 'PENDING' && (
                                    <button onClick={handleCancelEscrow} disabled={actionLoading} className="w-full py-2.5 text-responsive-sm text-gray-400 border border-gray-700/50 hover:bg-gray-800/50 rounded-xl transition-all flex items-center justify-center gap-2">
                                        <XCircle className="w-4 h-4" />
                                        Cancel Trade
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right: Chat */}
                    <div className="lg:col-span-2">
                        <div className="glass-card rounded-2xl flex flex-col h-[400px] sm:h-[500px] lg:h-[580px]">
                            <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-800/50 flex-shrink-0">
                                <MessageSquare className="w-4 h-4 text-brand-400" />
                                <h2 className="text-responsive-sm font-semibold text-white">Trade Chat</h2>
                                <span className="text-responsive-xs text-gray-500 ml-auto">{messages.length} messages</span>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {messages.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-full text-center">
                                        <MessageSquare className="w-8 h-8 text-gray-700 mb-2" />
                                        <p className="text-responsive-xs text-gray-600">No messages yet. Start the conversation!</p>
                                    </div>
                                ) : (
                                    messages.map(msg => {
                                        const isMe = msg.sender?.id === user?.id;
                                        return (
                                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] sm:max-w-[75%] ${isMe ? 'order-2' : 'order-1'}`}>
                                                    {!isMe && (
                                                        <p className="text-responsive-xs text-gray-500 mb-1 ml-1">{msg.sender?.fullName}</p>
                                                    )}
                                                    <div className={`px-4 py-2.5 rounded-2xl text-responsive-sm leading-relaxed ${
                                                        isMe ? 'bg-brand-500 text-white rounded-tr-sm' : 'bg-dark-300/80 text-gray-200 rounded-tl-sm border border-gray-800/50'
                                                    }`}>
                                                        {msg.message}
                                                    </div>
                                                    <p className={`text-responsive-xs text-gray-600 mt-1 ${isMe ? 'text-right' : 'text-left'} mx-1`}>
                                                        {timeAgo(msg.createdAt)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                            {['PENDING', 'FUNDED', 'PAYMENT_SENT', 'DISPUTED'].includes(trade.status) && (
                                <div className="p-4 border-t border-gray-800/50 flex-shrink-0">
                                    <form onSubmit={handleSendMessage} className="flex gap-2">
                                        <input value={message} onChange={e => setMessage(e.target.value)} placeholder="Type a message..." className="input-dark flex-1 px-4 py-2.5 text-responsive-sm" />
                                        <button type="submit" disabled={sendingMsg || !message.trim()} className="btn-primary px-4 py-2.5 flex-shrink-0 disabled:opacity-40">
                                            <Send className="w-4 h-4" />
                                        </button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </DashboardShell>
    );
}