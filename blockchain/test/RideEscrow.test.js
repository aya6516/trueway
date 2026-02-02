const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RideEscrow", function () {
  let rideEscrow;
  let rider, driver, other;

  beforeEach(async () => {
    [rider, driver, other] = await ethers.getSigners();

    const RideEscrow = await ethers.getContractFactory("RideEscrow");
    rideEscrow = await RideEscrow.deploy();
    await rideEscrow.waitForDeployment();
  });

  it("allows a rider to create a ride with escrow", async () => {
    const commitHash = ethers.keccak256(ethers.toUtf8Bytes("test"));
    const expiry = Math.floor(Date.now() / 1000) + 3600;

    await expect(
      rideEscrow.connect(rider).createRide(commitHash, expiry, {
        value: ethers.parseEther("1"),
      })
    ).to.emit(rideEscrow, "RideCreated");
  });

  it("allows a driver to accept and start a ride", async () => {
    const commitHash = ethers.keccak256(ethers.toUtf8Bytes("ride2"));
    const expiry = Math.floor(Date.now() / 1000) + 3600;

    await rideEscrow.connect(rider).createRide(commitHash, expiry, {
      value: ethers.parseEther("1"),
    });

    await rideEscrow.connect(driver).acceptRide(0);
    await rideEscrow.connect(driver).startRide(0);

    const ride = await rideEscrow.rides(0);
    expect(ride.state).to.equal(2); // Started
  });

  it("settles escrow correctly on completion", async () => {
    const commitHash = ethers.keccak256(ethers.toUtf8Bytes("ride3"));
    const expiry = Math.floor(Date.now() / 1000) + 3600;

    await rideEscrow.connect(rider).createRide(commitHash, expiry, {
      value: ethers.parseEther("1"),
    });

    await rideEscrow.connect(driver).acceptRide(0);
    await rideEscrow.connect(driver).startRide(0);

    await expect(
      rideEscrow.connect(driver).completeRide(
        0,
        ethers.parseEther("0.6")
      )
    ).to.emit(rideEscrow, "RideCompleted");
  });

  it("prevents settlement when disputed", async () => {
    const commitHash = ethers.keccak256(ethers.toUtf8Bytes("ride4"));
    const expiry = Math.floor(Date.now() / 1000) + 3600;

    await rideEscrow.connect(rider).createRide(commitHash, expiry, {
      value: ethers.parseEther("1"),
    });

    await rideEscrow.connect(driver).acceptRide(0);
    await rideEscrow.connect(driver).startRide(0);
    await rideEscrow.connect(rider).openDispute(0);

    await expect(
      rideEscrow.connect(driver).completeRide(
        0,
        ethers.parseEther("0.5")
      )
    ).to.be.reverted;
  });
});
