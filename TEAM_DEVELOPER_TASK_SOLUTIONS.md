# 🛠️ V ONE CRM - DEVELOPER TASK TICKETS & STEP-BY-STEP CODE SOLUTIONS

> **Document Purpose:** Engineering task specification document to assign directly to team members (Backend, Frontend, DB, DevOps).  
> **Generated Word File:** `V_ONE_CRM_Developer_Task_Tickets_And_Solutions.docx`

---

## 📋 TEAM TASK DASHBOARD

| Ticket ID | Assigned Role | Priority | Title | Target File(s) |
| :--- | :--- | :--- | :--- | :--- |
| **TICKET-01** | Backend Developer | 🔴 CRITICAL | Refactor Bulk Send to Async Queue | `server/routes/broadcast.js` |
| **TICKET-02** | Backend / Fullstack | 🟠 HIGH | Fix Hardcoded 'Value 3' Parameter Bug | `server/routes/broadcast.js`, `server.js` |
| **TICKET-03** | Fullstack / DB Dev | 🟠 HIGH | Fix DB Status ENUM Mismatch | `broadcast.js`, `server.js`, PHP Command |
| **TICKET-04** | Backend Developer | 🟡 MEDIUM | Dynamic Template Language Matching | `server/routes/broadcast.js` |
| **TICKET-05** | Backend Developer | 🟠 HIGH | Pre-calculate Cost & Reserve Balance | `server/routes/broadcast.js` |
| **TICKET-06** | Database Developer | 🔵 LOW | Chunked Bulk SQL Message Inserts | `server/routes/broadcast.js` |
| **TICKET-07** | Frontend Developer | 🟡 MEDIUM | Live Broadcast Progress Bar & Polling | `client/src/pages/Broadcast.js` |
| **TICKET-08** | DevOps / System Admin| ℹ️ INFO | Complete Meta App Review & Verification| Meta Developer Portal |

---

## 🎫 DETAILED DEVELOPER TICKETS & CODE SOLUTIONS

### 🎫 TICKET-01: Refactor Bulk Send to Async Background Queue
* **Assigned Role:** Backend Developer
* **Priority:** 🔴 CRITICAL
* **Target File:** `server/routes/broadcast.js` (Lines 232–374)
* **Problem:** Sending loop runs synchronously in HTTP handler. 1,000 contacts = 3 minutes execution, causing HTTP 504 Timeout error.
* **Code Solution:**
```javascript
// server/routes/broadcast.js - Refactored POST /send
router.post('/send', authMiddleware, async (req, res) => {
  try {
    const { template_id, template_name, contact_ids, tag_filter } = req.body;
    let contacts = await getContactsForBroadcast(req.user.id, contact_ids, tag_filter);
    if (contacts.length === 0) return res.status(400).json({ error: 'No contacts found' });

    // Pre-calculate cost
    const estimatedCost = contacts.length * 0.90;
    const [userRows] = await pool.query('SELECT balance, credit_mode FROM users WHERE id = ?', [req.user.id]);
    if (userRows[0]?.credit_mode === 'prepaid' && parseFloat(userRows[0]?.balance || 0) < estimatedCost) {
      return res.status(402).json({ error: `Insufficient wallet balance. Cost: ₹${estimatedCost}, Balance: ₹${userRows[0].balance}` });
    }

    // Create job record
    const [jobResult] = await pool.query(
      'INSERT INTO broadcast_jobs (owner_id, template_name, total_contacts, status) VALUES (?, ?, ?, ?)',
      [req.user.id, template_name || 'Template', contacts.length, 'processing']
    );

    // Return immediate 202 response to prevent HTTP timeout
    res.status(202).json({
      message: 'Broadcast job started in background',
      job_id: jobResult.insertId,
      total_contacts: contacts.length,
      status: 'processing'
    });

    // Background sending
    setImmediate(async () => {
      let sent = 0, failed = 0;
      for (const contact of contacts) {
        try {
          await sendSingleWhatsAppTemplate(req.user.id, contact, template_name, template_id);
          sent++;
        } catch (err) { failed++; }
        await new Promise(r => setTimeout(r, 20));
      }
      await pool.query('UPDATE broadcast_jobs SET status = "completed", sent_count = ?, failed_count = ? WHERE id = ?',
        [sent, failed, jobResult.insertId]);
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

---

### 🎫 TICKET-02: Fix Hardcoded Parameter 'Value 3' Substitution Bug
* **Assigned Role:** Backend / Fullstack Developer
* **Priority:** 🟠 HIGH
* **Target Files:** `server/routes/broadcast.js`, `server/server.js`
* **Problem:** Parameter index >= 2 is hardcoded to output `"Value 3"`, `"Value 4"`.
* **Code Solution:**
```javascript
const buildTemplateParameters = (templateParams, contact, customParamValues = {}) => {
  if (!templateParams || templateParams.length === 0) return [];

  return templateParams.map((param, index) => {
    const paramKey = `var_${index + 1}`;
    let value = '';

    if (customParamValues[paramKey]) {
      value = customParamValues[paramKey];
    } else if (index === 0 && contact.name) {
      value = contact.name;
    } else if (index === 1 && contact.phone) {
      value = contact.phone;
    } else if (contact.company && index === 2) {
      value = contact.company;
    } else {
      value = contact.name || 'Customer';
    }

    return { type: 'text', text: String(value) };
  });
};
```

---

### 🎫 TICKET-03: Fix DB Status ENUM Mismatch ('pending' vs 'scheduled')
* **Assigned Role:** Fullstack / Database Developer
* **Priority:** 🟠 HIGH
* **Target Files:** `broadcast.js`, `server.js`, `ProcessScheduledBroadcasts.php`
* **Problem:** Node.js scheduler checks `status = 'pending'`, PHP checks `status = 'scheduled'`.
* **Code Solution:**
```sql
-- Database Migration
ALTER TABLE scheduled_broadcasts 
MODIFY COLUMN status ENUM('pending', 'processing', 'sent', 'cancelled') DEFAULT 'pending';
```
```javascript
// Node.js server.js
const [due] = await pool.query("SELECT * FROM scheduled_broadcasts WHERE status = 'pending' AND scheduled_at <= NOW()");
```
```php
// PHP ProcessScheduledBroadcasts.php
$broadcasts = ScheduledBroadcast::where('status', 'pending')->where('scheduled_at', '<=', $now)->get();
```

---

### 🎫 TICKET-04: Dynamic Template Language Code Extraction
* **Assigned Role:** Backend Developer
* **Priority:** 🟡 MEDIUM
* **Target File:** `server/routes/broadcast.js`
* **Code Solution:**
```javascript
if (foundMetaTemplate && foundMetaTemplate.language) {
  templateLanguageCode = foundMetaTemplate.language;
} else if (localTemplate && localTemplate.language) {
  templateLanguageCode = localTemplate.language;
} else {
  templateLanguageCode = 'en';
}
```

---

### 🎫 TICKET-05: Pre-calculate Cost & Reserve Wallet Balance
* **Assigned Role:** Backend Developer
* **Priority:** 🟠 HIGH
* **Target File:** `server/routes/broadcast.js`
* **Code Solution:**
```javascript
const totalCampaignCost = contacts.length * 0.90;
const [userRows] = await pool.query('SELECT balance, credit_mode FROM users WHERE id = ?', [req.user.id]);
const userBalance = parseFloat(userRows[0]?.balance || 0);

