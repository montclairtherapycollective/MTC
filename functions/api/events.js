/**
 * Upcoming events (Cloudflare Pages Function), GET /api/events
 * Reads MTC's public Luma calendar and returns the short list the site renders.
 * Cached for 10 minutes at the edge, so a new Luma event shows up on the site
 * within minutes and Jen never has to touch the website.
 */
const CAL = 'cal-mo9ZiCFFgd3Eo5t';

export async function onRequestGet() {
  const url = `https://api.lu.ma/calendar/get-items?calendar_api_id=${CAL}&period=future&pagination_limit=30`;
  const r = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' }, cf: { cacheTtl: 600, cacheEverything: true } });
  if (!r.ok) return new Response('[]', { status: 502, headers: { 'content-type': 'application/json' } });
  const d = await r.json();
  const out = (d.entries || []).map((e) => {
    const ev = e.event, t = e.ticket_info || {}, g = ev.geo_address_info || {}, p = t.price || {};
    return {
      name: ev.name, start: ev.start_at, end: ev.end_at, tz: ev.timezone || 'America/New_York',
      url: 'https://luma.com/' + ev.url, place: g.address || '', city: g.city_state || '',
      cents: p.cents ?? null, flexible: !!p.is_flexible, free: !!t.is_free,
      spots: t.spots_remaining ?? null, near: !!t.is_near_capacity, sold_out: !!t.is_sold_out,
    };
  }).sort((a, b) => (a.start < b.start ? -1 : 1));
  return new Response(JSON.stringify(out), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'public, max-age=600' },
  });
}
