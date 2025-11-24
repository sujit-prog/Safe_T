/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";
import { useState } from "react";
import Map from "./components/MapView";

export default function Page() {
  const [addr, setAddr] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const check = async () => {
    try {
      setLoading(true);
      setError("");
      const r = await fetch(`/api/safety?address=${encodeURIComponent(addr)}`);
      if (!r.ok) throw new Error("API request failed");
      const json = await r.json();
      setResult(json);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="h-screen flex flex-col">
      {/* Top half: Map */}
      <div className="flex-1">
        <Map />
      </div>

      {/* Bottom half: Input + Results */}
      <div className="flex-1 p-6 bg-gray-50 dark:bg-gray-900 dark:text-white border-t">
        <h2 className="text-xl font-semibold mb-4">Check Location Safety</h2>
        <div className="flex mb-4">
          <input
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            placeholder="Enter location"
            className="flex-1 border px-3 py-2 rounded-l"
          />
          <button
            onClick={check}
            className="bg-blue-600 text-white px-4 py-2 rounded-r"
          >
            Check
          </button>
        </div>

        {loading && <p>Loading...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {result && (
          <div className="mt-4 border p-4 rounded bg-gray-100 dark:bg-gray-800">
            <p><strong>Address:</strong> {result.address}</p>
            <p>
              <strong>Status:</strong>{" "}
              {result.safe ? "✅ Safe" : "⚠️ Risky"}
            </p>
            <p>{result.message}</p>
          </div>
        )}
      </div>
    </main>
  );
}