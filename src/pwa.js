export function checkForUpdate(appVersion, desktop = Boolean(window.ledgerlyDesktop)) {
  if (desktop) return Promise.resolve(false);
  return fetch(`version.json?check=${Date.now()}`, { cache: "no-store" })
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((version) => version.version !== appVersion)
    .catch(() => false);
}

export function registerServiceWorker(desktop = Boolean(window.ledgerlyDesktop)) {
  if (desktop || !("serviceWorker" in navigator)) return Promise.resolve();
  return navigator.serviceWorker.register("ledgerly-sw.js");
}
