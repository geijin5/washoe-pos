// Money helpers shared by checkout and the store so the fee shown is exactly the fee charged.
// Amounts are worked in whole cents to avoid floating-point errors such as 20.70 * 5% = 1.0349999...

// Round a dollar amount to the nearest cent (half up)
export const roundToCents = (amount: number): number =>
  Math.round(amount * 100 + (amount >= 0 ? 1e-7 : -1e-7)) / 100;

// Card fee on an amount, e.g. 5% of $20.70 = $1.04 (rounded half up to the cent)
export const calculateCardFee = (amount: number, feePercent: number): number => {
  if (amount <= 0 || feePercent <= 0) return 0;
  const cents = Math.round(amount * 100);
  return Math.round((cents * feePercent) / 100 + 1e-9) / 100;
};
