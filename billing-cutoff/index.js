// Disables billing on the project when its budget is exceeded, which drops
// the Firebase project back to the free Spark plan. Based on Google's
// "Disable billing usage with notifications" guide; setup steps are in
// README.md.
import { CloudBillingClient } from "@google-cloud/billing";
import * as functions from "@google-cloud/functions-framework";
import { parseBudgetMessage, shouldDisableBilling } from "./budget.js";

const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT;
const billing = new CloudBillingClient();

functions.cloudEvent("stopBilling", async (cloudEvent) => {
  const budget = parseBudgetMessage(cloudEvent.data.message.data);
  if (!shouldDisableBilling(budget)) {
    console.log(
      `Within budget: ${budget.costAmount} of ${budget.budgetAmount} ${budget.currencyCode}`
    );
    return;
  }
  if (!PROJECT_ID) throw new Error("GOOGLE_CLOUD_PROJECT is not set");

  const name = `projects/${PROJECT_ID}`;
  const [info] = await billing.getProjectBillingInfo({ name });
  if (!info.billingEnabled) {
    console.log("Billing is already disabled");
    return;
  }

  // An empty billing account detaches the project from billing
  await billing.updateProjectBillingInfo({
    name,
    projectBillingInfo: { billingAccountName: "" },
  });
  console.warn(
    `Billing disabled: spent ${budget.costAmount} against a budget of ${budget.budgetAmount} ${budget.currencyCode}`
  );
});
