const hre = require("hardhat");

async function main() {
  const SharedRideEscrow = await hre.ethers.getContractFactory("SharedRideEscrow");
  const c = await SharedRideEscrow.deploy();
  await c.waitForDeployment();
  console.log("SharedRideEscrow deployed to:", await c.getAddress());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
