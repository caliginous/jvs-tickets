import prisma from "../src/lib/prisma";
import { Options } from "../src/constants/Constants";
import { setOption } from "../src/lib/options";

async function main() {
  // Stripe only, disable others
  await setOption(Options.PaymentProviders, ["creditcard" as any, "stripeiban" as any]);

  // Delivery: Download tickets only by default
  await setOption(Options.Delivery, ["download" as any]);

  // Currency GBP
  await setOption(Options.Currency, "GBP");

  // Shop branding placeholders
  await setOption(Options.ShopTitle, "JVS Tickets");
  await setOption(Options.ShopSubtitle, "Events and Tickets");

  console.log("Configured shop options for JVS (Stripe-only, GBP, Download)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });






















