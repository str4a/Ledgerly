export function winRate(values) {
  return values.length ? values.filter((value) => value > 0).length / values.length * 100 : 0;
}

export function profitFactor(values) {
  const gains = values.filter((value) => value > 0).reduce((sum, value) => sum + value, 0);
  const losses = Math.abs(values.filter((value) => value < 0).reduce((sum, value) => sum + value, 0));
  return losses ? gains / losses : gains ? Infinity : 0;
}

export function expectancy(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

export function maxDrawdown(values, startingBalance = 0) {
  let balance = startingBalance;
  let peak = balance;
  let maximum = 0;
  for (const value of values) {
    balance += value;
    peak = Math.max(peak, balance);
    maximum = Math.max(maximum, peak > 0 ? (peak - balance) / peak * 100 : 0);
  }
  return maximum;
}

export function convertAmount(amount, currency, rate) {
  return currency === "USD" ? amount * rate : amount;
}
