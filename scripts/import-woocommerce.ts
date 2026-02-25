
/**
 * scripts/import-woocommerce.ts
 *
 * One-shot importer for WooCommerce exports:
 * - Products CSV (your events): wc-product-export-*.csv
 * - Orders CSV (your bookings): order_export_*.csv
 *
 * It will:
 *  1) Upsert Events from the products CSV (title, description).
 *  2) Parse dates either from the product name (e.g., "Event - 05 April 2024")
 *     or fall back to null; creates an EventDate per Event.
 *  3) Create a per-event Category (e.g., "General Admission") priced using "Regular price".
 *  4) Upsert Orders from the orders CSV, mapping customers, payment, totals, and tickets.
 *  5) For orders with multiple line items, it creates multiple ticket rows (category + amount).
 *  6) Uses a deterministic idempotencyKey: `wc-order-${order_id}` so re-runs are safe.
 *
 * Run:
 *   npx ts-node scripts/import-woocommerce.ts \
 *     --products /path/to/wc-product-export.csv \
 *     --orders /path/to/order_export.csv
 *
 * Requirements:
 *  - DATABASE_URL set (.env)
 *  - npm i -D ts-node @types/node
 *  - npm i csv-parse @prisma/client date-fns
 */

import { createReadStream } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse } from "csv-parse";
import prisma from "../src/lib/prisma";
import { add, parse as parseDateFns, isValid as isValidDateFns } from "date-fns";
import { zonedTimeToUtc } from "date-fns-tz";

// --- Optional authoritative Events-Dates CSV -------------------------------

type EventDatesRow = {
  Title: string;
  Start?: string;
  End?: string;
  Venue?: string;
  Price?: string;
};

function parseAuthoritativeDate(s?: string): Date | null {
  if (!s) return null;
  const trimmed = String(s).trim();
  // Accept "YYYY-MM-DD HH:mm" or ISO; interpret as Europe/London local time
  // If it's already ISO with timezone, Date() will handle it; otherwise use zonedTimeToUtc.
  const isoLike = trimmed.match(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2})?$/);
  try {
    if (isoLike) {
      return zonedTimeToUtc(trimmed.replace("T", " "), "Europe/London");
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  } catch {}
  // Fallback: try date-fns patterns if needed
  try {
    const dd = parseDateFns(trimmed, "yyyy-MM-dd HH:mm", new Date());
    if (isValidDateFns(dd)) return zonedTimeToUtc(dd as unknown as Date, "Europe/London");
  } catch {}
  return null;
}
 catch {}
  return null;
}

async function readEventsDatesCsv(file: string): Promise<Map<string, EventDatesRow>> {
  const rows = await new Promise<EventDatesRow[]>((resolve, reject) => {
    const items: EventDatesRow[] = [];
    createReadStream(file)
      .pipe(parse({ columns: true, relax_column_count: true, skip_empty_lines: true }))
      .on("data", (r) => items.push(r))
      .on("end", () => resolve(items))
      .on("error", reject);
  });

  const map = new Map<string, EventDatesRow>();
  for (const r of rows) {
    if (r.Title) {
      map.set(r.Title.trim().toLowerCase(), r);
    }
  }
  return map;
}


type ProductRow = Record<string, string>;
type OrderRow = Record<string, string>;

let authoritativeDatesMap: Map<string, any> | null = null;

const Summary = {
  eventsCreated: 0,
  eventsLinkedToVenue: 0,
  eventDatesCreated: 0,
  categoriesCreated: 0,
  categoriesLinked: 0,
  ordersCreated: 0,
  ordersUpdated: 0,
  ticketsCreated: 0,
};

// == CATEGORY HELPERS ==

// == VENUE LINKING ==
// We will NOT create new venues. We only link to the existing "JVS - 853-855 Finchley Road, London NW11 8LX".
const VENUE_NAME = "JVS - 853-855 Finchley Road, London NW11 8LX";

async function getExistingVenue() {
  const v = await prisma.venue.findFirst({
    where: { name: VENUE_NAME }
  });
  return v; // may be null if not present
}

