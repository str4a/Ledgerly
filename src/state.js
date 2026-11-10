export const STORAGE_KEYS = Object.freeze({
  transactions: "jurnalcuan_v1",
  settings: "jurnalcuan_set",
  rate: "jurnalcuan_rate",
  account: "jurnalcuan_acc",
  widgets: "jurnalcuan_w",
  finnhub: "jc_fh",
  goapi: "jc_goapi"
});

export function getStorage() {
  return window.ledgerlyDesktop ? window.ledgerlyDesktop.storage : window.localStorage;
}

export function readJson(storage, key, fallback) {
  try {
    const value = storage.getItem(key);
    return value == null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function writeJson(storage, key, value) {
  storage.setItem(key, JSON.stringify(value));
}
