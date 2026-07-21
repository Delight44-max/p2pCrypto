const hre = require("hardhat");

// Usage:
//   npx hardhat run scripts/deploy.js --network bscTestnet
//   npx hardhat run scripts/deploy.js --network bscMainnet
//
// On mainnet, MockUSDT is skipped automatically — real Binance-Peg USDT
// already exists there (0x55d398326f99059fF775485246999027B3197955),
// there is nothing to mock.
//
// PLATFORM_WALLET and ARBITRATOR_WALLET should be set explicitly via env
// vars for a real deployment. If left unset, this script falls back to the
// deployer's own address for BOTH roles — convenient for quick testnet
// runs, but you should NOT do this for mainnet: the platform fee wallet
// and the dispute-resolving arbitrator should normally be separate,
// deliberately-chosen addresses, not whichever key happened to pay gas.

const USDT_MAINNET_ADDRESS = "0x55d398326f99059fF775485246999027B3197955";

async function main() {
  const network = hre.network.name;
  const isMainnet = network === "bscMainnet";

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying to ${network} with account:`, deployer.address);

  let usdtAddress;

  if (isMainnet) {
    usdtAddress = USDT_MAINNET_ADDRESS;
    console.log("Using real Binance-Peg USDT on mainnet:", usdtAddress);
  } else {
    const MockUSDT = await hre.ethers.getContractFactory("MockUSDT");
    const mockUsdt = await MockUSDT.deploy();
    await mockUsdt.waitForDeployment();
    usdtAddress = await mockUsdt.getAddress();
    console.log("MockUSDT deployed to:", usdtAddress);
  }

  const platformWallet = process.env.PLATFORM_WALLET || deployer.address;
  const arbitrator = process.env.ARBITRATOR_WALLET || deployer.address;

  if (isMainnet && (platformWallet === deployer.address || arbitrator === deployer.address)) {
    console.warn(
      "\n⚠️  WARNING: PLATFORM_WALLET and/or ARBITRATOR_WALLET were not set " +
      "in .env — falling back to the deployer address for mainnet. This is " +
      "usually NOT what you want for a production deployment. Set both env " +
      "vars explicitly before deploying to mainnet for real.\n"
    );
  }

  const P2PEscrow = await hre.ethers.getContractFactory("P2PEscrow");
  const escrow = await P2PEscrow.deploy(platformWallet, arbitrator);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("P2PEscrow deployed to:", escrowAddress);

  console.log(`\n--- Save these (${network}) ---`);
  console.log("USDT_ADDRESS=", usdtAddress);
  console.log("P2P_ESCROW_ADDRESS=", escrowAddress);
  console.log("PLATFORM_WALLET=", platformWallet);
  console.log("ARBITRATOR_WALLET=", arbitrator);

  if (isMainnet) {
    console.log(
      "\nNext: add these under [BSC_MAINNET_CHAIN_ID] in " +
      "frontend/src/lib/wallet/networks.ts (ESCROW_ADDRESSES and " +
      "USDT_ADDRESSES), and set CONTRACT_ADDRESS / USDT_CONTRACT_ADDRESS " +
      "in the backend .env for mainnet."
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