async function ensureEventLinkedToVenue(eventId: number) {
  const venue = await getExistingVenue();
  if (!venue) {
    console.warn(`[venue] Existing venue not found by name: ${VENUE_NAME}. Skipping venue linkage.`);
    return;
  }
  // Only link if not already set
  const ev = await prisma.event.findUnique({ where: { id: eventId }, select: { venueId: true } });
  if (!ev) return;
  if (ev.venueId == null) {
    await prisma.event.update({
      where: { id: eventId },
      data: { venue: { connect: { id: venue.id } } }
    });
    console.log(`[venue] Linked event ${eventId} to venue ${venue.id} (${VENUE_NAME}).`);
  }
}

function formatPriceLabel(n: number): string {
  if (!Number.isFinite(n)) return "0";
  const fixed = Number(n.toFixed(2));
  // Drop trailing .00 or .50 nicely in label if desired; keep 2dp for uniqueness if needed
  if (Math.abs(fixed - Math.round(fixed)) < 1e-9) return String(Math.round(fixed));
  return fixed.toString();
}

function toDefaultLabel(price: number): string {
  return `Default ${formatPriceLabel(price)}`;
}

// attempt to extract a tier name from the item name (e.g., "Child", "Discount", "Concession")
function extractTierName(itemName: string, eventTitle: string): string {
  const s = (itemName || "").trim();
  const et = (eventTitle || "").trim();
  const lower = s.toLowerCase();
  const known = ["child","children","kid","student","discount","concession","senior","vip","regular","supporter","member"];
  for (const k of known) {
    if (lower.includes(k)) {
      // Capitalize first letter
      return k.charAt(0).toUpperCase() + k.slice(1);
    }
  }
  // Remove the event title and common separators to get a possible suffix
  let candidate = s;
  if (et && s.toLowerCase().startsWith(et.toLowerCase())) {
    candidate = s.slice(et.length).trim();
    candidate = candidate.replace(/^[-–:]\s*/, ""); // drop leading separators
  }
  // Extract text inside parentheses as fallback
  const m = candidate.match(/\(([^)]+)\)/);
  if (m && m[1]) return m[1].trim();
  // If nothing meaningful, fall back to "Default"
  return "Default";
}


// --- Helpers ---------------------------------------------------------------

function asNumber(v: any): number | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const n = Number(s.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function asInt(v: any): number | null {
  const n = asNumber(v);
  return n === null ? null : Math.round(n);
}

function asString(v: any): string {
  return v === undefined || v === null ? "" : String(v).trim();
}

function parseMaybeDate(s: string): Date | null {
  if (!s) return null;
  const direct = new Date(s);
  if (!isNaN(direct.getTime())) return direct;
  // Try common formats like "05 April 2024", "31 March 2024", etc.
  const patterns = ["d MMMM yyyy", "dd MMMM yyyy", "d MMM yyyy", "dd MMM yyyy", "MMMM d, yyyy", "yyyy-MM-dd"];
  for (const fmt of patterns) {
    const d = parseDateFns(s, fmt, new Date());
    if (isValidDateFns(d)) return d;
  }
  return null;
}

function extractEventNameAndMaybeDateFromProductName(name: string): { title: string; maybeDate: Date | null } {
  // Heuristic: if product name contains " - " and right-hand part looks date-like, parse it.
  const parts = asString(name).split(" - ");
  if (parts.length >= 2) {
    const maybeDate = parseMaybeDate(parts[parts.length - 1]);
    if (maybeDate) {
      return { title: parts.slice(0, -1).join(" - ").trim(), maybeDate };
    }
  }
  return { title: asString(name), maybeDate: null };
}

function mapPaymentType(methodTitle: string): string {
  const t = methodTitle.toLowerCase();
  if (t.includes("paypal")) return "paypal";
  if (t.includes("sofort")) return "sofort";
  if (t.includes("iban") || t.includes("sepa")) return "stripeiban";
  if (t.includes("stripe") || t.includes("card") || t.includes("credit")) return "creditcard";
  if (t.includes("bank") || t.includes("bacs") || t.includes("invoice")) return "invoice";
  return "creditcard";
}

function localeFromCountry(iso2: string): string {
  const cc = (iso2 || "").toUpperCase();
  if (cc === "GB" || cc === "IE") return "en-GB";
  if (cc === "US") return "en-US";
  return "en";
}

// Parse WooCommerce line_item_N field: pipe-separated key:value list
function parseLineItemField(s: string | undefined): Record<string,string> {
  const out: Record<string,string> = {};
  if (!s) return out;
  for (const pair of s.split("|")) {
    const [k, ...rest] = pair.split(":");
    if (!k) continue;
    out[k] = rest.join(":");
  }
  return out;
}

async function readCsv<T=Record<string,string>>(file: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const rows: any[] = [];
    createReadStream(file)
      .pipe(parse({ columns: true, relax_column_count: true }))
      .on("data", (r) => rows.push(r))
      .on("end", () => resolve(rows))
      .on("error", reject);
  });
}

