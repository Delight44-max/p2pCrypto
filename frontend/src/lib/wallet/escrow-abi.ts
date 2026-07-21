// lib/wallet/escrow-abi.ts
// Minimal ABI for P2PEscrow — only what the frontend calls directly.
// Full contract source: p2pContracts/contracts/P2PEscrow.sol

export const ESCROW_ABI = [
    'function fundEscrowNative(uint256 tradeId, address buyer) external payable',
    'function fundEscrowToken(uint256 tradeId, address buyer, address token, uint256 amount) external',
    'function releaseEscrow(uint256 tradeId) external',
    'function cancelEscrow(uint256 tradeId) external',
    'function raiseDispute(uint256 tradeId) external',
    'function resolveDispute(uint256 tradeId, address winner) external',
    'function getEscrow(uint256 tradeId) external view returns (address seller, address buyer, address token, uint256 amount, uint8 status)',
    'event EscrowFunded(uint256 indexed tradeId, address indexed seller, address indexed buyer, address token, uint256 amount)',
    'event EscrowReleased(uint256 indexed tradeId, address indexed to, uint256 netAmount, uint256 fee)',
    'event EscrowRefunded(uint256 indexed tradeId, address indexed to, uint256 amount)',
    'event EscrowDisputed(uint256 indexed tradeId, address indexed raisedBy)',
    'event EscrowResolved(uint256 indexed tradeId, address indexed winner, uint256 netAmount, uint256 fee)',
] as const;