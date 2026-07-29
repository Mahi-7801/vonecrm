# WhatsApp Template Auto-Sync to Manager Page

## How It Works

When you create a template via the API, it automatically appears in the WhatsApp Manager page through a **webhook-based synchronization system**.

---

## 1. Template Creation Flow

```
Admin creates template via API
        ↓
Template status: PENDING
        ↓
WhatsApp reviews template (automated + manual)
        ↓
Status changes to: APPROVED / REJECTED / PAUSED
        ↓
Webhook fires → Updates Manager page
```

---

## 2. Automatic Sync Mechanism

### Webhook Configuration

To receive real-time updates, configure a webhook endpoint:

```
POST https://graph.facebook.com/v18.0/{business-id}/subscriptions
```

**Request Body:**
```json
{
  "object": "whatsapp_business_account",
  "callback_url": "https://your-server.com/webhook",
  "verify_token": "your-verify-token",
  "fields": ["message_templates", "template_status_updates"]
}
```

### Webhook Events Fired

When a template is created or status changes:

```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "id": "1634178838276151",
      "changes": [
        {
          "field": "message_templates",
          "value": {
            "template_id": "1234567890",
            "template_name": "new_template",
            "status": "PENDING",
            "language": "en_US",
            "category": "MARKETING",
            "event_type": "TEMPLATE_CREATED"
          }
        }
      ]
    }
  ]
}
```

---

## 3. Your Business Configuration

**Business ID:** 1634178838276151  
**Asset ID:** 101465848738546

### Current Templates (from screenshot):
| Template | Category | Language | Status |
|----------|----------|----------|--------|
| mahi_greeting | Marketing | English | In review |
| hello_world | Utility | English (US) | Active - Quality |

---

## 4. Manual Refresh (If Needed)

If templates don't appear automatically:

### Option 1: Browser Refresh
- Press `F5` or `Ctrl+R` to refresh the page
- The page auto-refreshes every 30 seconds by default

### Option 2: API Polling
```bash
curl -X GET "https://graph.facebook.com/v18.0/{business-id}/message_templates" \
  -H "Authorization: Bearer {access-token}"
```

### Option 3: Webhook Retry
If webhook failed, WhatsApp retries delivery for up to 24 hours.

---

## 5. Setup Guide for Webhooks

### Step 1: Create Webhook Endpoint

```python
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/webhook', methods=['POST'])
def webhook():
    data = request.json
    
    if data.get('object') == 'whatsapp_business_account':
        for entry in data.get('entry', []):
            for change in entry.get('changes', []):
                if change['field'] == 'message_templates':
                    handle_template_change(change['value'])
    
    return jsonify({'status': 'ok'})

def handle_template_change(value):
    template_id = value.get('template_id')
    template_name = value.get('template_name')
    status = value.get('status')
    
    print(f"Template '{template_name}' status: {status}")
    
    # Update your database, notify admin, etc.
    # ...

@app.route('/webhook', methods=['GET'])
def verify():
    # Webhook verification
    verify_token = request.args.get('hub.verify_token')
    challenge = request.args.get('hub.challenge')
    
    if verify_token == 'your-verify-token':
        return challenge
    return 'Forbidden', 403

if __name__ == '__main__':
    app.run(port=5000)
```

### Step 2: Register Webhook

```bash
curl -X POST "https://graph.facebook.com/v18.0/{business-id}/subscriptions" \
  -H "Authorization: Bearer {access-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "callback_url": "https://your-server.com/webhook",
    "verify_token": "your-verify-token",
    "fields": ["message_templates"]
  }'
```

### Step 3: Verify Webhook

Facebook will send a verification request to your endpoint. Respond with the challenge value.

---

## 6. Template Status Updates

| Status | Meaning | Appears in Manager |
|--------|---------|-------------------|
| PENDING | Under review | ✅ Yes |
| APPROVED | Ready to use | ✅ Yes |
| REJECTED | Not approved | ✅ Yes |
| PAUSED | Quality issues | ✅ Yes |
| IN_APPEAL | Under appeal | ✅ Yes |

---

## 7. Troubleshooting

### Templates not appearing?
1. **Check webhook logs** - Verify events are being received
2. **Verify API response** - Ensure template was created successfully
3. **Check Business Manager permissions** - User must have admin access
4. **Wait for review** - Templates take 24-48 hours for approval

### Webhook not firing?
1. **Verify endpoint is accessible** - Use webhook testing tools
2. **Check SSL certificate** - Must be valid HTTPS
3. **Review subscription status** - Ensure webhook is active
4. **Check Facebook App Dashboard** - Look for delivery failures

---

## 8. Real-Time Updates

The Manager page uses **WebSocket connections** for real-time updates:

1. Page connects to Facebook's WebSocket server
2. When template status changes, server pushes update
3. Page updates instantly without manual refresh

**To force refresh:**
- Click the "Refresh" button in the browser
- Or use keyboard shortcut: `Ctrl+Shift+R` (hard refresh)

---

## 9. Best Practices

1. **Always configure webhooks** - Don't rely on polling
2. **Handle all status changes** - PENDING, APPROVED, REJECTED, PAUSED
3. **Implement retry logic** - Webhooks may fail temporarily
4. **Log all events** - For audit trail and debugging
5. **Monitor webhook health** - Check delivery rates

---

## Summary

Templates created via API automatically appear in WhatsApp Manager through:
1. **Webhook notifications** (primary method)
2. **WebSocket real-time updates** (automatic)
3. **Manual refresh** (fallback)

No manual intervention needed - just ensure webhooks are properly configured!