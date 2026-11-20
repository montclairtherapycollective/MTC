/**
 * Form handler for montclairtherapycollective.com (Cloudflare Pages Function)
 * POST /api/contact
 *
 * Handles the three site forms, told apart by the `form` field:
 *   contact     name, email, topic, message
 *   get-listed  name, credentials, email, practice, town, website, specialties, taking, format, notes
 *   present     name, credentials, email, town, title, summary, objectives, timing
 *
 * Environment variables (Cloudflare Pages > Settings > Variables and Secrets):
 *   RESEND_API_KEY   secret, Resend API key
 *   TO_EMAIL         where submissions go (montclairtherapycollective@gmail.com)
 *   FROM_EMAIL       verified Resend sender, e.g. website@notify.montclairtherapycollective.com
 *   HEALTH_TOKEN     secret, lets a health check run without emailing Jen
 *   HEALTH_TO        where health checks go
 *
 * Health check: POST with header x-health-token: <HEALTH_TOKEN> and a valid
 * name and email. It emails only HEALTH_TO and skips the auto-reply.
 */

const ORG = {
  name: 'Montclair Therapy Collective',
  short: 'MTC',
  site: 'montclairtherapycollective.com',
  replyTo: 'montclairtherapycollective@gmail.com',
  signer: 'Jen',
  signature: 'Jennifer Joseph, PsyD, CGP<br>Founder, Montclair Therapy Collective<br>96 Park St, Montclair, NJ',
  signatureText: 'Jennifer Joseph, PsyD, CGP\nFounder, Montclair Therapy Collective\n96 Park St, Montclair, NJ',
};

const C = { pine: '#0E4F52', teal: '#027F81', ink: '#1D2B33', mid: '#4F5B63', line: '#E1E7E6', paper: '#F5F7F6' };

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(e || '').trim());

const shell = (inner, foot) => `<!doctype html><html><body style="margin:0;padding:0;background:${C.paper}">
<div style="margin:0;padding:32px 16px;background:${C.paper};font-family:Helvetica,Arial,sans-serif;color:${C.ink}">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;margin:0 auto">
    <tr><td style="padding:0 0 18px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:${C.mid}">${ORG.name}</td></tr>
    <tr><td style="background:#FFFFFF;border-top:3px solid ${C.teal};padding:32px 32px 28px">${inner}</td></tr>
    <tr><td style="padding:18px 8px 0;font-size:13px;line-height:1.5;color:${C.mid}">${foot}</td></tr>
  </table>
</div></body></html>`;

// What each form is called, which fields it carries and in what order.
const FORMS = {
  contact: {
    label: 'Contact form',
    subject: (d) => `New message from ${d.name}: ${d.topic || 'General question'}`,
    rows: [['topic', "What it's about"], ['email', 'Email']],
    long: [['message', 'Message']],
    thanks: (d) => `Thanks for writing, ${d.first}.`,
    body: 'Your message got through. Jen reads every one and will reply by email, usually within a couple of days.',
  },
  'get-listed': {
    label: 'Get listed form',
    subject: (d) => `Early list: ${d.name}${d.credentials ? ', ' + d.credentials : ''}${d.town ? ' (' + d.town + ')' : ''}`,
    rows: [['credentials', 'Credentials'], ['email', 'Email'], ['practice', 'Practice'], ['town', 'Town'], ['website', 'Website'], ['taking', 'Taking new clients'], ['format', 'Sessions']],
    long: [['specialties', 'What they work with'], ['notes', 'Anything else']],
    thanks: (d) => `You're on the early list, ${d.first}.`,
    body: 'Jen will be in touch when directory listings open. In the meantime, come to an event and say hello.',
  },
  present: {
    label: 'Present a workshop form',
    subject: (d) => `Workshop proposal from ${d.name}: ${d.title || '(untitled)'}`,
    rows: [['credentials', 'Credentials'], ['email', 'Email'], ['town', 'Where they practice'], ['title', 'Working title'], ['timing', 'Months that work']],
    long: [['summary', 'What it covers'], ['objectives', 'Learning objectives']],
    thanks: (d) => `Proposal received, ${d.first}.`,
    body: 'Thank you. Jen reads every proposal and will reply by email once she has looked it over.',
  },
};

