// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract P2PEscrow is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public constant NATIVE = address(0);

    uint256 public constant FEE_BPS = 100;
    uint256 public constant BPS_DENOMINATOR = 10_000;

    enum Status {
        NONE,
        FUNDED,
        RELEASED,
        REFUNDED,
        DISPUTED,
        RESOLVED
    }

    struct Escrow {
        address seller;
        address buyer;
        address token;
        uint256 amount;
        Status status;
    }

    mapping(uint256 => Escrow) public escrows;

    address public platformWallet;
    address public arbitrator;

    event EscrowFunded(
        uint256 indexed tradeId,
        address indexed seller,
        address indexed buyer,
        address token,
        uint256 amount
    );
    event EscrowReleased(uint256 indexed tradeId, address indexed to, uint256 netAmount, uint256 fee);
    event EscrowRefunded(uint256 indexed tradeId, address indexed to, uint256 amount);
    event EscrowDisputed(uint256 indexed tradeId, address indexed raisedBy);
    event EscrowResolved(uint256 indexed tradeId, address indexed winner, uint256 netAmount, uint256 fee);
    event PlatformWalletUpdated(address indexed oldWallet, address indexed newWallet);
    event ArbitratorUpdated(address indexed oldArbitrator, address indexed newArbitrator);

    modifier onlyArbitrator() {
        require(msg.sender == arbitrator, "Not authorized: arbitrator only");
        _;
    }

    modifier escrowExists(uint256 tradeId) {
        require(escrows[tradeId].status != Status.NONE, "Escrow does not exist");
        _;
    }

    constructor(address _platformWallet, address _arbitrator) Ownable(msg.sender) {
        require(_platformWallet != address(0), "Invalid platform wallet");
        require(_arbitrator != address(0), "Invalid arbitrator");
        platformWallet = _platformWallet;
        arbitrator = _arbitrator;
    }

    function fundEscrowNative(uint256 tradeId, address buyer) external payable nonReentrant {
        require(buyer != address(0), "Invalid buyer");
        require(buyer != msg.sender, "Cannot trade with yourself");
        require(msg.value > 0, "Amount must be > 0");
        require(escrows[tradeId].status == Status.NONE, "Trade ID already used");

        escrows[tradeId] = Escrow({
            seller: msg.sender,
            buyer: buyer,
            token: NATIVE,
            amount: msg.value,
            status: Status.FUNDED
        });

        emit EscrowFunded(tradeId, msg.sender, buyer, NATIVE, msg.value);
    }

    function fundEscrowToken(
        uint256 tradeId,
        address buyer,
        address token,
        uint256 amount
    ) external nonReentrant {
        require(buyer != address(0), "Invalid buyer");
        require(buyer != msg.sender, "Cannot trade with yourself");
        require(token != NATIVE, "Use fundEscrowNative for BNB");
        require(amount > 0, "Amount must be > 0");
        require(escrows[tradeId].status == Status.NONE, "Trade ID already used");

        escrows[tradeId] = Escrow({
            seller: msg.sender,
            buyer: buyer,
            token: token,
            amount: amount,
            status: Status.FUNDED
        });

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit EscrowFunded(tradeId, msg.sender, buyer, token, amount);
    }

    function releaseEscrow(uint256 tradeId) external nonReentrant escrowExists(tradeId) {
        Escrow storage e = escrows[tradeId];
        require(msg.sender == e.seller, "Only seller can release");
        require(e.status == Status.FUNDED, "Escrow not in FUNDED state");

        e.status = Status.RELEASED;

        (uint256 net, uint256 fee) = _splitFee(e.amount);
        _payout(e.token, e.buyer, net);
        if (fee > 0) {
            _payout(e.token, platformWallet, fee);
        }

        emit EscrowReleased(tradeId, e.buyer, net, fee);
    }

    function cancelEscrow(uint256 tradeId) external nonReentrant escrowExists(tradeId) {
        Escrow storage e = escrows[tradeId];
        require(msg.sender == e.seller, "Only seller can cancel");
        require(e.status == Status.FUNDED, "Escrow not in FUNDED state");

        e.status = Status.REFUNDED;

        _payout(e.token, e.seller, e.amount);

        emit EscrowRefunded(tradeId, e.seller, e.amount);
    }

    function raiseDispute(uint256 tradeId) external escrowExists(tradeId) {
        Escrow storage e = escrows[tradeId];
        require(msg.sender == e.seller || msg.sender == e.buyer, "Not a participant");
        require(e.status == Status.FUNDED, "Escrow not in FUNDED state");

        e.status = Status.DISPUTED;

        emit EscrowDisputed(tradeId, msg.sender);
    }

    function resolveDispute(uint256 tradeId, address winner)
        external
        nonReentrant
        onlyArbitrator
        escrowExists(tradeId)
    {
        Escrow storage e = escrows[tradeId];
        require(e.status == Status.DISPUTED, "Escrow not under dispute");
        require(winner == e.seller || winner == e.buyer, "Winner must be a participant");

        e.status = Status.RESOLVED;

        (uint256 net, uint256 fee) = _splitFee(e.amount);
        _payout(e.token, winner, net);
        if (fee > 0) {
            _payout(e.token, platformWallet, fee);
        }

        emit EscrowResolved(tradeId, winner, net, fee);
    }

    function setPlatformWallet(address _platformWallet) external onlyOwner {
        require(_platformWallet != address(0), "Invalid wallet");
        emit PlatformWalletUpdated(platformWallet, _platformWallet);
        platformWallet = _platformWallet;
    }

    function setArbitrator(address _arbitrator) external onlyOwner {
        require(_arbitrator != address(0), "Invalid arbitrator");
        emit ArbitratorUpdated(arbitrator, _arbitrator);
        arbitrator = _arbitrator;
    }

    function getEscrow(uint256 tradeId)
        external
        view
        returns (
            address seller,
            address buyer,
            address token,
            uint256 amount,
            Status status
        )
    {
        Escrow storage e = escrows[tradeId];
        return (e.seller, e.buyer, e.token, e.amount, e.status);
    }

    function _splitFee(uint256 amount) internal pure returns (uint256 net, uint256 fee) {
        fee = (amount * FEE_BPS) / BPS_DENOMINATOR;
        net = amount - fee;
    }

    function _payout(address token, address to, uint256 amount) internal {
        if (token == NATIVE) {
            (bool ok, ) = payable(to).call{value: amount}("");
            require(ok, "Native transfer failed");
        } else {
            IERC20(token).safeTransfer(to, amount);
        }
    }

    receive() external payable {
        revert("Use fundEscrowNative()");
    }
}