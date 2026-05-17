import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM    = process.env.EMAIL_FROM    || 'Camp DaddyMan <onboarding@resend.dev>';
const APP_URL = process.env.FRONTEND_URL  || 'http://localhost:3000';
const APP_NAME = 'Camp DaddyMan';

// ── Base template ─────────────────────────────────────────────────────────────

function base(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f17;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f0f17;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#1a1a2e;border-radius:16px;overflow:hidden;border:1px solid #2e2e3e;">
        <!-- Header -->
        <tr>
          <td style="background:#a78bfa;padding:24px 32px;">
            <h1 style="margin:0;color:#000;font-size:20px;font-weight:800;letter-spacing:-0.5px;">${APP_NAME}</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px 24px;border-top:1px solid #2e2e3e;">
            <p style="margin:0;color:#555;font-size:12px;text-align:center;">
              You received this email from ${APP_NAME}.<br/>
              If you didn't request this, you can safely ignore it.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#a78bfa;color:#000;font-weight:700;font-size:15px;text-decoration:none;padding:14px 32px;border-radius:10px;margin-top:8px;">${label}</a>`;
}

function h2(text: string) {
  return `<h2 style="margin:0 0 12px;color:#fff;font-size:22px;font-weight:700;">${text}</h2>`;
}

function p(text: string) {
  return `<p style="margin:0 0 20px;color:#a0a0b0;font-size:15px;line-height:1.6;">${text}</p>`;
}

// ── Email senders ─────────────────────────────────────────────────────────────

export async function sendVerificationEmail(to: string, username: string, token: string) {
  const url = `${APP_URL}/verify-email?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Verify your ${APP_NAME} email`,
    html: base('Verify your email', `
      ${h2('Confirm your email address')}
      ${p(`Hey ${username}, thanks for joining ${APP_NAME}. Click the button below to verify your email address and activate your account.`)}
      ${btn(url, 'Verify Email')}
      ${p(`<span style="font-size:13px;color:#555;">This link expires in 24 hours. If you didn't create an account, ignore this email.</span>`)}
    `),
  });
}

export async function sendPasswordResetEmail(to: string, username: string, token: string) {
  const url = `${APP_URL}/reset-password?token=${token}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Reset your ${APP_NAME} password`,
    html: base('Reset your password', `
      ${h2('Reset your password')}
      ${p(`Hey ${username}, we received a request to reset your password. Click the button below to choose a new one.`)}
      ${btn(url, 'Reset Password')}
      ${p(`<span style="font-size:13px;color:#555;">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</span>`)}
    `),
  });
}

export async function sendNewFollowerEmail(to: string, recipientUsername: string, followerUsername: string, followerDisplay: string) {
  const url = `${APP_URL}/creator/${followerUsername}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `${followerDisplay} started following you on ${APP_NAME}`,
    html: base('New follower', `
      ${h2('You have a new follower 🎉')}
      ${p(`<strong style="color:#fff;">${followerDisplay}</strong> (@${followerUsername}) started following you on ${APP_NAME}.`)}
      ${btn(url, 'View their profile')}
    `),
  });
}

export async function sendAdminEmail(to: string, username: string, subject: string, bodyHtml: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject,
    html: base(subject, `
      ${h2(subject)}
      ${p(`Hey ${username},`)}
      <div style="color:#a0a0b0;font-size:15px;line-height:1.6;margin:0 0 20px;">${bodyHtml}</div>
      ${btn(APP_URL, 'Visit Camp DaddyMan')}
    `),
  });
}

