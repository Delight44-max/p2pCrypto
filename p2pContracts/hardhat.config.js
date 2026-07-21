require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: { enabled: true, runs: 200 },
        },
    },
    networks: {
        bscTestnet: {
            url: process.env.BSC_TESTNET_RPC || "https://data-seed-prebsc-1-s1.binance.org:8545",
            chainId: 97,
            accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
        },
        // Added for mainnet migration. Uses a SEPARATE private key
        // (MAINNET_DEPLOYER_PRIVATE_KEY) from testnet on purpose — never
        // reuse a testnet throwaway key for a mainnet deployment that will
        // hold real funds. Leave MAINNET_DEPLOYER_PRIVATE_KEY unset in .env
        // until you are actually ready to deploy to mainnet; `accounts`
        // then safely evaluates to an empty array and this network simply
        // can't be used by accident.
        bscMainnet: {
            url: process.env.BSC_MAINNET_RPC || "https://bsc-dataseed.binance.org",
            chainId: 56,
            accounts: process.env.MAINNET_DEPLOYER_PRIVATE_KEY ? [process.env.MAINNET_DEPLOYER_PRIVATE_KEY] : [],
        },
    },
};