// --- Import Products (Events) ----------------------------------------------

async function importProducts(productsCsv: string, datesMap?: Map<string, any>) {
  const rows = await readCsv<ProductRow>(productsCsv);
  console.log(`Products rows: ${rows.length}`);

  for (const r of rows) {
    const type = asString(r["Type"]);
    if (type && type !== "event_ticket_manager") continue; // only import our event products

    const name = asString(r["Name"]);
    if (!name) continue;

    const { title, maybeDate } = extractEventNameAndMaybeDateFromProductName(name);
    const override = datesMap ? datesMap.get(title.trim().toLowerCase()) : null;
    const startOverride = override ? parseAuthoritativeDate(override.Start as string) : null;
    const endOverride = override ? parseAuthoritativeDate(override.End as string) : null;
    const priceOverride = override && override.Price ? asNumber(String(override.Price)) : null;
    const description = asString(r["Description"]) || asString(r["Short description"]);
    const price = asNumber(r["Regular price"]) ?? 0;
    const stock = asInt(r["Stock"]);

    // Upsert Event
    let event = await prisma.event.findFirst({ where: { title } });
    if (!event) {
      Summary.eventsCreated++; event = await prisma.event.create({
        data: {
          title,
          description: description || null,
          seatType: "free",
        },
      });
      console.log("Created Event:", event.id, title);
      await ensureEventLinkedToVenue(event.id);
    }

    // Ensure EventDate exists (one per product)
    let eventDate = await prisma.eventDate.findFirst({
      where: { eventId: event.id },
      orderBy: { id: "asc" },
    });
    if (!eventDate) {
      Summary.eventDatesCreated++; eventDate = await prisma.eventDate.create({
        data: {
          event: { connect: { id: event.id } },
          title: title,
          date: (startOverride || maybeDate) || null,
          totalTicketLimit: stock ?? null,
        },
      });
      console.log("Created EventDate:", eventDate.id, "for", title, maybeDate?.toISOString() || "(no date)");
    }

    // Create (or find) a per-event category
    const effectivePrice = (override && override.Price !== undefined && override.Price !== '') ? Number(override.Price) : ((priceOverride ?? price) || 0);
    const defaultLabel = toDefaultLabel(effectivePrice);
    let category = await prisma.category.findFirst({ where: { label: defaultLabel } });
    if (!category) {
      Summary.categoriesCreated++; category = await prisma.category.create({
        data: { label: defaultLabel, price: effectivePrice },
      });
      console.log("Created Category:", category.id, category.label, "price", category.price);
    }

    // link category to event (join table) without duplicates
    const link = await prisma.categoriesOnEvents.findUnique({
      where: { eventId_categoryId: { eventId: event.id, categoryId: category.id } },
    }).catch(() => null);

    if (!link) {
      Summary.categoriesLinked++; await prisma.categoriesOnEvents.create({
        data: {
          event: { connect: { id: event.id } },
          category: { connect: { id: category.id } },
          maxAmount: stock ?? null,
        },
      });
      console.log("Linked Category to Event:", event.id, category.id);
    }
  }
}

