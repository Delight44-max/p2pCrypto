// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDT is ERC20, Ownable {

    constructor() ERC20("Mock Tether USD", "USDT") Ownable(msg.sender) {
        // Mint an initial supply to the deployer for convenience
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    // Open mint function so any test wallet can top itself up.
    // Testnet only — remove or restrict before any real deployment.
    function faucet(uint256 amount) external {
        require(amount <= 10_000 * 10 ** decimals(), "Max 10,000 USDT per faucet call");
        _mint(msg.sender, amount);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}