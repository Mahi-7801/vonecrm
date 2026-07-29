const nodemailer = require('nodemailer');
const axios = require('axios');
const pool = require('../config/db');

// Setup Nodemailer SMTP Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USERNAME || 'kornepatimahankali35@gmail.com',
    pass: process.env.SMTP_APP_PASSWORD || 'kttq onun yugn hwlt'
  }
});

/**
 * Dispatch Email + WhatsApp Alert to a specific user
 */
async function sendUserExpiryAlert(userId, customReason = null) {
  try {
    const [users] = await pool.query(
      `SELECT u.id, u.email, u.balance, u.credit_mode,
              (SELECT phone FROM contacts WHERE owner_id = u.id ORDER BY id ASC LIMIT 1) as contact_phone,
              (SELECT display_phone_number FROM whatsapp_numbers WHERE owner_id = u.id AND verified = TRUE LIMIT 1) as wa_phone
       FROM users u WHERE u.id = ?`,
      [userId]
    );

    if (users.length === 0) return { success: false, error: 'User not found' };
    const user = users[0];
    const recipientPhone = user.wa_phone || user.contact_phone || '919581490308';
    const reasonText = customReason || 'Your VONE DIGITALS CRM subscription plan / wallet balance has expired or reached ₹0.00.';

    // 1. Send Email Alert
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || 'V ONE DIGITALS'}" <${process.env.SMTP_USERNAME || 'kornepatimahankali35@gmail.com'}>`,
      to: user.email,
      subject: '⚠️ Urgent System Alert: Your VONE DIGITALS CRM Subscription Plan Has Expired',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 24px; background: #0a0a0e; color: #ffffff;">
          <div style="max-width: 580px; margin: 0 auto; background: #121218; border-radius: 12px; padding: 32px; border: 1px solid #27272a; box-shadow: 0 4px 20px rgba(0,0,0,0.8);">
            <h2 style="color: #dc2626; margin-top: 0;">⚠️ Subscription Plan Expiry Notice</h2>
            <p>Dear Valued Customer (${user.email}),</p>
            <p><strong>${reasonText}</strong></p>
            <div style="background: #2a080c; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0; border-radius: 6px;">
              <p style="margin: 0; color: #fca5a5; font-weight: 600;">Current Wallet Balance: ₹${parseFloat(user.balance || 0).toFixed(2)}</p>
              <p style="margin: 4px 0 0; color: #f87171; font-size: 0.88rem;">To prevent your automated WhatsApp flows, bulk broadcasts, and AI agents from pausing, please recharge your wallet or upgrade your plan.</p>
            </div>
            <div style="text-align: center; margin-top: 28px;">
              <a href="http://localhost:3000/billing" style="background: #dc2626; color: #ffffff; padding: 12px 28px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">Recharge & Renew Plan Now 🚀</a>
            </div>
            <hr style="border: none; border-top: 1px solid #27272a; margin: 28px 0 16px;" />
            <p style="font-size: 0.8rem; color: #a1a1aa; margin: 0; text-align: center;">VONE DIGITALS CRM Billing & Security Team • Automated Monitoring System</p>
          </div>
        </div>
      `
    };

    let emailSent = false;
    try {
      await transporter.sendMail(mailOptions);
      emailSent = true;
      console.log(`[Expiry Alert] Email successfully sent to ${user.email}`);
    } catch (eErr) {
      console.error(`[Expiry Alert] Email error for ${user.email}:`, eErr.message);
    }

    // 2. Send WhatsApp Alert Message (using system phone ID)
    let waSent = false;
    try {
      const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || '1269197539606780';
      const token = process.env.WHATSAPP_SYSTEM_USER_TOKEN;
      const cleanPhone = recipientPhone.replace(/[\s\-+]/g, '');

      const waRes = await axios.post(
        `https://graph.facebook.com/${process.env.WHATSAPP_GRAPH_API_VERSION || 'v21.0'}/${phoneId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: cleanPhone,
          type: 'text',
          text: { body: `⚠️ Mahi CRM Alert: ${reasonText}\n\nPlease recharge your wallet or renew your plan at http://localhost:3000/billing to keep your automated WhatsApp AI bots active.` }
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (waRes.data?.messages?.[0]?.id) waSent = true;
      console.log(`[Expiry Alert] WhatsApp alert sent to ${cleanPhone}`);
    } catch (wErr) {
      console.error(`[Expiry Alert] WhatsApp notice:`, wErr.response?.data?.error?.message || wErr.message);
    }

    // 3. Create In-App Notification (used for 24-hour rate limit check)
    await pool.query(
      'INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)',
      [user.id, '⚠️ Plan Expiry Warning', reasonText, 'billing']
    );

    return { success: true, emailSent, waSent };
  } catch (err) {
    console.error('sendUserExpiryAlert error:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Minutely Automated Background Monitor Worker
 */
function startMinutelyExpiryMonitor() {
  console.log('🚀 Minutely Automated Plan Expiry & Renewal Monitor Started.');

  setInterval(async () => {
    try {
      const [expiredUsers] = await pool.query(
        `SELECT u.id, u.email, u.balance
         FROM users u
         WHERE u.role != 'admin' AND u.balance <= 0`
      );

      for (const u of expiredUsers) {
        // Strict DB check: Has an alert notification been created in the last 24 hours?
        const [recentAlerts] = await pool.query(
          `SELECT id FROM notifications
           WHERE user_id = ? AND title LIKE '%Expiry%' AND created_at >= NOW() - INTERVAL 24 HOUR`,
          [u.id]
        );

        if (recentAlerts.length > 0) {
          // Alert already sent in the last 24 hours — SKIP to prevent email spamming!
          continue;
        }

        console.log(`[Minutely Monitor] Auto-dispatching daily expiry alert to user ID ${u.id} (${u.email})...`);
        await sendUserExpiryAlert(u.id, 'Your Mahi CRM wallet balance has reached ₹0.00.');
      }
    } catch (err) {
      console.error('[Minutely Monitor] Error during scan:', err.message);
    }
  }, 60000); // Scans every 60 seconds
}

module.exports = {
  sendUserExpiryAlert,
  startMinutelyExpiryMonitor
};