// --- Import Orders (Bookings) ----------------------------------------------

function iterLineItems(row: OrderRow): Array<{name:string, quantity:number, subtotal:number, productId?:string}> {
  const items: Array<{name:string, quantity:number, subtotal:number, productId?:string}> = [];
  let idx = 1;
  while (true) {
    const key = `line_item_${idx}`;
    const altNameKey = `Product Item ${idx} Name`;
    if (!(key in row) && !(altNameKey in row)) break;

    let name = asString(row[altNameKey]) || "";
    let productId: string | undefined = undefined;
    let quantity = asInt(row[`Product Item ${idx} Quantity`]) ?? undefined;
    let subtotal = asNumber(row[`Product Item ${idx} Subtotal`]) ?? undefined;

    // If minimal columns exist, parse the pipe-encoded field
    if (row[key]) {
      const parsed = parseLineItemField(row[key]);
      if (!name) name = asString(parsed["name"]);
      if (!productId) productId = asString(parsed["product_id"]);
      if (quantity == null) quantity = asInt(parsed["quantity"]) ?? undefined;
      if (subtotal == null) subtotal = asNumber(parsed["sub_total"]) ?? asNumber(parsed["total"]) ?? undefined;
    }

    if (name) {
      items.push({
        name,
        quantity: quantity ?? 1,
        subtotal: subtotal ?? 0,
        productId,
      });
    }
      // Ensure venue linkage for order-created events
      await ensureEventLinkedToVenue(event.id);

    idx++;
  }
  return items;
}

