export function esc(value) {
  return String(value).replace(/[&<>"]/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;"
  }[character]));
}

export function inputNumber(value) {
  const normalized = String(value || "").replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  return Number.parseFloat(normalized) || 0;
}

export function formatInput(value) {
  const parts = String(value || "").replace(/[^\d,]/g, "").split(",");
  let integer = parts[0].replace(/^0+(?=\d)/, "") || "0";
  integer = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return parts.length > 1 ? `${integer},${parts[1].slice(0, 2)}` : integer;
}

export function formatSignedInput(value) {
  const text = String(value || "");
  return `${/^-/.test(text) ? "-" : ""}${formatInput(text.replace(/[^\d,]/g, ""))}`;
}

export function pc(value, digits = 1) {
  return value.toFixed(digits).replace(".", ",");
}

export function dfmt(value) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric"
  });
}

export function pad(value) {
  return `${value < 10 ? "0" : ""}${value}`;
}

export function cl(value) {
  return value > 0 ? "pos" : value < 0 ? "neg" : "";
}
