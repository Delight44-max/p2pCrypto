'use client';

import { useMemo } from 'react';
import { Contract, parseEther, parseUnits } from 'ethers';
import { useWallet } from '@/context/WalletContext';
import { ESCROW_ABI } from '@/lib/wallet/escrow-abi';
import { getEscrowAddress, getUsdtDecimals } from '@/lib/wallet/networks';
import { checkGasBalance, handleBlockchainError } from '@/lib/wallet/errors';

export enum EscrowStatus {
    NONE = 0,
    FUNDED = 1,
    RELEASED = 2,
    REFUNDED = 3,
    DISPUTED = 4,
    RESOLVED = 5,
}

export function useEscrowContract() {
    const { provider, chainId, walletAddress } = useWallet();

    const escrowAddress = getEscrowAddress(chainId);
    const usdtDecimals = getUsdtDecimals(chainId);

    const readOnlyContract = useMemo(() => {
        if (!provider || !escrowAddress) return null;
        return new Contract(escrowAddress, ESCROW_ABI, provider);
    }, [provider, escrowAddress]);

    async function getSignerContract() {
        if (!provider) {
            throw new Error('Wallet not connected');
        }
        if (!escrowAddress) {
            throw new Error('Escrow contract is not configured for the current network.');
        }
        const signer = await provider.getSigner();
        return new Contract(escrowAddress, ESCROW_ABI, signer);
    }

    /**
     * Fund an escrow with native BNB.
     * @param onChainTradeId numeric trade id from TradeDTO.onChainTradeId
     * @param buyerAddress the buyer's wallet address
     * @param amountBnb amount in BNB as a string, e.g. "0.05"
     */
    async function fundEscrowNative(
        onChainTradeId: number | string,
        buyerAddress: string,
        amountBnb: string
    ): Promise<string> {
        if (!walletAddress) throw new Error('Wallet not connected');

        const gasMsg = await checkGasBalance(provider, walletAddress, chainId, amountBnb);
        if (gasMsg !== null) throw new Error(gasMsg);

        const contract = await getSignerContract();

        try {
            const tx = await contract.fundEscrowNative(onChainTradeId, buyerAddress, {
                value: parseEther(amountBnb),
            });
            const receipt = await tx.wait();
            return receipt.hash as string;
        } catch (err) {
            handleBlockchainError(err, chainId);
            throw err;
        }
    }

    /**
     * Fund an escrow with an ERC20 token (USDT). Caller must have already
     * approved the escrow contract for at least `amount` — use
     * useWallet().approveUSDT(escrowAddress, amount) before calling this.
     */
    async function fundEscrowToken(
        onChainTradeId: number | string,
        buyerAddress: string,
        tokenAddress: string,
        amount: string
    ): Promise<string> {
        if (!walletAddress) throw new Error('Wallet not connected');

        const gasMsg = await checkGasBalance(provider, walletAddress, chainId);
        if (gasMsg !== null) throw new Error(gasMsg);

        const contract = await getSignerContract();
        const value = parseUnits(amount, usdtDecimals);

        try {
            const tx = await contract.fundEscrowToken(
                onChainTradeId,
                buyerAddress,
                tokenAddress,
                value
            );
            const receipt = await tx.wait();
            return receipt.hash as string;
        } catch (err) {
            handleBlockchainError(err, chainId);
            throw err;
        }
    }

    /** Seller releases funds to the buyer, minus the 1% platform fee. */
    async function releaseEscrow(onChainTradeId: number | string): Promise<string> {
        const gasMsg = await checkGasBalance(provider, walletAddress, chainId);
        if (gasMsg !== null) throw new Error(gasMsg);

        const contract = await getSignerContract();
        try {
            const tx = await contract.releaseEscrow(onChainTradeId);
            const receipt = await tx.wait();
            return receipt.hash as string;
        } catch (err) {
            handleBlockchainError(err, chainId);
            throw err;
        }
    }

    /** Seller cancels a still-FUNDED escrow, full refund, no fee. */
    async function cancelEscrow(onChainTradeId: number | string): Promise<string> {
        const gasMsg = await checkGasBalance(provider, walletAddress, chainId);
        if (gasMsg !== null) throw new Error(gasMsg);

        const contract = await getSignerContract();
        try {
            const tx = await contract.cancelEscrow(onChainTradeId);
            const receipt = await tx.wait();
            return receipt.hash as string;
        } catch (err) {
            handleBlockchainError(err, chainId);
            throw err;
        }
    }

    /** Either buyer or seller raises a dispute on a FUNDED escrow. */
    async function raiseDispute(onChainTradeId: number | string): Promise<string> {
        const gasMsg = await checkGasBalance(provider, walletAddress, chainId);
        if (gasMsg !== null) throw new Error(gasMsg);

        const contract = await getSignerContract();
        try {
            const tx = await contract.raiseDispute(onChainTradeId);
            const receipt = await tx.wait();
            return receipt.hash as string;
        } catch (err) {
            handleBlockchainError(err, chainId);
            throw err;
        }
    }

    /** Arbitrator-only: resolves a dispute, paying the winner minus fee. */
    async function resolveDispute(
        onChainTradeId: number | string,
        winnerAddress: string
    ): Promise<string> {
        const gasMsg = await checkGasBalance(provider, walletAddress, chainId);
        if (gasMsg !== null) throw new Error(gasMsg);

        const contract = await getSignerContract();
        try {
            const tx = await contract.resolveDispute(onChainTradeId, winnerAddress);
            const receipt = await tx.wait();
            return receipt.hash as string;
        } catch (err) {
            handleBlockchainError(err, chainId);
            throw err;
        }
    }

    /** Read the on-chain escrow state for a trade (view call, no gas, no wallet needed). */
    async function getEscrow(onChainTradeId: number | string) {
        if (!readOnlyContract) {
            throw new Error('Escrow contract is not available (no provider or wrong network).');
        }
        const [seller, buyer, token, amount, status] = await readOnlyContract.getEscrow(
            onChainTradeId
        );
        return {
            seller: seller as string,
            buyer: buyer as string,
            token: token as string,
            amount: amount as bigint,
            status: Number(status) as EscrowStatus,
        };
    }

    return {
        escrowAddress,
        fundEscrowNative,
        fundEscrowToken,
        releaseEscrow,
        cancelEscrow,
        raiseDispute,
        resolveDispute,
        getEscrow,
    };
}