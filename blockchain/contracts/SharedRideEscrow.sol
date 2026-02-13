// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SharedRideEscrow is ReentrancyGuard {
    enum TripState { Open, Started, Completed, Cancelled }

    struct Trip {
        address payable driver;
        address[] riders;
        uint256 maxSeats;        // optional
        uint256 totalEscrow;
        uint256 finalFareTotal;
        TripState state;
    }

    uint256 private _tripCounter;

    mapping(uint256 => Trip) public trips;
    mapping(uint256 => mapping(address => uint256)) public deposits; // tripId => rider => deposit
    mapping(uint256 => mapping(address => bool)) public isRider;     // tripId => rider => joined

    event TripCreated(uint256 indexed tripId, address indexed driver, uint256 maxSeats);
    event RiderJoined(uint256 indexed tripId, address indexed rider, uint256 amount);
    event TripStarted(uint256 indexed tripId);
    event TripCompleted(uint256 indexed tripId, uint256 finalFareTotal, uint256 perRiderFare);
    event RiderLeft(uint256 indexed tripId, address indexed rider, uint256 refund);

    modifier tripExists(uint256 tripId) {
        require(tripId < _tripCounter, "Trip does not exist");
        _;
    }

    modifier inState(uint256 tripId, TripState expected) {
        require(trips[tripId].state == expected, "Invalid trip state");
        _;
    }

    function createTrip(uint256 maxSeats) external returns (uint256 tripId) {
        require(maxSeats == 0 || maxSeats >= 2, "maxSeats must be 0 or >=2");

        tripId = _tripCounter++;
        trips[tripId] = Trip({
            driver: payable(msg.sender),
            riders: new address[](0),
            maxSeats: maxSeats,
            totalEscrow: 0,
            finalFareTotal: 0,
            state: TripState.Open
        });

        emit TripCreated(tripId, msg.sender, maxSeats);
    }

    function joinTrip(uint256 tripId) external payable nonReentrant tripExists(tripId) inState(tripId, TripState.Open) {
        Trip storage t = trips[tripId];
        require(msg.sender != t.driver, "Driver cannot join as rider");
        require(!isRider[tripId][msg.sender], "Already joined");
        require(msg.value > 0, "Deposit must be > 0");

        if (t.maxSeats != 0) {
            require(t.riders.length < t.maxSeats, "Trip is full");
        }

        isRider[tripId][msg.sender] = true;
        deposits[tripId][msg.sender] = msg.value;
        t.riders.push(msg.sender);
        t.totalEscrow += msg.value;

        emit RiderJoined(tripId, msg.sender, msg.value);
    }

    function leaveTrip(uint256 tripId) external nonReentrant tripExists(tripId) inState(tripId, TripState.Open) {
        require(isRider[tripId][msg.sender], "Not a rider");

        Trip storage t = trips[tripId];

        uint256 refund = deposits[tripId][msg.sender];
        require(refund > 0, "No deposit");

        // mark as left
        isRider[tripId][msg.sender] = false;
        deposits[tripId][msg.sender] = 0;
        t.totalEscrow -= refund;

        // remove from riders array (swap & pop)
        uint256 n = t.riders.length;
        for (uint256 i = 0; i < n; i++) {
            if (t.riders[i] == msg.sender) {
                t.riders[i] = t.riders[n - 1];
                t.riders.pop();
                break;
            }
        }

        payable(msg.sender).transfer(refund);
        emit RiderLeft(tripId, msg.sender, refund);
    }

    function startTrip(uint256 tripId) external tripExists(tripId) inState(tripId, TripState.Open) {
        Trip storage t = trips[tripId];
        require(msg.sender == t.driver, "Only driver can start");
        require(t.riders.length > 0, "No riders joined");

        t.state = TripState.Started;
        emit TripStarted(tripId);
    }

    function completeTrip(uint256 tripId, uint256 finalFareTotal)
        external
        nonReentrant
        tripExists(tripId)
        inState(tripId, TripState.Started)
    {
        Trip storage t = trips[tripId];
        require(msg.sender == t.driver, "Only driver can complete");
        require(finalFareTotal <= t.totalEscrow, "Fare exceeds escrow");
        require(t.riders.length > 0, "No riders");

        uint256 ridersCount = t.riders.length;
        uint256 perRiderFare = finalFareTotal / ridersCount;

        t.finalFareTotal = finalFareTotal;
        t.state = TripState.Completed;

        // Pay driver total fare
        if (finalFareTotal > 0) {
            t.driver.transfer(finalFareTotal);
        }

        // Refund each rider = deposit - perRiderFare
        // Remainder wei stays in contract and effectively benefits driver less/more? (MVP)
        // For strict accounting you can distribute remainder or refund it.
        for (uint256 i = 0; i < ridersCount; i++) {
            address rider = t.riders[i];
            uint256 dep = deposits[tripId][rider];

            // If someone deposited less than perRiderFare, this would underflow.
            // MVP rule: ensure deposits are large enough off-chain (or add a check here).
            require(dep >= perRiderFare, "Rider deposit too low");

            uint256 refund = dep - perRiderFare;
            deposits[tripId][rider] = 0;

            if (refund > 0) {
                payable(rider).transfer(refund);
            }
        }

        emit TripCompleted(tripId, finalFareTotal, perRiderFare);
    }

    function getRiders(uint256 tripId) external view tripExists(tripId) returns (address[] memory) {
        return trips[tripId].riders;
    }
}
