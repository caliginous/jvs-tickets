/**
 * DEPRECATED: This migration script was used to migrate WordPress events to Tessera.
 * The WordPress backend (backend.jvs.org.uk) is no longer active.
 * This script is kept for historical reference only.
 */
import prisma from "../src/lib/prisma";
import axios from "axios";

const WP_GRAPHQL_URL = process.env.WP_GRAPHQL_URL;
if (!WP_GRAPHQL_URL) {
  console.error("Missing WP_GRAPHQL_URL - WordPress backend is deprecated");
  process.exit(1);
}

type WPEvent = {
  id: string;
  title: string;
  slug: string;
  content?: string;
  date?: string;
};

async function fetchTwoEvents(): Promise<WPEvent[]> {
  const query = `query GetEvents { events(first: 100) { nodes { id title slug date content } } }`;
  const res = await axios.post(WP_GRAPHQL_URL, { query }, { headers: { "Content-Type": "application/json" } });
  const events: WPEvent[] = res?.data?.data?.events?.nodes || [];
  const slugsEnv = process.env.CURRENT_EVENT_SLUGS?.split(",").map(s => s.trim()).filter(Boolean) || [];
  const filtered = slugsEnv.length > 0 ? events.filter(e => slugsEnv.includes(e.slug)) : events;
  return filtered.slice(0, 2);
}

async function upsertEvent(e: WPEvent) {
  // Optional category and date overrides via env
  const categoriesMap = (() => {
    try { return JSON.parse(process.env.TESSERA_CATEGORIES_JSON || '{}'); } catch { return {}; }
  })();
  const datesMap = (() => {
    try { return JSON.parse(process.env.TESSERA_EVENT_DATES_JSON || '{}'); } catch { return {}; }
  })();

  const categoriesForEvent: Array<{ label: string; price: number; color?: string }> =
    categoriesMap[e.slug] || [
      { label: "Premium", price: 50, color: "#59bb59" },
      { label: "Standard", price: 25, color: "#59B8BB" },
    ];

  const createdCats = [] as Array<{ id: number }>;
  for (const c of categoriesForEvent) {
    const cat = await prisma.category.create({ data: { label: c.label, price: c.price, color: c.color } });
    createdCats.push({ id: cat.id });
  }

  const datesForEvent: string[] = datesMap[e.slug] || [];
  const createDates = (datesForEvent.length > 0
    ? datesForEvent.map((d) => ({ date: new Date(d) }))
    : [{ date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }]
  );

  const event = await prisma.event.create({
    data: {
      title: e.title,
      seatType: "free",
      categories: {
        create: createdCats.map((c) => ({ category: { connect: { id: c.id } } })),
      },
      dates: { create: createDates },
    },
  });
  console.log(`Created event '${event.title}' with id=${event.id}`);
}

async function main() {
  const events = await fetchTwoEvents();
  if (events.length === 0) {
    console.log("No WP events found");
    return;
  }
  for (const e of events) {
    await upsertEvent(e);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


