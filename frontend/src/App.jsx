import { useState } from "react";
import { connectWallet } from "./web3";
import { createRide, acceptRide, startRide, completeRide } from "./rideEscrowService";
import {
  createTrip,
  joinTrip,
  getTripCount,
  getTripInfo,
} from "./sharedRideService";
import { getBalances } from "./balances";

export default function App() {
  const [wallet, setWallet] = useState("");
  const [status, setStatus] = useState("");
  const [balances, setBalances] = useState(null);
  const [trips, setTrips] = useState([]);
  const [carpoolDest, setCarpoolDest] = useState("");
  const [carpoolMaxSeats, setCarpoolMaxSeats] = useState(4);
  const [joinDeposit, setJoinDeposit] = useState("0.1");

  async function refreshBalances() {
    try {
      const b = await getBalances();
      setBalances(b);
    } catch (e) {
      // don’t overwrite the main status if balances fail
      console.warn(e.message);
    }
  }

  async function refreshTrips() {
    try {
      const count = await getTripCount();
      const list = [];
      for (let i = 0; i < count; i++) {
        const info = await getTripInfo(i);
        list.push({ id: i, ...info });
      }
      setTrips(list);
    } catch (e) {
      console.warn(e.message);
      setTrips([]);
    }
  }

  async function onConnect() {
    try {
      const { address } = await connectWallet();
      setWallet(address);
      setStatus("Wallet connected ✅");
      await refreshBalances();
      await refreshTrips();
    } catch (e) {
      setStatus(e.message);
    }
  }

  async function run(fn, label) {
    try {
      setStatus(`${label}...`);
      await fn();
      setStatus(`${label} done ✅`);
      await refreshBalances();
      await refreshTrips();
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
      <h3>Carpool – Driver posts trip, riders join</h3>
      <div style={{ marginBottom: 16 }}>
        <p><b>Driver: Create trip</b> &quot;I&apos;m going to X&quot;</p>
        <input
          placeholder="Destination (e.g. Downtown)"
          value={carpoolDest}
          onChange={(e) => setCarpoolDest(e.target.value)}
          style={{ marginRight: 8 }}
        />
        <input
          type="number"
          placeholder="Max seats (0 = unlimited)"
          value={carpoolMaxSeats}
          onChange={(e) => setCarpoolMaxSeats(Number(e.target.value) || 0)}
          min={0}
          style={{ width: 120, marginRight: 8 }}
        />
        <button
          onClick={() =>
            run(
              () => createTrip(carpoolDest || "Unknown", carpoolMaxSeats),
              "Create Trip"
            )
          }
          disabled={!wallet}
        >
          Create Trip
        </button>
      </div>
      <div style={{ marginBottom: 16 }}>
        <button onClick={refreshTrips} disabled={!wallet}>
          Refresh Trips
        </button>
      </div>
      <div>
        <p><b>Open trips – Riders join:</b></p>
        {trips.filter((t) => t.state === "Open").length === 0 ? (
          <p>No open trips. Create one as driver or refresh.</p>
        ) : (
          <ul style={{ listStyle: "none", paddingLeft: 0 }}>
            {trips
              .filter((t) => t.state === "Open")
              .map((t) => (
                <li
                  key={t.id}
                  style={{
                    border: "1px solid #ccc",
                    padding: 12,
                    marginBottom: 8,
                    borderRadius: 8,
                  }}
                >
                  <strong>Trip #{t.id}</strong> → {t.destination} | Driver:{" "}
                  {String(t.driver).slice(0, 8)}… | Riders: {t.riderCount}
                  {t.maxSeats > 0 ? `/${t.maxSeats}` : ""} | Escrow: {t.totalEscrowEth} ETH
                  <div style={{ marginTop: 8 }}>
                    <input
                      type="text"
                      placeholder="Deposit (ETH)"
                      value={joinDeposit}
                      onChange={(e) => setJoinDeposit(e.target.value)}
                      style={{ width: 80, marginRight: 8 }}
                    />
                    <button
                      onClick={() =>
                        run(
                          () => joinTrip(t.id, joinDeposit),
                          `Join Trip #${t.id}`
                        )
                      }
                      disabled={!wallet}
                    >
                      Join Trip #{t.id}
                    </button>
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>

      <hr />
      <h3>1:1 RideEscrow (original)</h3>

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

      <button onClick={() => { refreshBalances(); refreshTrips(); }}>
        Refresh Balances & Trips
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
