import { ethers } from "ethers";
import { getSharedRideEscrowContract } from "./web3";

export async function createTrip(destination, maxSeats) {
  const contract = await getSharedRideEscrowContract();
  const tx = await contract.createTrip(destination, maxSeats);
  return await tx.wait();
}

export async function joinTrip(tripId, depositEth) {
  const contract = await getSharedRideEscrowContract();
  const tx = await contract.joinTrip(tripId, {
    value: ethers.parseEther(depositEth),
  });
  return await tx.wait();
}

export async function leaveTrip(tripId) {
  const contract = await getSharedRideEscrowContract();
  const tx = await contract.leaveTrip(tripId);
  return await tx.wait();
}

export async function startTrip(tripId) {
  const contract = await getSharedRideEscrowContract();
  const tx = await contract.startTrip(tripId);
  return await tx.wait();
}

export async function completeTrip(tripId, finalFareEth) {
  const contract = await getSharedRideEscrowContract();
  const tx = await contract.completeTrip(tripId, ethers.parseEther(finalFareEth));
  return await tx.wait();
}

export async function getTripCount() {
  const contract = await getSharedRideEscrowContract();
  return Number(await contract.getTripCount());
}

export async function getTripInfo(tripId) {
  const contract = await getSharedRideEscrowContract();
  const info = await contract.getTripInfo(tripId);
  const stateNames = ["Open", "Started", "Completed", "Cancelled"];
  return {
    driver: info[0],
    destination: info[1],
    riderCount: Number(info[2]),
    maxSeats: Number(info[3]),
    totalEscrow: info[4],
    totalEscrowEth: ethers.formatEther(info[4]),
    state: stateNames[info[5]] ?? "Unknown",
  };
}
