"use client";
import React, { useState } from "react";

const PROXY_URL = "/api/proxy";
const UPDATE_URL = "https://e1.theflex.ai/anyapp/update/";
const SEARCH_URL = "https://e1.theflex.ai/anyapp/search/";
const APP_SECRET = "38475203487kwsdjfvb1023897yfwbhekrfj";
const RECORD_ID = "rec_001";
const FEATURE_NAME = "test_001";
const DATASET = "feature_data";

// Format UTC ISO string to "YYYY-MM-DD | HH:mm:ss"
function formatUTCForDisplay(isoString: string) {
  if (!isoString) return "N/A";
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

// Format local time with microseconds: "YYYY-MM-DD | HH:mm:ss.mmmuuu"
function formatLocalWithMicros(date: Date) {
  if (!date) return "N/A";
  const pad = (n: number, len = 2) => n.toString().padStart(len, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hour = pad(date.getHours());
  const minute = pad(date.getMinutes());
  const second = pad(date.getSeconds());
  const ms = pad(date.getMilliseconds(), 3);
  // Use performance.now() for microseconds if available
  let micros = "000";
  if (typeof performance !== "undefined" && performance.now) {
    const perf = Math.floor((performance.now() % 1) * 1000);
    micros = pad(perf, 3);
  }
  return `${year}-${month}-${day} | ${hour}:${minute}:${second}.${ms}${micros}`;
}

export default function Dashboard() {
  const [value, setValue] = useState("");
  const [delay, setDelay] = useState("0");
  const [fetchedValue, setFetchedValue] = useState("");
  const [modifiedOnUTC, setModifiedOnUTC] = useState("");
  const [timing, setTiming] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New fields
  const [updateOkTime, setUpdateOkTime] = useState("");
  const [fetchRequestedTime, setFetchRequestedTime] = useState("");

  // Async wait helper
  const wait = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  const handleUpdate = async () => {
    setLoading(true);
    setError(null);
    setFetchedValue("");
    setModifiedOnUTC("");
    setUpdateOkTime("");
    setFetchRequestedTime("");
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

    // Capture 200 OK time (with microseconds)
    if (updateRes.ok) {
      setUpdateOkTime(formatLocalWithMicros(new Date()));
      // Wait for the specified delay (seconds to milliseconds)
      let delaySec = Number(delay);
      if (isNaN(delaySec) || delaySec < 0) delaySec = 0;
      const delayMs = Math.round(delaySec * 1000);

      if (delayMs > 0) {
        await wait(delayMs);
      }

      // Capture fetch requested time (with microseconds)
      setFetchRequestedTime(formatLocalWithMicros(new Date()));

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
        <table className="w-full border-separate border-spacing-y-2">
          <tbody>
            <tr>
              <td className="text-amber-400 font-medium bg-gray-900 rounded-l px-2 py-1">
                Update 200 OK At:
              </td>
              <td className="update-ok-time text-amber-400 font-mono font-semibold rounded-r px-2 py-1">
                {updateOkTime || "--"}
              </td>
            </tr>
            <tr>
              <td className="text-sky-400 font-medium bg-gray-900 rounded-l px-2 py-1">
                Fetch Requested At:
              </td>
              <td className="fetch-time text-sky-400 font-mono font-semibold rounded-r px-2 py-1">
                {fetchRequestedTime || "--"}
              </td>
            </tr>
            <tr>
              <td className="text-green-400 font-medium bg-gray-900 rounded-l px-2 py-1">
                Fetched Value:
              </td>
              <td className="value text-green-400 font-mono font-semibold rounded-r px-2 py-1">
                {fetchedValue || "--"}
              </td>
            </tr>
            <tr>
              <td className="text-yellow-300 font-medium bg-gray-900 rounded-l px-2 py-1">
                Modified On (UTC):
              </td>
              <td className="modified text-yellow-300 font-mono font-semibold rounded-r px-2 py-1">
                {formatUTCForDisplay(modifiedOnUTC)}
              </td>
            </tr>
            <tr>
              <td className="text-cyan-400 font-medium bg-gray-900 rounded-l px-2 py-1">
                Time Taken:
              </td>
              <td className="timing text-cyan-400 font-mono font-semibold rounded-r px-2 py-1">
                {timing !== null ? `${timing.toFixed(2)} ms` : "--"}
              </td>
            </tr>
          </tbody>
        </table>
        {error && (
          <div className="mt-4 text-red-400 font-medium bg-gray-900 rounded px-3 py-2">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
