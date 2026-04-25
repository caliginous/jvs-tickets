# Waitlist & Inventory Management — Staff Guide

## What's changed?

We've added two new features to the ticketing system:

1. **Controlled inventory release** — When you refund or cancel an order, the seats no longer go straight back on sale. You choose when to release them.
2. **Waitlist** — When an event sells out, customers can join a waitlist. When you release seats, the system automatically offers them to people on the waitlist in the order they joined.

This guide walks you through how it all works.

---

## Part 1: Refunds and cancellations now work differently

### What happens when you refund or cancel an order

Previously, refunding or cancelling an order immediately put those seats back on sale. Now it works in two steps:

**Step 1 — The refund or cancellation happens as normal.** The customer gets their money back (or the booking is cancelled). But the seats stay **held** — they don't appear as available to the public yet.

**Step 2 — You release the seats when you're ready.** You do this by clicking a "Return to pool" button on the order. Only then do the seats become available again.

### Why the change?

This gives you more control. For example:

- If someone cancels and you know their friend wants to take their place, you can hold the seats while you sort it out — without worrying about someone else snapping them up in the meantime.
- If you need to check something before making seats available again, you can.
- If there's a waitlist (more on this below), you decide when to trigger it.

### How to tell if seats are being held

When you look at an order that's been refunded or cancelled, you'll see two pieces of information:

- **Financial status** — Shows "Refunded" or "Cancelled" (same as before)
- **Inventory status** — Shows either:
  - **"Held from resale"** (amber badge) — The seats are still reserved and not available to the public
  - **"Returned to pool"** (green badge) — The seats have been released and are available again

### How to release held seats

