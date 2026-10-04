// Cloudflare Worker: emails visit + contact-form notifications via Resend.
// Secret (set with `wrangler secret put RESEND_API_KEY`). Other settings are in wrangler.toml [vars].

const ALLOWED_ORIGINS = [
  'https://vipulrathod.site',
  'https://www.vipulrathod.site',
  'http://vipulrathod.site',
  'http://www.vipulrathod.site',
  'https://rathodvipul234.github.io',
];
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clip = (s, n) => String(s ?? '').slice(0, n);

function cors(origin) {
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    Vary: 'Origin',
  };
}

async function sendEmail(env, { subject, html, text, replyTo }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.FROM_EMAIL,
      to: [env.TO_EMAIL],
      subject,
      html,
      text,
      ...(replyTo ? { reply_to: replyTo } : {}),
    }),
  });
  return res.ok;
}

function parseUA(ua = '') {
  const browser =
    (/Edg\//.test(ua) && 'Edge') || (/OPR\//.test(ua) && 'Opera') || (/Firefox\//.test(ua) && 'Firefox') ||
    (/Chrome\//.test(ua) && 'Chrome') || (/Safari\//.test(ua) && 'Safari') || 'Unknown browser';
  const os =
    (/Windows/.test(ua) && 'Windows') || (/Android/.test(ua) && 'Android') || (/iPhone|iPad|iOS/.test(ua) && 'iOS') ||
    (/Mac OS X/.test(ua) && 'macOS') || (/Linux/.test(ua) && 'Linux') || 'Unknown OS';
  const device = /Mobi|Android|iPhone/.test(ua) ? 'Mobile' : 'Desktop';
  const bot = /bot|crawl|spider|slurp|preview|headless/i.test(ua);
  return { label: `${browser} on ${os} (${device})`, bot };
}

function geoInfo(request) {
  const cf = request.cf || {};
  const place = [cf.city, cf.region, cf.country].filter(Boolean).join(', ') || 'Unknown';
  const map = cf.latitude && cf.longitude ? `https://www.google.com/maps?q=${cf.latitude},${cf.longitude}` : null;
  return {
    place,
    map,
    ip: request.headers.get('CF-Connecting-IP') || 'Unknown',
    isp: cf.asOrganization || 'Unknown',
    timezone: cf.timezone || 'Unknown',
  };
}

const TABLE = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">';

const row = (label, value, link) => `
  <tr>
    <td style="padding:10px 0;width:120px;vertical-align:top;font-size:13px;color:#6b7280;">${label}</td>
    <td style="padding:10px 0;vertical-align:top;font-size:15px;color:#111827;font-weight:500;word-break:break-word;">${
      link ? `<a href="${esc(link)}" style="color:#4f46e5;text-decoration:none;">${esc(value)}</a>` : esc(value)
    }</td>
  </tr>
  <tr><td colspan="2" style="border-bottom:1px solid #f0f0f5;font-size:0;line-height:0;">&nbsp;</td></tr>`;

const section = (t) =>
  `<div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#4f46e5;font-weight:700;margin:20px 0 4px;">${t}</div>`;

function layout({ badge, title, intro, body, button }) {
  return `<!doctype html>
<html><body style="margin:0;padding:0;background:#f3f4f8;font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;color:#f3f4f8;">${esc(intro)}</div>
${TABLE.replace('>', ' style="background:#f3f4f8;padding:24px 12px;">')}
<tr><td align="center">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;">
    <tr><td style="background:#4f46e5;background-image:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px 32px;">
      <div style="font-size:12px;letter-spacing:1.5px;text-transform:uppercase;color:#c7d2fe;font-weight:600;">${badge}</div>
      <div style="font-size:24px;line-height:1.3;color:#ffffff;font-weight:700;margin-top:6px;">${title}</div>
      <div style="font-size:14px;color:#e0e7ff;margin-top:6px;">${esc(intro)}</div>
    </td></tr>
    <tr><td style="padding:24px 32px 8px;">${body}</td></tr>
    ${
      button
        ? `<tr><td style="padding:8px 32px 28px;"><a href="${esc(button.href)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:10px;">${button.label}</a></td></tr>`
        : '<tr><td style="padding-bottom:20px;"></td></tr>'
    }
    <tr><td style="background:#f9fafb;padding:16px 32px;font-size:12px;color:#9ca3af;text-align:center;">
      Sent automatically by your portfolio &middot; vipulrathod.site
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

const locationRows = (g) =>
  row('Location', g.place, g.map) + row('IP address', g.ip) + row('Network (ISP)', g.isp) + row('Timezone', g.timezone);

function visitEmail(request, body) {
  const g = geoInfo(request);
  const ua = parseUA(clip(body.ua, 300));
  const html = layout({
    badge: 'New visitor',
    title: `Someone from ${esc(g.place)} opened your site`,
    intro: `${ua.label} · ${new Date().toUTCString()}`,
    body:
      section('Where') + `${TABLE}${locationRows(g)}</table>` +
      section('Device') +
      `${TABLE}${row('Browser / OS', ua.label) + row('Screen', clip(body.screen, 30) || 'Unknown') + row('Language', clip(body.lang, 30) || 'Unknown')}</table>` +
      section('Visit') +
      `${TABLE}${row('Came from', clip(body.referrer, 300) || 'Direct (typed URL / bookmark)') + row('Page', clip(body.page, 200) || '/')}</table>`,
    button: g.map ? { href: g.map, label: 'View on map' } : null,
  });
  const text = [
    'New visitor',
    `Location: ${g.place}`,
    `IP: ${g.ip}`,
    `ISP: ${g.isp}`,
    `Timezone: ${g.timezone}`,
    `Device: ${ua.label}`,
    `Screen: ${body.screen}`,
    `Language: ${body.lang}`,
    `Referrer: ${body.referrer || 'direct'}`,
    `Page: ${body.page}`,
  ].join('\n');
  return { subject: `👀 New visitor from ${g.place}`, html, text, bot: ua.bot };
}

function contactEmail(request, { name, email, subject, message }) {
  const g = geoInfo(request);
  const mailto = `mailto:${clip(email, 150)}?subject=${encodeURIComponent('Re: ' + clip(subject, 150))}`;
  const html = layout({
    badge: 'New message',
    title: esc(clip(subject, 150)),
    intro: `From ${clip(name, 100)} · ${g.place}`,
    body:
      `${TABLE}${row('Name', clip(name, 100)) + row('Email', clip(email, 150), `mailto:${clip(email, 150)}`)}</table>` +
      section('Message') +
      `<div style="background:#f9fafb;border-left:4px solid #4f46e5;border-radius:8px;padding:16px 18px;font-size:16px;line-height:1.65;color:#1f2937;white-space:pre-wrap;word-break:break-word;">${esc(clip(message, 2000))}</div>` +
      section('Sender details') + `${TABLE}${locationRows(g)}</table>`,
    button: { href: mailto, label: `Reply to ${esc(clip(name, 40))}` },
  });
  const text = `New message from ${name} <${email}>\nSubject: ${subject}\n\n${message}\n\n---\nLocation: ${g.place}\nIP: ${g.ip}\nISP: ${g.isp}`;
  return { subject: `✉️ ${clip(name, 40)}: ${clip(subject, 100)}`, html, text, replyTo: email };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    if (!ALLOWED_ORIGINS.includes(origin) && !LOCAL_ORIGIN.test(origin)) return new Response('Forbidden', { status: 403 });
    const headers = cors(origin);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers });

    const { pathname } = new URL(request.url);
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response('Bad request', { status: 400, headers });
    }

    let mail;
    if (pathname === '/visit') {
      mail = visitEmail(request, body);
      if (mail.bot) return new Response('{"ok":true}', { headers }); // skip crawlers/previews
    } else if (pathname === '/contact') {
      if (body.website) return new Response('{"ok":true}', { headers }); // honeypot: silently drop bots
      const { name, email, subject, message } = body;
      if (!name || !email || !subject || !message || !/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/.test(email)) {
        return new Response('{"ok":false}', { status: 422, headers });
      }
      mail = contactEmail(request, { name, email, subject, message });
    } else {
      return new Response('Not found', { status: 404, headers });
    }

    const ok = await sendEmail(env, mail);
    return new Response(JSON.stringify({ ok }), {
      status: ok ? 200 : 502,
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  },
};