if (userRows[0]?.credit_mode === 'prepaid' && userBalance < totalCampaignCost) {
  return res.status(402).json({ error: `Insufficient wallet balance. Total cost: ₹${totalCampaignCost}, Balance: ₹${userBalance}` });
}

if (userRows[0]?.credit_mode === 'prepaid') {
  await pool.query('UPDATE users SET balance = balance - ? WHERE id = ?', [totalCampaignCost, req.user.id]);
}
```

---

### 🎫 TICKET-06: Optimize DB Bulk Message Logging with Chunked Inserts
* **Assigned Role:** Database Developer
* **Priority:** 🔵 LOW
* **Target File:** `server/routes/broadcast.js`
* **Code Solution:**
```javascript
const chunkArray = (arr, size) => Array.from({ length: Math.ceil(arr.length / size) }, (v, i) => arr.slice(i * size, i * size + size));

const messageBatches = chunkArray(messageLogRecords, 100);
for (const batch of messageBatches) {
  const values = batch.map(r => [r.owner_id, r.contact_id, 'outbound', r.body, r.template_id, r.wa_message_id, r.status]);
  await pool.query('INSERT INTO messages (owner_id, contact_id, direction, body, template_id, wa_message_id, status) VALUES ?', [values]);
}
```

---

### 🎫 TICKET-07: Add Live Broadcast Progress Bar & Polling in UI
* **Assigned Role:** Frontend Developer
* **Priority:** 🟡 MEDIUM
* **Target File:** `client/src/pages/Broadcast.js`
* **Code Solution:**
```javascript
const handleSend = async () => {
  setSending(true);
  try {
    const res = await api.post('/broadcast/send', payload);
    const jobId = res.data.job_id;
    
    const interval = setInterval(async () => {
      const statusRes = await api.get(`/broadcast/job/${jobId}`);
      setResult(statusRes.data);
      if (statusRes.data.status === 'completed' || statusRes.data.status === 'failed') {
        clearInterval(interval);
        setSending(false);
      }
    }, 2000);
  } catch (err) {
    alert(err.response?.data?.error || 'Broadcast failed');
    setSending(false);
  }
};
```

---

### 🎫 TICKET-08: Complete Meta App Review & Business Verification
* **Assigned Role:** DevOps / System Admin
* **Priority:** ℹ️ INFO
* **Target Location:** Meta Developer Portal
* **Steps:**
  1. Log into Meta Developer Portal (https://developers.facebook.com).
  2. Select App -> Basic Settings -> Add Privacy Policy URL.
  3. Go to Business Manager -> Security Center -> Complete Business Verification.
  4. Submit `whatsapp_business_messaging` and `whatsapp_business_management` permissions for App Review.
