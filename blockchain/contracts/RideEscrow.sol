// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract RideEscrow is ReentrancyGuard, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    uint256 private _rideCounter;

    enum RideState {
        Requested,
        Accepted,
        Started,
        Completed,
        Cancelled,
        Disputed
    }

    struct Ride {
        address payable rider;
        address payable driver;
        uint256 maxFare;
        uint256 finalFare;
        uint256 expiry;
        bytes32 commitHash;
        RideState state;
    }

    mapping(uint256 => Ride) public rides;

    // ========= EVENTS =========
    event RideCreated(
        uint256 indexed rideId,
        address indexed rider,
        uint256 maxFare,
        uint256 expiry,
        bytes32 commitHash
    );

    event RideAccepted(uint256 indexed rideId, address indexed driver);
    event RideStarted(uint256 indexed rideId);
    event RideCompleted(
        uint256 indexed rideId,
        uint256 finalFare,
        uint256 driverPaid,
        uint256 riderRefund
    );
    event RideCancelled(uint256 indexed rideId);
    event DisputeOpened(uint256 indexed rideId, address openedBy);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    // ========= MODIFIERS =========
    modifier rideExists(uint256 rideId) {
        require(rideId < _rideCounter, "Ride does not exist");
        _;
    }

    modifier inState(uint256 rideId, RideState expected) {
        require(rides[rideId].state == expected, "Invalid ride state");
        _;
    }

    // ========= CORE FUNCTIONS =========

    function createRide(
        bytes32 commitHash,
        uint256 expiry
    ) external payable nonReentrant {
        require(msg.value > 0, "Escrow must be > 0");
        require(expiry > block.timestamp, "Invalid expiry");

        uint256 rideId = _rideCounter++;

        rides[rideId] = Ride({
            rider: payable(msg.sender),
            driver: payable(address(0)),
            maxFare: msg.value,
            finalFare: 0,
            expiry: expiry,
            commitHash: commitHash,
            state: RideState.Requested
        });

        emit RideCreated(rideId, msg.sender, msg.value, expiry, commitHash);
    }

    function acceptRide(uint256 rideId)
        external
        rideExists(rideId)
        inState(rideId, RideState.Requested)
    {
        Ride storage r = rides[rideId];
        require(block.timestamp <= r.expiry, "Ride expired");

        r.driver = payable(msg.sender);
        r.state = RideState.Accepted;

        emit RideAccepted(rideId, msg.sender);
    }

    function startRide(uint256 rideId)
        external
        rideExists(rideId)
        inState(rideId, RideState.Accepted)
    {
        Ride storage r = rides[rideId];
        require(msg.sender == r.driver, "Only driver can start");

        r.state = RideState.Started;
        emit RideStarted(rideId);
    }

    function completeRide(
        uint256 rideId,
        uint256 finalFare
    )
        external
        nonReentrant
        rideExists(rideId)
        inState(rideId, RideState.Started)
    {
        Ride storage r = rides[rideId];
        require(msg.sender == r.driver, "Only driver can complete");
        require(finalFare <= r.maxFare, "Fare exceeds escrow");

        r.finalFare = finalFare;
        r.state = RideState.Completed;

        uint256 refund = r.maxFare - finalFare;

        if (finalFare > 0) {
            r.driver.transfer(finalFare);
        }

        if (refund > 0) {
            r.rider.transfer(refund);
        }

        emit RideCompleted(rideId, finalFare, finalFare, refund);
    }

    function cancelRide(uint256 rideId)
        external
        nonReentrant
        rideExists(rideId)
    {
        Ride storage r = rides[rideId];
        require(msg.sender == r.rider, "Only rider can cancel");
        require(
            r.state == RideState.Requested ||
            r.state == RideState.Accepted,
            "Cannot cancel now"
        );

        r.state = RideState.Cancelled;
        r.rider.transfer(r.maxFare);

        emit RideCancelled(rideId);
    }

    function openDispute(uint256 rideId)
        external
        rideExists(rideId)
    {
        Ride storage r = rides[rideId];
        require(
            msg.sender == r.rider || msg.sender == r.driver,
            "Not authorized"
        );
        require(
            r.state == RideState.Started,
            "Dispute not allowed now"
        );

        r.state = RideState.Disputed;
        emit DisputeOpened(rideId, msg.sender);
    }
}
