export async function storeOrderOnServer(params: {
  order: {
    tickets: Array<{ categoryId: number, amount: number, price: number }>,
    reservationId: string,
    ticketPersonalizationRequired?: boolean
  },
  user: any,
  eventDateId: number,
  paymentType?: 'CreditCard' | string,
  locale?: string,
  discountCode?: string | null
}) {
  const {
    order,
    user,
    eventDateId,
    paymentType = 'CreditCard',
    locale = 'en',
    discountCode = null
  } = params;

  // IMPORTANT: duplicate tickets + reservationId at top level for API compatibility
  const payload = {
    order,
    user,
    eventDateId,
    paymentType,
    locale,
    discountCode,
    tickets: order.tickets,
    reservationId: order.reservationId
  };

  // Debug: confirm shape right before sending
  console.log('STORE payload ->', JSON.stringify(payload));

  const res = await fetch('/api/order/store', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload)  // do NOT leave this undefined
    // No keepalive:true on Vercel
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    if (res.status === 422) {
      let details: any = {};
      try { details = JSON.parse(text); } catch {}
      throw new Error(details?.error || 'Tickets invalid');
    }
    if (res.status === 400) {
      throw new Error('Bad request: ' + text);
    }
    throw new Error(`Server error ${res.status}: ${text}`);
  }

  return res.json();
}