export async function sendPartnerInquiryAcknowledgement(to: string, name: string, type: string) {
  const typeLabel: Record<string, string> = {
    ADVERTISER: 'Advertiser', SPONSOR: 'Sponsor', DONOR: 'Donor', COLLABORATOR: 'Collaborator',
  };
  await resend.emails.send({
    from: FROM,
    to,
    subject: `We received your inquiry — Camp DaddyMan`,
    html: base('Inquiry received', `
      ${h2(`Hey ${name} — we got your message.`)}
      ${p(`Thanks for reaching out about a <strong style="color:#fff;">${typeLabel[type] ?? type}</strong> opportunity with Camp DaddyMan. Your inquiry is in our hands and someone from our team will be reaching out directly.`)}
      ${p(`While you wait, take a look at the platform your brand would be a part of — the music, film, podcasts, spoken word, and creators that make up the Camp DaddyMan audience.`)}
      ${btn(APP_URL + '/browse', 'Explore the Platform')}
      ${p(`<span style="font-size:13px;color:#555;">If you didn't submit this inquiry, you can safely ignore this email.</span>`)}
    `),
  });
}

export async function sendPartnerInquiryEmail(inquiry: {
  name: string;
  email: string;
  company?: string;
  type: string;
  message: string;
}) {
  const to = process.env.CONTACT_EMAIL || process.env.EMAIL_FROM || 'admin@campdaddyman.com';
  const typeLabel: Record<string, string> = {
    ADVERTISER: 'Advertiser', SPONSOR: 'Sponsor', DONOR: 'Donor', COLLABORATOR: 'Collaborator',
  };

  const rows = [
    ['Name',    inquiry.name],
    ['Email',   `<a href="mailto:${inquiry.email}" style="color:#a78bfa;">${inquiry.email}</a>`],
    ['Company', inquiry.company || '—'],
    ['Type',    typeLabel[inquiry.type] ?? inquiry.type],
  ].map(([label, val]) =>
    `<tr>
      <td style="padding:6px 0;color:#888;font-size:13px;width:90px;">${label}</td>
      <td style="padding:6px 0;color:#fff;font-size:13px;">${val}</td>
    </tr>`
  ).join('');

  await resend.emails.send({
    from: FROM,
    to,
    replyTo: inquiry.email,
    subject: `New Partner Inquiry — ${inquiry.name}${inquiry.company ? ` (${inquiry.company})` : ''}`,
    html: base('New Partner Inquiry', `
      ${h2('New Partner Inquiry')}
      <table cellpadding="0" cellspacing="0" style="margin-bottom:20px;">${rows}</table>
      <div style="background:#0f0f17;border:1px solid #2e2e3e;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 6px;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:.08em;">Message</p>
        <p style="margin:0;color:#d0d0e0;font-size:14px;line-height:1.6;">${inquiry.message.replace(/\n/g, '<br/>')}</p>
      </div>
      ${btn(`mailto:${inquiry.email}`, 'Reply to Inquiry')}
    `),
  });
}

export async function sendTwoFactorEmail(to: string, username: string, code: string, type: 'login' | 'register') {
  const action = type === 'register' ? 'complete your registration' : 'sign in';
  await resend.emails.send({
    from: FROM,
    to,
    subject: `Your Camp DaddyMan verification code: ${code}`,
    html: base('Verification code', `
      ${h2('Your verification code')}
      ${p(`Hey ${username}, enter this code to ${action}. It expires in 10 minutes.`)}
      <div style="background:#0f0f17;border:2px solid #f8c202;border-radius:14px;padding:24px;text-align:center;margin-bottom:24px;">
        <span style="font-size:42px;font-weight:900;letter-spacing:0.25em;color:#f8c202;font-family:monospace;">${code}</span>
      </div>
      ${p(`<span style="font-size:13px;color:#555;">If you didn't request this, someone may have your password — change it immediately.</span>`)}
    `),
  });
}

export async function sendNewDeviceLoginEmail(to: string, username: string, deviceLabel: string, ipAddress: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `New sign-in to your Camp DaddyMan account`,
    html: base('New sign-in detected', `
      ${h2('New device sign-in')}
      ${p(`Hey ${username}, your account was just accessed from a new device.`)}
      <div style="background:#0f0f17;border:1px solid #2e2e3e;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
        <table cellpadding="0" cellspacing="0">
          <tr><td style="color:#888;font-size:13px;padding:4px 0;width:80px;">Device</td><td style="color:#fff;font-size:13px;padding:4px 0;">${deviceLabel}</td></tr>
          <tr><td style="color:#888;font-size:13px;padding:4px 0;">IP</td><td style="color:#fff;font-size:13px;padding:4px 0;">${ipAddress}</td></tr>
        </table>
      </div>
      ${p(`If this was you, no action needed. If you don't recognize this sign-in, change your password immediately.`)}
      ${btn(`${APP_URL}/forgot-password`, 'Change Password')}
    `),
  });
}

export async function sendNewContentEmail(
  to: string,
  recipientUsername: string,
  creatorDisplay: string,
  creatorUsername: string,
  contentTitle: string,
  contentId: string,
) {
  const url = `${APP_URL}/watch/${contentId}`;
  await resend.emails.send({
    from: FROM,
    to,
    subject: `${creatorDisplay} just posted on ${APP_NAME}`,
    html: base('New content from someone you follow', `
      ${h2(`New from ${creatorDisplay}`)}
      ${p(`Hey ${recipientUsername}, <strong style="color:#fff;">${creatorDisplay}</strong> just posted something new:`)}
      <div style="background:#0f0f17;border:1px solid #2e2e3e;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;color:#fff;font-size:15px;font-weight:600;">${contentTitle}</p>
      </div>
      ${btn(url, 'Watch now')}
    `),
  });
}