1. Go to the **Orders** page in the admin panel
2. Find the refunded or cancelled order
3. Open the order details
4. In the payment information section, you'll see the amber "Held from resale" badge
5. Click the **Return to pool** button next to it
6. The seats are now available again (and if anyone is on the waitlist, they'll be offered automatically — see Part 2)

### Important things to know

- The refund and cancellation dialogs now show a reminder: *"This does not automatically reopen the place. Capacity stays held until you explicitly return it to the pool."*
- You can take as long as you need before releasing the seats. There's no time limit.
- The number of available tickets shown to the public won't change until you click "Return to pool."

---

## Part 2: The waitlist

### How customers join the waitlist

When a ticket type is completely sold out, the event page now shows a **"Join the Waitlist"** form instead of just saying "Sold Out."

The customer fills in:
- Their name
- Their email address
- Their phone number (optional)
- Which ticket type they want (if there are multiple)
- How many tickets they need

They get a confirmation message on screen. Each person can only have one active waitlist entry per ticket type — if they try to join again, they'll see a message saying they're already on the list.

### How offers are sent

Waitlist offers are **not** sent automatically when someone cancels. They're sent when you **return seats to the pool** (the step described in Part 1 above). Here's what happens:

1. You click "Return to pool" on a refunded/cancelled order
2. The system checks: is anyone on the waitlist for this event and ticket type?
3. If yes, it works through the queue **in the order people joined** (first come, first served)
4. For each person whose request fits the available seats, it sends them an email
5. The email says: *"Tickets now available — complete your booking within 2 hours"*

### What the customer receives

The offer email includes:
- The event name, date, time, and venue
- The ticket type and how many
- A deadline (2 hours from when the offer was sent)
- A link to claim their tickets

When they click the link, they see a page with the offer details and a countdown timer. They click "Continue to Checkout" and go through the normal booking process (enter their details, pay if it's a paid event).

### What happens if they don't respond?

- If the 2 hours pass without them claiming, the offer **expires automatically**
- The seats go back into the available pool
- The **next person** on the waitlist gets offered
- This keeps going until either someone claims or the waitlist is exhausted

A customer can also **actively decline** the offer, which immediately frees the seats for the next person.

### What if someone wants more tickets than are available?

Say there are 2 seats available, and the first person on the waitlist wants 4. The system **skips** them and looks at the next person. If the next person only wants 1, they get offered.

The person who wanted 4 stays on the waitlist — they're not removed. They'll get offered if enough seats become available in the future.

### While an offer is active

During the 2-hour window:
- The offered seats are **reserved** for that person — they won't show as available to the public
- No one else can buy those specific seats
- If the customer doesn't claim them, they automatically free up when the offer expires

---

## Part 3: Managing the waitlist

### Where to find the waitlist

Go to: **Admin → Events → [Your Event] → Waitlist**

(The URL will be something like `/admin/events/[eventId]/waitlist`)

### What you'll see

**Summary cards** at the top:
- **Active Entries** — How many people are currently waiting
- **Active Offers** — How many people have a live offer right now (with their 2-hour window ticking)
- **Fulfilled** — How many people successfully claimed their offer and completed a booking
- **Conversion Rate** — What percentage of offers sent were actually claimed

**Active Offers table** — Shows anyone who currently has a live offer:
- Their name and email
- Which ticket type
- How many tickets
- When the offer expires

**All Entries table** — The full waitlist history:
- Everyone who ever joined, with their current status
- Statuses include: Active (waiting), Offered (has a live offer), Fulfilled (completed booking), Expired (offer wasn't claimed), Declined (customer passed), Removed (you removed them)

### Things you can do

**Run Allocation** (button at the top)
- Manually triggers the system to check availability and send offers
- Normally this happens automatically when you return inventory to the pool
- Use this if you've increased capacity for a ticket type and want to offer the extra seats to waitlisted people

**Resend** (on an active offer)
- Resends the offer email to the customer
- Useful if they say they didn't receive it
- Only works while the offer is still active (within the 2-hour window)

**Expire** (on an active offer)
- Manually expires someone's offer before the 2 hours are up
- The seats go back to available
- The next person on the waitlist may get offered
- Use this if you need to reassign urgently

**Remove** (on a waitlist entry)
- Removes someone from the waitlist entirely
- If they have an active offer, it's cancelled
- They won't be offered again unless they rejoin

---

## Quick reference: common scenarios

### "Someone cancelled. I want to offer their seat to the waitlist."
1. Process the cancellation as normal
2. Go to the order → click **Return to pool**
3. The system sends offers to the waitlist automatically

### "Someone cancelled, but I already know who should get the seat."
1. Process the cancellation as normal
2. Don't click "Return to pool" yet — the seat stays held
3. Sort out the replacement booking however you need to
4. If the replacement is done outside the system, you can leave the seat held or return it later

### "I want to see who's waiting for a sold-out event."
1. Go to **Admin → Events → [Event] → Waitlist**
2. Look at the "All Entries" table filtered by status "Active"

### "Someone on the waitlist says they didn't get the email."
1. Go to the event's waitlist page
2. Find their offer in the "Active Offers" table
3. Click **Resend**

### "I increased the ticket capacity for an event."
1. Go to the event's waitlist page
2. Click **Run Allocation**
3. Offers will be sent based on the new availability

### "I want to remove someone from the waitlist."
1. Go to the event's waitlist page
2. Find them in the "All Entries" table
3. Click **Remove**

### "An offer was sent but I need to give the seat to someone else."
1. Go to the event's waitlist page
2. Find the offer in "Active Offers"
3. Click **Expire** to cancel it
4. The seat becomes available — either for the next waitlisted person or for you to assign manually

---

## Things to keep in mind

- **Returning to pool is the trigger.** The waitlist doesn't do anything on its own — it only sends offers when you release seats.
- **One entry per person per ticket type.** A customer can't join the same waitlist twice. If they want to change their quantity, they'd need to contact you.
- **Offers reserve capacity.** While someone has a live offer, those seats aren't available to anyone else. This is by design — it prevents double-selling.
- **The 2-hour window is automatic.** You don't need to do anything when offers expire. The system handles it and moves to the next person.
- **Existing bookings are unaffected.** None of this changes how normal (non-waitlist) bookings work. The regular checkout is exactly the same as before.
