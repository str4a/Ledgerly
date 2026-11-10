const fs = require("node:fs");
const path = require("node:path");

function createStorage(filePath) {
  let state = {};
  try {
    if (fs.existsSync(filePath)) {
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) state = parsed;
    }
  } catch (error) {
    console.error("Ledgerly storage load failed:", error);
  }

  function persist() {
    const temporary = `${filePath}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify(state, null, 2), "utf8");
    fs.renameSync(temporary, filePath);
  }

  return {
    get(key) {
      return Object.prototype.hasOwnProperty.call(state, key) ? state[key] : null;
    },
    set(key, value) {
      state[key] = String(value);
      persist();
    },
    remove(key) {
      delete state[key];
      persist();
    },
    snapshot() {
      return { ...state };
    },
    persist
  };
}

module.exports = { createStorage };
