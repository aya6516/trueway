import { useState } from "react";
import { connectWallet } from "./web3";
import { createRide, acceptRide, startRide, completeRide } from "./rideEscrowService";
import { getBalances } from "./balances";

export default function App() {
  const [wallet, setWallet] = useState("");
  const [status, setStatus] = useState("");
  const [balances, setBalances] = useState(null);

  async function refreshBalances() {
    try {
      const b = await getBalances();
      setBalances(b);
    } catch (e) {
      // don’t overwrite the main status if balances fail
      console.warn(e.message);
    }
  }

  async function onConnect() {
    try {
      const { address } = await connectWallet();
      setWallet(address);
      setStatus("Wallet connected ✅");
      await refreshBalances();
    } catch (e) {
      setStatus(e.message);
    }
  }

  async function run(fn, label) {
    try {
      setStatus(`${label}...`);
      await fn();
      setStatus(`${label} done ✅`);
      await refreshBalances(); // ⭐ auto refresh after every blockchain action
    } catch (e) {
      setStatus(e.message);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "Arial" }}>
      <h2>TrueWay - RideEscrow Demo</h2>

      <button onClick={onConnect}>Connect MetaMask</button>
      <p><b>Connected Wallet:</b> {wallet || "Not connected"}</p>
      <p><b>Status:</b> {status}</p>

      <hr />

      <button onClick={() => run(() => createRide("1"), "Create Ride (1 ETH escrow)")}>
        Create Ride (1 ETH escrow)
      </button>

      <button onClick={() => run(() => acceptRide(0), "Accept Ride #0")}>
        Accept Ride #0
      </button>

      <button onClick={() => run(() => startRide(0), "Start Ride #0")}>
        Start Ride #0
      </button>

      <button onClick={() => run(() => completeRide(0, "0.6"), "Complete Ride #0 (0.6 ETH)")}>
        Complete Ride #0 (0.6 ETH)
      </button>

      <hr />

      <button onClick={refreshBalances}>
        Refresh Balances (Rider / Driver / Contract)
      </button>

      {balances && (
        <div style={{ marginTop: 12 }}>
          <h3>Balances (ETH)</h3>
          <table border="1" cellPadding="8" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th>Actor</th>
                <th>Address</th>
                <th>Balance (ETH)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Rider (Account #0)</td>
                <td style={{ fontFamily: "monospace" }}>{balances.rider}</td>
                <td>{balances.riderEth}</td>
              </tr>
              <tr>
                <td>Driver (Account #1)</td>
                <td style={{ fontFamily: "monospace" }}>{balances.driver}</td>
                <td>{balances.driverEth}</td>
              </tr>
              <tr>
                <td>Escrow Contract</td>
                <td style={{ fontFamily: "monospace" }}>{balances.contract}</td>
                <td>{balances.contractEth}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