async function importOrders(ordersCsv: string, datesMap?: Map<string, any>) {
  const rows = await readCsv<OrderRow>(ordersCsv);
  console.log(`Orders rows: ${rows.length}`);

  for (const r of rows) {
    try {
      const orderId = asString(r["order_id"]);
      const orderNumber = asString(r["order_number"]);
      const orderDate = parseMaybeDate(asString(r["paid_date"])) || parseMaybeDate(asString(r["order_date"])) || new Date();
      const status = asString(r["status"]).toLowerCase();
      const billingCountry = asString(r["billing_country"]) || "GB";
      const idempotencyKey = `wc-order-${orderId || orderNumber}`;

      // Build user (billing) data
      const userData = {
        firstName: asString(r["billing_first_name"]) || "Unknown",
        lastName:  asString(r["billing_last_name"]) || "Unknown",
        email:     asString(r["billing_email"]) || `unknown+${orderId}@example.com`,
        phone:     asString(r["billing_phone"]),
        address:   asString(r["billing_address_1"]) || "",
        zip:       asString(r["billing_postcode"]) || "",
        city:      asString(r["billing_city"]) || "",
        countryCode: billingCountry,
        regionCode:  asString(r["billing_state"]) || "",
      };

      // Find or create the user by email
      let user = await prisma.user.findFirst({ where: { email: userData.email } });
      if (!user) {
        user = await prisma.user.create({ data: userData });
      }

      // Determine payment type
      const paymentType = mapPaymentType(asString(r["payment_method_title"]) || asString(r["payment_method"]));

      // Build shipping JSON (use billing if shipping missing)
      const shipping = {
        firstName: asString(r["shipping_first_name"]) || userData.firstName,
        lastName:  asString(r["shipping_last_name"])  || userData.lastName,
        address:   asString(r["shipping_address_1"]) || userData.address,
        city:      asString(r["shipping_city"])       || userData.city,
        zip:       asString(r["shipping_postcode"])   || userData.zip,
        country:   asString(r["shipping_country"])    || userData.countryCode,
        region:    asString(r["shipping_state"])      || userData.regionCode,
      };

      // Parse line items to figure out Event + Category + Tickets
      const items = iterLineItems(r);
      if (items.length === 0) {
        console.warn("Order has no items; skipping", orderId);
        continue;
      }

      // We treat the first item as the primary event (common case: one event per order).
      const firstItem = items[0];
      const { title: eventTitle, maybeDate } = extractEventNameAndMaybeDateFromProductName(firstItem.name);

      // Upsert Event
      const override = datesMap ? datesMap.get(eventTitle.trim().toLowerCase()) : null;
      const startOverride = override ? parseAuthoritativeDate(override.Start as string) : null;
      const endOverride = override ? parseAuthoritativeDate(override.End as string) : null;
      let event = await prisma.event.findFirst({ where: { title: eventTitle } });
      if (event) { await ensureEventLinkedToVenue(event.id); }
      if (!event) {
        Summary.eventsCreated++; event = await prisma.event.create({
          data: {
            title: eventTitle,
            seatType: "free",
          },
        });
        console.log("Created Event from order:", event.id, eventTitle);
        await ensureEventLinkedToVenue(event.id);
      }

      // Ensure EventDate exists; if we have a date guess from product name, try to use it,
      // otherwise ensure there's at least one EventDate for linking.
      let eventDate = await prisma.eventDate.findFirst({ where: { eventId: event.id } });
      if (!eventDate) {
        Summary.eventDatesCreated++; eventDate = await prisma.eventDate.create({
          data: {
            event: { connect: { id: event.id } },
            title: eventTitle,
            date: (startOverride || maybeDate) || null,
          },
        });
      }
      // Ensure venue linkage for order-created events
      await ensureEventLinkedToVenue(event.id);

      // Create or update the event-specific category for each item
      const ticketsToCreate: Array<{ categoryId: number; amount: number }> = [];
      // Determine distinct tiers; if only 1, use Default {price}, else derive tier names
      const perItemUnitPrices = items.map(it => {
        const unit = (it.subtotal && it.quantity) ? (it.subtotal / it.quantity) : 0;
        return { name: it.name, quantity: it.quantity, unitPrice: unit };
      });

      const uniquePrices = Array.from(new Set(perItemUnitPrices.map(x => Number((x.unitPrice || 0).toFixed(2)))));
      const singleType = uniquePrices.length <= 1;

      if (singleType) {
        const price = (startOverride && override && override.Price !== undefined && override.Price !== null && override.Price !== '')
  ? Number(override.Price)
  : (uniquePrices[0] ?? 0);
        const defaultLabel = toDefaultLabel(price);
        let category = await prisma.category.findFirst({ where: { label: defaultLabel } });
        if (!category) {
          Summary.categoriesCreated++; category = await prisma.category.create({ data: { label: defaultLabel, price } });
        }
        // Ensure link to this event
        const linked = await prisma.categoriesOnEvents.findUnique({
          where: { eventId_categoryId: { eventId: event.id, categoryId: category.id } },
        }).catch(() => null);
        if (!linked) {
          Summary.categoriesLinked++; await prisma.categoriesOnEvents.create({
            data: { event: { connect: { id: event.id } }, category: { connect: { id: category.id } } }
          });
        }
        const totalQty = perItemUnitPrices.reduce((s, x) => s + (x.quantity || 1), 0);
        ticketsToCreate.push({ categoryId: category.id, amount: totalQty });
      } else {
        // Multiple ticket types: derive a tier label from item name
        for (const it of perItemUnitPrices) {
          const tier = extractTierName(it.name, eventTitle);
          let category = await prisma.category.findFirst({ where: { label: tier } });
          if (!category) {
            Summary.categoriesCreated++; category = await prisma.category.create({ data: { label: tier, price: it.unitPrice || 0 } });
          }
          // Link to event if needed
          const linked = await prisma.categoriesOnEvents.findUnique({
            where: { eventId_categoryId: { eventId: event.id, categoryId: category.id } },
          }).catch(() => null);
          if (!linked) {
            Summary.categoriesLinked++; await prisma.categoriesOnEvents.create({
              data: { event: { connect: { id: event.id } }, category: { connect: { id: category.id } } }
            });
          }
          ticketsToCreate.push({ categoryId: category.id, amount: it.quantity || 1 });
        }
      }

      // Totals and discount
      const orderSubtotal = asNumber(r["order_subtotal"]) ?? 0;
      const orderTotal    = asNumber(r["order_total"]) ?? orderSubtotal;
      const discountTotal = asNumber(r["discount_total"]) ?? asNumber(r["order_discount"]) ?? 0;

      // Status mapping
      const statusMap: Record<string,string> = {
        "completed": "PAID",
        "processing": "PAID",
        "on-hold": "PAID",
        "pending": "PENDING",
        "cancelled": "CANCELLED",
        "refunded": "REFUNDED",
        "failed": "FAILED",
      };
      const mappedStatus = statusMap[status] || "PAID";

      // Upsert Order by idempotencyKey
      let order = await prisma.order.findFirst({ where: { idempotencyKey } });
      if (!order) {
        Summary.ordersCreated++; order = await prisma.order.create({
          data: {
            eventDate: { connect: { id: eventDate.id } },
            paymentType,
            user: { connect: { id: user.id } },
            shipping: JSON.stringify(shipping),
            locale: localeFromCountry(billingCountry),
            idempotencyKey,
            cancellationSecret: "imported", // not used for imported
            invoiceNumber: asInt(orderNumber) ?? undefined,
            status: mappedStatus,
            date: orderDate,
            tickets: {
              create: ticketsToCreate.map(t => { Summary.ticketsCreated += 1; return (
                category: { connect: { id: t.categoryId } },
                amount: t.amount,
              })),
            },
            // Discount fields
            discountAmount: discountTotal || 0,
            originalTotal: orderSubtotal || undefined,
            finalTotal: orderTotal || undefined,
          },
        });
      } else {
        // Update totals/status (idempotent re-run)
        Summary.ordersUpdated++; order = await prisma.order.update({
          where: { id: order.id },
          data: {
            status: mappedStatus,
            discountAmount: discountTotal || 0,
            originalTotal: orderSubtotal || undefined,
            finalTotal: orderTotal || undefined,
          },
        });
      }

      console.log(`Imported order ${orderNumber} → ${order.id}`);
    } catch (err: any) {
      console.error("Failed to import order row:", err?.message || err, r);
    }
  }
}

