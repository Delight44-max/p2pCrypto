'use client';

import { BrowserProvider } from 'ethers';
import { BSC_TESTNET_CHAIN_ID } from './networks';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Gas-check helpers
// ---------------------------------------------------------------------------

/**
 * Reasonable gas buffer for BSC contract interactions (gwei, gas units).
 * BSC gas price hovers around 3 gwei and a complex contract call (fund,
 * approve, release) costs ~200k–500k gas → ~0.0006–0.0015 BNB. We use a
 * conservative upper bound so we don't have to run `estimateGas` (which
 * itself can fail with the very errors we're trying to avoid).
 */
const GAS_BUFFER_BNB = '0.002';

/**
 * Check that the connected wallet has enough BNB / tBNB to cover gas fees.
 *
 * For **native BNB sends** the tx `value` is also taken into account
 * (balance >= value + gasBuffer).  For pure contract calls only the gas
 * buffer is checked.
 *
 * @returns `null` if the wallet has enough balance, or a user-facing error
 *          message explaining what's missing.
 */
export async function checkGasBalance(
    provider: BrowserProvider | null,
    address: string | null | undefined,
    chainId: number | null,
    /** For native BNB sends – the amount being sent (in BNB as a string). */
    sendingValueBnb?: string,
): Promise<string | null> {
    if (!provider || !address) {
        return null; // wallet not connected; caller will handle that separately
    }

    const parsedBuffer = BigInt(Math.floor(parseFloat(GAS_BUFFER_BNB) * 1e18));
    const extraValue = sendingValueBnb
        ? BigInt(Math.floor(parseFloat(sendingValueBnb) * 1e18))
        : BigInt(0);

    let balance: bigint;
    try {
        balance = await provider.getBalance(address);
    } catch {
        return null; // balance check failed — let the actual tx surface the error
    }

    if (balance < parsedBuffer + extraValue) {
        const isTestnet = chainId === BSC_TESTNET_CHAIN_ID;
        if (isTestnet) {
            return 'Insufficient tBNB to pay gas fees. Please get test BNB from the faucet.';
        }
        return 'Insufficient BNB to pay gas fees.';
    }

    return null;
}

// ---------------------------------------------------------------------------
// Ethers error → friendly string mapping
// ---------------------------------------------------------------------------

/**
 * Map common ethers v6 errors to user-friendly messages so we never show raw
 * revert data, CALL_EXCEPTION, or estimateGas errors in the UI.
 */
export function parseEthersError(error: unknown, chainId: number | null): string {
    // Helper for user-cancelled checks (common to all wallets)
    const msg =
        typeof (error as any)?.reason === 'string'
            ? (error as any).reason
            : typeof (error as any)?.message === 'string'
              ? (error as any).message
              : '';

    // ——— User rejected ———
    if (
        (error as any)?.code === 4001 ||
        /user rejected|user denied|user cancelled|cancelled/i.test(msg)
    ) {
        return 'Transaction cancelled.';
    }

    // ——— Wrong network / Unrecognised chain ———
    if (
        msg.includes('Unrecognized chain ID') ||
        msg.includes('wrong network') ||
        msg.includes('network does not match') ||
        (error as any)?.code === 4902 ||
        msg.includes('CALL_EXCEPTION') // often means wrong-chain deployed contract
    ) {
        return 'Please switch to the correct BNB Smart Chain network.';
    }

    // ——— Insufficient funds (for gas) ———
    const isTestnet = chainId === BSC_TESTNET_CHAIN_ID;
    const nativeSymbol = isTestnet ? 'tBNB' : 'BNB';

    if (
        /insufficient funds/i.test(msg) ||
        /exceeds balance/i.test(msg) ||
        /sender doesn't have enough funds/i.test(msg)
    ) {
        if (isTestnet) {
            return 'Insufficient tBNB to pay gas fees. Please get test BNB from the faucet.';
        }
        return `Insufficient ${nativeSymbol} to pay gas fees.`;
    }

    // ——— ERC20: insufficient allowance ———
    if (
        /insufficient allowance/i.test(msg) ||
        /transfer amount exceeds allowance/i.test(msg) ||
        /ERC20: insufficient allowance/i.test(msg)
    ) {
        return 'Please approve USDT before funding escrow.';
    }

    // ——— ERC20: insufficient balance ———
    if (
        /transfer amount exceeds balance/i.test(msg) ||
        /ERC20: transfer amount exceeds balance/i.test(msg) ||
        /exceeds.*balance/i.test(msg)
    ) {
        return 'Insufficient USDT balance.';
    }

    // ——— ethers v6 CALL_EXCEPTION re-raises ———
    if (
        (error as any)?.code === 'CALL_EXCEPTION' ||
        (error as any)?.code === 'UNPREDICTABLE_GAS_LIMIT'
    ) {
        // Try to extract a revert reason if available
        const revertReason = extractRevertReason(error);
        if (revertReason) {
            return `Transaction reverted: ${revertReason}`;
        }
        return 'Transaction failed. Please try again.';
    }

    // ——— ethers v6 generic ———
    const code = (error as any)?.code;
    if (code === 'BUY_ETH_FALLBACK' || code === 'BUY_ETH') {
        return 'Transaction failed. Please try again.';
    }

    // ——— Provider / network errors ———
    if (
        error instanceof Error &&
        (error.message.includes('could not detect network') ||
            error.message.includes('network changed'))
    ) {
        return 'Network connection lost. Please refresh and try again.';
    }

    // Last resort – try to extract a revert reason from data/args.
    const reason = extractRevertReason(error);
    if (reason) {
        return `Transaction reverted: ${reason}`;
    }

    // If the error contains a "reason" property from ethers, use it
    // (these are often user-readable strings from require/revert statements).
    const reasonProp = (error as any)?.reason;
    if (typeof reasonProp === 'string' && reasonProp.length > 0 && reasonProp.length < 200) {
        return reasonProp;
    }

    return 'Transaction failed. Please try again.';
}

/**
 * Attempt to extract a revert reason from various ethers v6 error shapes.
 */
function extractRevertReason(error: unknown): string | null {
    // Direct revert message on the error object
    const reverted = (error as any)?.revert?.args?.[0];
    if (typeof reverted === 'string') return reverted;

    // error.reason from ethers
    const reason = (error as any)?.reason;
    if (typeof reason === 'string' && reason.length > 0 && reason.length < 300) return reason;

    // Decoded revert data in the error args
    const data = (error as any)?.data;
    if (typeof data?.message === 'string') return data.message;

    // Nested error (ContractTransactionError wraps the inner error)
    const innerError = (error as any)?.error;
    if (innerError) return extractRevertReason(innerError);

    return null;
}

/**
 * Convenience wrapper that:
 * 1. Checks gas balance before the tx
 * 2. Maps any thrown error to a user-friendly string
 * 3. Shows a toast with the mapped message
 *
 * Use inside `catch` blocks of blockchain actions:
 *
 * ```ts
 * try {
 *   await fundEscrowNative(...);
 * } catch (e) {
 *   handleBlockchainError(e, chainId);
 * }
 * ```
 */
export function handleBlockchainError(
    error: unknown,
    chainId: number | null,
): string {
    const message = parseEthersError(error, chainId);
    toast.error(message);
    return message;
}