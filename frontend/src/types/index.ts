export interface User {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  walletAddress?: string;
  role: 'USER' | 'ADMIN';
  kycStatus: 'PENDING' | 'VERIFIED' | 'REJECTED';
  opayAccount?: string;
  opayName?: string;
  palmpayAccount?: string;
  palmpayName?: string;
  moniepointAccount?: string;
  moniepointName?: string;
  totalTrades: number;
  completedTrades: number;
  rating: number;
  createdAt: string;
  isActive: boolean;
  isEmailVerified: boolean;
}

export interface Trade {
  id: string;
  onChainTradeId?: number;
  seller: UserSummary;
  buyer?: UserSummary;
  tokenType: 'BNB' | 'USDT';
  amount: number;
  feeAmount: number;
  fiatAmount: number;
  fiatCurrency: string;
  pricePerUnit: number;
  paymentMethod: 'OPAY' | 'PALMPAY' | 'MONIEPOINT';
  status: TradeStatus;
  txHash?: string;
  disputeReason?: string;
  expiresAt?: string;
  cancelledAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type TradeStatus =
  | 'PENDING'
  | 'FUNDED'
  | 'PAYMENT_SENT'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED'
  | 'RESOLVED'
  | 'EXPIRED';

export interface UserSummary {
  id: string;
  fullName: string;
  walletAddress?: string;
  completedTrades: number;
  rating: number;
}

export interface Price {
  coin: string;
  currency: string;
  price: number;
  change24h: number;
  updatedAt: string;
}

export interface PriceAlert {
  id: string;
  coin: string;
  currency: string;
  targetPrice: number;
  condition: 'ABOVE' | 'BELOW';
  isActive: boolean;
  isTriggered: boolean;
  triggeredAt?: string;
  createdAt: string;
}

export interface ChatMessage {
    id: string;
    tradeId: string;
    sender: UserSummary;
    message: string;
    messageType: 'TEXT' | 'IMAGE' | 'SYSTEM';
    status: 'SENT' | 'DELIVERED' | 'READ';
    attachmentUrl?: string;
    isRead: boolean;
    createdAt: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AuthUser {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    walletAddress?: string | null;
    role: 'USER' | 'ADMIN';
    kycStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED';
    totalTrades?: number;
    completedTrades?: number;
    rating?: number;
    token: string;
    opayAccount?: string;
    opayName?: string;

    palmpayAccount?: string;
    palmpayName?: string;

    moniepointAccount?: string;
    moniepointName?: string;
}

export interface DashboardStats {
  totalTrades: number;
  activeTrades: number;
  completedTrades: number;
  disputedTrades: number;
  cancelledTrades: number;
  totalUsers: number;
  verifiedUsers: number;
  pendingKyc: number;
  totalPriceAlerts: number;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface LoginRequest {
    email: string;
    password: string;
}

export interface RegisterRequest {
    fullName: string;
    email: string;
    password: string;
    phone?: string;
}

export interface CreateTradeRequest {
    buyerWalletAddress: string;
    tokenType: 'BNB' | 'USDT';
    amount: number;
    fiatAmount: number;
    fiatCurrency: string;
    pricePerUnit: number;
    paymentMethod: 'OPAY' | 'PALMPAY' | 'MONIEPOINT';
}

export interface UpdateProfileRequest {
    fullName?: string;
    phone?: string;
    walletAddress?: string;

    opayAccount?: string;
    opayName?: string;

    palmpayAccount?: string;
    palmpayName?: string;

    moniepointAccount?: string;
    moniepointName?: string;
}

export interface CreateAlertRequest {
    coin: string;
    currency: string;
    targetPrice: number;
    condition: 'ABOVE' | 'BELOW';
}

// ─── Ad Types ────────────────────────────────────────────────────────────────

export interface Ad {
  id: string;
  buyer: UserSummary;
  tokenType: 'BNB' | 'USDT';
  amount: number;
  feeAmount: number;
  netAmount: number;
  fiatAmount: number;
  fiatCurrency: string;
  pricePerUnit: number;
  paymentMethod: 'OPAY' | 'PALMPAY' | 'MONIEPOINT';
  walletAddress: string;
  status: AdStatus;
  interestedSeller: UserSummary | null;
  resultingTradeId: string | null;
  note: string | null;
  createdAt: string;
}

export type AdStatus = 'OPEN' | 'INTERESTED' | 'FULFILLED' | 'CLOSED';

export interface CreateAdRequest {
  tokenType: 'BNB' | 'USDT';
  amount: number;
  fiatAmount: number;
  fiatCurrency?: string;
  pricePerUnit: number;
  paymentMethod: 'OPAY' | 'PALMPAY' | 'MONIEPOINT';
  walletAddress?: string;
  note?: string;
}