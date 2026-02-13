import { ethers } from "ethers";
import RideEscrowArtifact from "./contracts/RideEscrow.json";
import SharedRideEscrowArtifact from "./contracts/SharedRideEscrow.json";
import { HARDHAT_CHAIN_ID, RIDE_ESCROW_ADDRESS, SHARED_RIDE_ESCROW_ADDRESS } from "./config";

export async function connectWallet() {
  if (!window.ethereum) throw new Error("MetaMask is not installed");

  // Request account access
  await window.ethereum.request({ method: "eth_requestAccounts" });

  const provider = new ethers.BrowserProvider(window.ethereum);

  // Ensure user is on the correct chain (Hardhat Local)
  const network = await provider.getNetwork();
  if (Number(network.chainId) !== HARDHAT_CHAIN_ID) {
    throw new Error(
      `Wrong network. Please switch MetaMask to Hardhat Local (Chain ID ${HARDHAT_CHAIN_ID}).`
    );
  }

  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  return { provider, signer, address };
}

export async function getRideEscrowContract() {
  const { signer } = await connectWallet();
  return new ethers.Contract(RIDE_ESCROW_ADDRESS, RideEscrowArtifact.abi, signer);
}

export async function getSharedRideEscrowContract() {
  const { signer } = await connectWallet();
  return new ethers.Contract(SHARED_RIDE_ESCROW_ADDRESS, SharedRideEscrowArtifact.abi, signer);
}
