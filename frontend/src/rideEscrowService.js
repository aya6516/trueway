import { ethers } from "ethers";
import { getRideEscrowContract } from "./web3";

export async function createRide(maxFareEth) {
  const contract = await getRideEscrowContract();

  const commitHash = ethers.keccak256(
    ethers.toUtf8Bytes("demo-" + Date.now())
  );
  const expiry = Math.floor(Date.now() / 1000) + 3600;

  const tx = await contract.createRide(commitHash, expiry, {
    value: ethers.parseEther(maxFareEth),
  });

  return await tx.wait();
}

export async function acceptRide(rideId) {
  const contract = await getRideEscrowContract();
  const tx = await contract.acceptRide(rideId);
  return await tx.wait();
}

export async function startRide(rideId) {
  const contract = await getRideEscrowContract();
  const tx = await contract.startRide(rideId);
  return await tx.wait();
}

export async function completeRide(rideId, finalFareEth) {
  const contract = await getRideEscrowContract();
  const tx = await contract.completeRide(
    rideId,
    ethers.parseEther(finalFareEth)
  );
  return await tx.wait();
}
