"use client";
import React, { useState } from "react";

const PROXY_URL = "/api/proxy";
const UPDATE_URL = "https://e1.theflex.ai/anyapp/update/";
const SEARCH_URL = "https://e1.theflex.ai/anyapp/search/";
const APP_SECRET = "38475203487kwsdjfvb1023897yfwbhekrfj";
const RECORD_ID = "rec_001";
const FEATURE_NAME = "test_001";
const DATASET = "feature_data";

// Helper: Format UTC ISO string to "YYYY-MM-DD | HH:mm:ss"
function formatUTCForDisplay(isoString: string) {
  if (!isoString) return "N/A";
  // Accepts: 2025-07-08T14:54:15+00:00 or 2025-07-08T14:54:15Z
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  const pad = (n: number) => n.toString().padStart(2, "0");
  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());
  const hour = pad(date.getUTCHours());
  const minute = pad(date.getUTCMinutes());
  const second = pad(date.getUTCSeconds());
  return `${year}-${month}-${day} | ${hour}:${minute}:${second}`;
}

export default function Dashboard() {
  const [value, setValue] = useState("");
  const [delay, setDelay] = useState("0");
  const [fetchedValue, setFetchedValue] = useState("");
  const [modifiedOnUTC, setModifiedOnUTC] = useState("");
  const [timing, setTiming] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Async wait helper
  const wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const handleUpdate = async () => {
    setLoading(true);
    setError(null);
    setFetchedValue("");
    setModifiedOnUTC("");
    const start = performance.now();

    // Use UTC time for modified_on
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const year = now.getUTCFullYear();
    const month = pad(now.getUTCMonth() + 1);
    const day = pad(now.getUTCDate());
    const hour = pad(now.getUTCHours());
    const minute = pad(now.getUTCMinutes());
    const second = pad(now.getUTCSeconds());
    const utcISOString = `${year}-${month}-${day}T${hour}:${minute}:${second}+00:00`;

    const updatePayload = {
      url: UPDATE_URL,
      payload: {
        data: {
          record_id: RECORD_ID,
          feature_name: FEATURE_NAME,
          fields_to_update: {
            value,
            modified_on: utcISOString,
          },
        },
        dataset: DATASET,
        app_secret: APP_SECRET,
      },
    };

    const updateRes = await fetch(PROXY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatePayload),
    });

    if (updateRes.ok) {
      // Wait for the specified delay (seconds to milliseconds)
      let delaySec = Number(delay);
      if (isNaN(delaySec) || delaySec < 0) delaySec = 0;
      const delayMs = Math.round(delaySec * 1000);

      if (delayMs > 0) {
        await wait(delayMs);
      }

      // Fetch updated value via proxy
      const searchPayload = {
        url: SEARCH_URL,
        payload: {
          conditions: [
            {
              field: "feature_name",
              value: FEATURE_NAME,
              search_type: "exact",
            },
            { field: "record_id", value: RECORD_ID, search_type: "exact" },
          ],
          dataset: DATASET,
          app_secret: APP_SECRET,
        },
      };

      const searchRes = await fetch(PROXY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(searchPayload),
      });

      if (searchRes.ok) {
        const data = await searchRes.json();
        const foundValue = data?.data?.[0]?.value ?? "N/A";
        setFetchedValue(foundValue);
        const modifiedOn = data?.data?.[0]?.modified_on ?? "N/A";
        setModifiedOnUTC(modifiedOn);
      } else {
        setFetchedValue("Fetch failed");
        setModifiedOnUTC("N/A");
        setError("Failed to fetch updated value.");
      }
      setTiming(performance.now() - start);
    } else {
      setFetchedValue("Update failed");
      setModifiedOnUTC("N/A");
      setTiming(null);
      setError("Failed to update value.");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-8 bg-gray-800 rounded-lg shadow-lg border border-gray-700">
      <h2 className="text-2xl font-bold mb-6 text-cyan-300">
        API Update & Fetch Dashboard
      </h2>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (!loading && value) await handleUpdate();
        }}
      >
        <label className="block mb-2 font-medium text-gray-200">
          Value to Update:
        </label>
        <input
          className="border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={loading}
        />

        <label className="block mt-5 mb-2 font-medium text-gray-200">
          Delay before fetch (seconds, e.g. 0.6):
        </label>
        <input
          type="number"
          min="0"
          step="any"
          className="border border-gray-600 bg-gray-900 text-gray-100 px-3 py-2 w-full rounded focus:outline-none focus:ring-2 focus:ring-cyan-500"
          value={delay}
          onChange={(e) => setDelay(e.target.value)}
          disabled={loading}
        />

        <button
          type="submit"
          className="bg-cyan-600 text-white px-5 py-2 rounded hover:bg-cyan-700 disabled:opacity-50 transition mt-5"
          disabled={loading || !value}
        >
          {loading ? "Updating..." : "Update & Fetch"}
        </button>
      </form>
      <div className="mt-8">
        <div>
          <span className="font-medium text-gray-300">Fetched Value:</span>{" "}
          <span className="text-green-400">{fetchedValue}</span>
        </div>
        <div>
          <span className="font-medium text-gray-300">Modified On (UTC):</span>{" "}
          <span className="text-yellow-300">
            {formatUTCForDisplay(modifiedOnUTC)}
          </span>
        </div>
        <div>
          <span className="font-medium text-gray-300">Time Taken:</span>{" "}
          <span className="text-cyan-400">
            {timing !== null ? `${timing.toFixed(2)} ms` : "--"}
          </span>
        </div>
        {error && <div className="mt-4 text-red-400 font-medium">{error}</div>}
      </div>
    </div>
  );
}
