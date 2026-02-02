import { ethers } from "ethers";
import { RIDE_ESCROW_ADDRESS } from "./config";

export async function getBalances() {
  if (!window.ethereum) throw new Error("MetaMask not found");

  const provider = new ethers.BrowserProvider(window.ethereum);

  // Hardhat default accounts (Account #0 and #1)
  const rider = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  const driver = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

  const [riderBal, driverBal, contractBal] = await Promise.all([
    provider.getBalance(rider),
    provider.getBalance(driver),
    provider.getBalance(RIDE_ESCROW_ADDRESS),
  ]);

  return {
    rider,
    driver,
    contract: RIDE_ESCROW_ADDRESS,
    riderEth: ethers.formatEther(riderBal),
    driverEth: ethers.formatEther(driverBal),
    contractEth: ethers.formatEther(contractBal),
  };
}
