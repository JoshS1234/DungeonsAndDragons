/**
 * Read a budget notification from Pub/Sub. Cloud Billing sends one several
 * times a day with the month-to-date cost and the budget amount.
 */
export const parseBudgetMessage = (base64) => {
  const message = JSON.parse(Buffer.from(base64, "base64").toString());
  return {
    costAmount: Number(message.costAmount),
    budgetAmount: Number(message.budgetAmount),
    currencyCode: message.currencyCode,
  };
};

/** Only cut billing once spending has actually passed the budget. */
export const shouldDisableBilling = ({ costAmount, budgetAmount }) =>
  Number.isFinite(costAmount) &&
  Number.isFinite(budgetAmount) &&
  costAmount > budgetAmount;