const FIELDS = ['topic', 'message', 'credentials', 'practice', 'town', 'website', 'specialties', 'taking', 'format', 'notes', 'title', 'summary', 'objectives', 'timing'];

function notifyHtml(d, spec) {
  const row = (label, value, last) =>
    `<tr><td style="padding:10px 0;border-top:1px solid ${C.line};${last ? 'border-bottom:1px solid ' + C.line + ';' : ''}width:38%;color:${C.mid};vertical-align:top">${label}</td><td style="padding:10px 0;border-top:1px solid ${C.line};${last ? 'border-bottom:1px solid ' + C.line + ';' : ''}">${value}</td></tr>`;
  const val = (k) => {
    if (k === 'email') return `<a href="mailto:${esc(d.email)}" style="color:${C.pine}">${esc(d.email)}</a>`;
    if (k === 'website' && d.website) {
      const u = /^https?:\/\//i.test(d.website) ? d.website : 'https://' + d.website;
      return `<a href="${esc(u)}" style="color:${C.pine}">${esc(d.website)}</a>`;
    }
    return d[k] ? esc(d[k]) : '<span style="color:' + C.mid + '">Not given</span>';
  };
  const rows = spec.rows.map(([k, l], i) => row(l, val(k), i === spec.rows.length - 1)).join('');
  const longs = spec.long
    .map(([k, l]) => `<p style="margin:24px 0 8px;font-size:13px;letter-spacing:.04em;text-transform:uppercase;color:${C.mid}">${l}</p><p style="margin:0;font-size:16px;line-height:1.5;white-space:pre-line">${d[k] ? esc(d[k]) : '(Not given)'}</p>`)
    .join('');
  const inner = `
      <h1 style="margin:0 0 6px;font:400 26px/1.2 Georgia,'Times New Roman',serif;color:${C.pine}">${esc(spec.subject(d))}</h1>
      <p style="margin:0 0 26px;font-size:15px;color:${C.mid}">${spec.label} on ${ORG.site}, ${esc(d.when)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="font-size:16px;line-height:1.45">${rows}</table>
      ${longs}
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:30px"><tr><td style="background:${C.teal};border-radius:4px"><a href="mailto:${esc(d.email)}?subject=Re:%20${encodeURIComponent(ORG.name)}" style="display:inline-block;padding:13px 20px;color:#FFFFFF;font-weight:600;font-size:15px;text-decoration:none">Reply to ${esc(d.first)}</a></td></tr></table>`;
  return shell(inner, 'This came through a form on the MTC website. Hitting reply goes straight back to the sender.');
}

function notifyText(d, spec) {
  const lines = [spec.subject(d), '', `${spec.label} on ${ORG.site}, ${d.when}`, '', `Name: ${d.name}`];
  for (const [k, l] of spec.rows) lines.push(`${l}: ${d[k] || 'Not given'}`);
  for (const [k, l] of spec.long) lines.push('', l + ':', d[k] || '(Not given)');
  return lines.join('\n');
}

function autoReplyHtml(d, spec) {
  const inner = `
      <h1 style="margin:0 0 18px;font:400 26px/1.2 Georgia,'Times New Roman',serif;color:${C.pine}">${esc(spec.thanks(d))}</h1>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.5">${spec.body}</p>
      <p style="margin:0 0 16px;font-size:16px;line-height:1.5">Upcoming networking nights and workshops are always on the <a href="https://${ORG.site}/events/" style="color:${C.pine}">events page</a>.</p>
      <p style="margin:0;font-size:16px;line-height:1.5">Warmly,<br>${ORG.signer}</p>
      <p style="margin:22px 0 0;font-size:14px;line-height:1.5;color:${C.mid}">${ORG.signature}</p>`;
  return shell(inner, `You received this because you filled out a form on ${ORG.site}. If that wasn&rsquo;t you, you can ignore it.`);
}