// --- CLI ---------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2);
  const productsCsv = args.includes("--products") ? args[args.indexOf("--products")+1] : null;
  const ordersCsv = args.includes("--orders") ? args[args.indexOf("--orders")+1] : null;
  const eventsDatesCsv = args.includes("--events-dates") ? args[args.indexOf("--events-dates")+1] : null;
  const wantSummary = args.includes("--summary");

  if (!productsCsv && !ordersCsv) {
    console.log("Usage: npx ts-node scripts/import-woocommerce.ts --products <products.csv> --orders <orders.csv>");
    process.exit(1);
  }

  /* REQUIRE_EVENTS_DATES */
  if (!eventsDatesCsv) {
    console.error("ERROR: You must provide --events-dates <path to events-dates-merged.csv>");
    process.exit(1);
  }
  if (!eventsDatesCsv) {
    console.error("ERROR: --events-dates <file> is required.");
    process.exit(1);
  }
  if (eventsDatesCsv) {
    console.log("Using authoritative events-dates from:", eventsDatesCsv);
    authoritativeDatesMap = await readEventsDatesCsv(eventsDatesCsv);
  }

  if (productsCsv) {
    console.log("Importing products/events from:", productsCsv);
    await importProducts(productsCsv, authoritativeDatesMap || undefined);
  }
  if (ordersCsv) {
    console.log("Importing orders/bookings from:", ordersCsv);
    await importOrders(ordersCsv, authoritativeDatesMap || undefined);
  }
  if (wantSummary) {
    console.log("\n== Import Summary ==");
    console.log(JSON.stringify(Summary, null, 2));
  }
}

main().then(() => prisma.$disconnect()).catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
