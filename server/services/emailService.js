const nodemailer = require('nodemailer');

// Create transporter using credentials from .env
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_APP_PASSWORD
  }
});

/**
 * Send a payment confirmation email to the user after successful plan purchase.
 */
async function sendPaymentConfirmationEmail({ userEmail, userName, planName, amount, paymentId, expiresAt }) {
  const fromName = process.env.SMTP_FROM_NAME || 'V ONE DIGITALS';
  const fromEmail = process.env.SMTP_USERNAME;

  const expiryStr = expiresAt
    ? new Date(expiresAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'N/A';

  const displayName = userName || userEmail.split('@')[0];
  const paymentRef = paymentId || `TXN-${Date.now()}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Payment Confirmation</title>
</head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:'Segoe UI',Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 40px rgba(16,185,129,0.12);">

          <!-- Red Header Banner -->
          <tr>
            <td style="background:linear-gradient(135deg,#dc2626 0%,#991b1b 100%);padding:40px 32px;text-align:center;">
              <div style="width:64px;height:64px;background:rgba(255,255,255,0.2);border-radius:50%;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                <span style="font-size:32px;">✅</span>
              </div>
              <h1 style="color:#ffffff;font-size:24px;font-weight:800;margin:0 0 6px;letter-spacing:-0.02em;">
                Payment Confirmed!
              </h1>
              <p style="color:rgba(255,255,255,0.85);font-size:14px;margin:0;">
                Your subscription is now active and all tools are unlocked
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 32px 24px;">

              <p style="color:#374151;font-size:15px;margin:0 0 24px;">
                Hi <strong>${displayName}</strong>, 👋
              </p>
              <p style="color:#6b7280;font-size:14px;line-height:1.6;margin:0 0 28px;">
                Thank you for your payment! Your <strong>${planName}</strong> plan has been activated on 
                <strong>VONE DIGITALS CRM</strong>. You now have full access to all tools including 
                Broadcast, Flows, Templates, Contacts, Inbox, and more.
              </p>

              <!-- Receipt Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #6ee7b7;border-radius:14px;overflow:hidden;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;border-bottom:1px solid #d1fae5;">
                    <p style="color:#059669;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px;">Payment Receipt</p>
                    <p style="color:#065f46;font-size:18px;font-weight:800;margin:0;">₹${parseFloat(amount).toFixed(2)}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:16px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="color:#6b7280;font-size:13px;padding:6px 0;">Plan</td>
                        <td style="color:#111827;font-size:13px;font-weight:600;text-align:right;padding:6px 0;">${planName}</td>
                      </tr>
                      <tr>
                        <td style="color:#6b7280;font-size:13px;padding:6px 0;border-top:1px solid #d1fae5;">Amount Paid</td>
                        <td style="color:#111827;font-size:13px;font-weight:600;text-align:right;padding:6px 0;border-top:1px solid #d1fae5;">₹${parseFloat(amount).toFixed(2)}</td>
                      </tr>
                      <tr>
                        <td style="color:#6b7280;font-size:13px;padding:6px 0;border-top:1px solid #d1fae5;">Valid Until</td>
                        <td style="color:#111827;font-size:13px;font-weight:600;text-align:right;padding:6px 0;border-top:1px solid #d1fae5;">${expiryStr}</td>
                      </tr>
                      <tr>
                        <td style="color:#6b7280;font-size:13px;padding:6px 0;border-top:1px solid #d1fae5;">Payment ID</td>
                        <td style="color:#111827;font-size:12px;font-weight:600;text-align:right;padding:6px 0;border-top:1px solid #d1fae5;">${paymentRef}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- What's Unlocked -->
              <p style="color:#374151;font-size:14px;font-weight:700;margin:0 0 12px;">🔓 Tools Now Unlocked:</p>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                ${[
                  ['📢','Broadcast Campaigns'],
                  ['⚡','Flow Builder Automation'],
                  ['📋','WhatsApp Templates'],
                  ['👥','Contacts Management'],
                  ['💬','Live Inbox'],
                  ['📅','Drip Sequences'],
                  ['🤖','AI Agents'],
                  ['📊','Analytics & Reports']
                ].map(([icon, label]) => `
                <tr>
                  <td style="padding:7px 0;">
                    <span style="display:inline-block;background:#ecfdf5;border-radius:8px;padding:6px 14px;color:#065f46;font-size:13px;font-weight:600;">
                      ${icon} ${label}
                    </span>
                  </td>
                </tr>`).join('')}
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding-bottom:8px;">
                    <a href="http://localhost:3000/dashboard"
                       style="display:inline-block;background:linear-gradient(135deg,#25d366,#128c7e);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:12px;font-weight:700;font-size:15px;letter-spacing:0.01em;">
                      🚀 Open Dashboard &rarr;
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 32px;text-align:center;">
              <p style="color:#9ca3af;font-size:12px;margin:0 0 4px;">
                This email was sent by <strong>${fromName}</strong>
              </p>
              <p style="color:#9ca3af;font-size:12px;margin:0;">
                If you didn't make this purchase, please contact support immediately.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
  `;

  try {
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: userEmail,
      subject: `✅ Payment Confirmed — ${planName} Plan Activated | VONE DIGITALS CRM`,
      html
    });
    console.log(`[Email] Payment confirmation sent to ${userEmail}`);
  } catch (err) {
    // Log but never crash the main payment flow
    console.error('[Email] Failed to send payment confirmation:', err.message);
  }
}

module.exports = { sendPaymentConfirmationEmail };
