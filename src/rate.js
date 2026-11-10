import { STORAGE_KEYS, readJson, writeJson, getStorage } from "./state.js";

export async function fetchRate(currentRate, desktopFetch = window.ledgerlyDesktop?.fetchJson) {
  const sources = [
    ["https://open.er-api.com/v6/latest/USD", (body) => ({
      rate: body.rates?.IDR,
      timestamp: body.time_last_update_unix ? body.time_last_update_unix * 1000 : Date.now()
    })],
    ["https://api.frankfurter.dev/v1/latest?base=USD&symbols=IDR", (body) => ({
      rate: body.rates?.IDR,
      timestamp: Date.parse(body.date) || Date.now()
    })]
  ];
  for (const [url, parse] of sources) {
    try {
      const body = desktopFetch
        ? await desktopFetch(url)
        : await fetch(url).then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.json();
        });
      const result = parse(body);
      if (result.rate > 1000) {
        writeJson(getStorage(), STORAGE_KEYS.rate, { r: result.rate, t: result.timestamp });
        return result;
      }
    } catch {}
  }
  return currentRate;
}

export function loadRate() {
  return readJson(getStorage(), STORAGE_KEYS.rate, null);
}
