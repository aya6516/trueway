Trueway blockchain implementation

MetaMask (user wallet)
        ↓ signs tx
Frontend dApp
        ↓ ethers.js
Hardhat Local EVM
        ↓
Smart Contracts (RideEscrow)


local network details:
Network name: Hardhat Local
RPC URL: http://127.0.0.1:8545
Chain ID: 31337
Currency symbol: ETH


commands: 
T1
local blockchain network run:
 npx hardhat node


T2
deploy smart contract:
 npx hardhat run scripts/deploy.js --network localhost

T3
frontend run:
npm run dev