function autoReplyText(d, spec) {
  return `${spec.thanks(d)}\n\n${spec.body.replace(/&rsquo;/g, "'")}\n\nUpcoming networking nights and workshops are always at https://${ORG.site}/events/\n\nWarmly,\n${ORG.signer}\n\n${ORG.signatureText}`;
}

async function send(env, msg) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify(msg),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text().catch(() => '')).slice(0, 300)}`);
  return res.json().catch(() => ({}));
}

export async function onRequestPost({ request, env, waitUntil }) {
  let data;
  try {
    const ct = request.headers.get('content-type') || '';
    data = ct.includes('application/json') ? await request.json() : Object.fromEntries(await request.formData());
  } catch {
    return json({ ok: false, error: 'Could not read that submission.' }, 400);
  }

  if (data.company_site || data.website_url) return json({ ok: true }); // honeypot

  const kind = String(data.form || 'contact');
  const spec = FORMS[kind] || FORMS.contact;

  const d = {
    form: kind,
    name: String(data.name || '').trim().slice(0, 120),
    email: String(data.email || '').trim().slice(0, 200),
    when: new Date().toLocaleString('en-US', { timeZone: 'America/New_York', dateStyle: 'full', timeStyle: 'short' }) + ' ET',
  };
  for (const k of FIELDS) d[k] = String(data[k] || '').trim().slice(0, k === 'message' || k === 'specialties' || k === 'summary' || k === 'objectives' || k === 'notes' ? 5000 : 200);
  d.first = d.name.split(/\s+/)[0] || 'there';

  if (!d.name || !validEmail(d.email)) {
    return json({ ok: false, error: 'Please add your name and a valid email.' }, 400);
  }

  if (!env.RESEND_API_KEY || !env.TO_EMAIL || !env.FROM_EMAIL) {
    return json({ ok: false, error: 'not_configured' }, 503);
  }

  const tokenHeader = request.headers.get('x-health-token');
  const health = !!(env.HEALTH_TOKEN && tokenHeader === env.HEALTH_TOKEN);
  if (tokenHeader && !health) return json({ ok: false, error: 'bad_token' }, 403);

  const fromAddr = env.FROM_EMAIL.replace(/^.*</, '').replace(/>$/, '');
  const from = `${ORG.name} <${fromAddr}>`;
  const to = health ? (env.HEALTH_TO || env.TO_EMAIL) : env.TO_EMAIL;
  const tag = health ? '[Health check] ' : '';

  try {
    await send(env, {
      from, to: [to], reply_to: d.email,
      subject: `${tag}${spec.subject(d)}`,
      html: notifyHtml(d, spec),
      text: notifyText(d, spec),
    });
  } catch (err) {
    console.error('notify failed', err.message);
    return json({ ok: false, error: 'send_failed' }, 502);
  }

  // The visitor's confirmation is a courtesy; a failure never blocks the inquiry.
  if (!health) {
    const later = typeof waitUntil === 'function' ? waitUntil : (p) => p;
    later(
      send(env, {
        from: `${ORG.signer} at ${ORG.name} <${fromAddr}>`,
        to: [d.email], reply_to: ORG.replyTo,
        subject: spec.thanks(d).replace(/\.$/, ''),
        html: autoReplyHtml(d, spec),
        text: autoReplyText(d, spec),
      }).catch((err) => console.error('auto-reply failed', err.message)),
    );
  }

  return json({ ok: true, health });
}

export const onRequest = () => json({ ok: false, error: 'Method not allowed.' }, 405);
