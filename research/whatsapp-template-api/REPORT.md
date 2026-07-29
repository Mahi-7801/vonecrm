# WhatsApp Business API - Message Template Endpoints

## Overview
The WhatsApp Business API provides REST endpoints for managing message templates. These templates must be pre-approved by WhatsApp before they can be sent to users.

## Base URL
```
https://graph.facebook.com/v18.0/
```

## Authentication
All endpoints require a valid access token passed as a query parameter or in the Authorization header:
```
Authorization: Bearer {access-token}
```

---

## 1. Create Message Template

### Endpoint
```
POST /{business-id}/message_templates
```

### Request Body
```json
{
  "name": "order_confirmation",
  "language": "en_US",
  "category": "MARKETING",
  "components": [
    {
      "type": "HEADER",
      "format": "TEXT",
      "text": "Your order {{1}} has been confirmed!"
    },
    {
      "type": "BODY",
      "text": "Hi {{1}}, your order #{{2}} for {{3}} has been confirmed. Total: {{4}}. We'll notify you when it ships.",
      "parameters": [
        {
          "type": "text",
          "text": "customer_name"
        },
        {
          "type": "text",
          "text": "order_number"
        },
        {
          "type": "text",
          "text": "product_name"
        },
        {
          "type": "text",
          "text": "total_amount"
        }
      ]
    },
    {
      "type": "FOOTER",
      "text": "Thank you for your purchase!"
    },
    {
      "type": "BUTTONS",
      "buttons": [
        {
          "type": "QUICK_REPLY",
          "text": "View Order"
        },
        {
          "type": "URL",
          "text": "Track Shipment",
          "url": "https://example.com/track/{{1}}"
        }
      ]
    }
  ]
}
```

### Response
```json
{
  "id": "1234567890",
  "status": "PENDING",
  "category": "MARKETING"
}
```

---

## 2. Get Message Template by ID

### Endpoint
```
GET /{template-id}
```

### Response
```json
{
  "id": "1234567890",
  "name": "order_confirmation",
  "language": "en_US",
  "status": "APPROVED",
  "category": "MARKETING",
  "components": [...],
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

---

## 3. Get All Message Templates

### Endpoint
```
GET /{business-id}/message_templates
```

### Query Parameters
| Parameter | Type | Description |
|-----------|------|-------------|
| limit | integer | Number of results (default: 100, max: 1000) |
| offset | integer | Pagination offset |
| status | string | Filter by status: PENDING, APPROVED, REJECTED, PAUSED |
| category | string | Filter by category: AUTHENTICATION, MARKETING, UTILITY |
| language | string | Filter by language code |

### Response
```json
{
  "data": [
    {
      "id": "1234567890",
      "name": "order_confirmation",
      "status": "APPROVED",
      "category": "MARKETING",
      "language": "en_US"
    }
  ],
  "paging": {
    "cursor": {
      "before": "...",
      "after": "..."
    }
  }
}
```

---

## 4. Delete Message Template

### Endpoint
```
DELETE /{template-id}
```

### Response
```json
{
  "success": true
}
```

---

## 5. Get Template Category

### Endpoint
```
GET /{business-id}/message_template_categories
```

### Response
```json
{
  "data": [
    {
      "id": "1",
      "name": "MARKETING",
      "description": "Promotional messages"
    },
    {
      "id": "2",
      "name": "UTILITY",
      "description": "Transaction-related messages"
    },
    {
      "id": "3",
      "name": "AUTHENTICATION",
      "description": "One-time passcodes"
    }
  ]
}
```

---

## 6. Get Template Quality Rating

### Endpoint
```
GET /{business-id}/message_template_quality
```

### Response
```json
{
  "quality_ratings": [
    {
      "template_id": "1234567890",
      "template_name": "order_confirmation",
      "quality_score": "GREEN",
      "reason": ""
    }
  ]
}
```

---

## Template Categories

| Category | Description | Use Case |
|----------|-------------|----------|
| AUTHENTICATION | One-time passwords | Login verification, 2FA |
| MARKETING | Promotional content | Sales, offers, newsletters |
| UTILITY | Transaction updates | Order confirmations, shipping updates |

---

## Template Components

### Header
- **TEXT**: Plain text with variables
- **IMAGE**: Image with optional caption
- **VIDEO**: Video with optional caption
- **DOCUMENT**: Document with optional filename

### Body
- Text content with {{1}}, {{2}}, etc. placeholders
- Parameters array defining each variable

### Footer
- Optional text (max 60 characters)

### Buttons
- **QUICK_REPLY**: Quick response buttons
- **URL**: Call-to-action with dynamic URL
- **PHONE_NUMBER**: Call phone number button

---

## Template Status Flow

```
PENDING → APPROVED (or) REJECTED
APPROVED → PAUSED (if quality drops)
PAUSED → APPROVED (after quality improves)
REJECTED → Can recreate with new name
```

---

## Rate Limits

| Endpoint | Rate Limit |
|----------|------------|
| Create template | 100 requests per minute |
| Get templates | 500 requests per minute |
| Delete template | 100 requests per minute |

---

## Webhook Events

Subscribe to receive template status changes:
```json
{
  "object": "whatsapp_business_account",
  "entry": [
    {
      "changes": [
        {
          "field": "message_templates",
          "value": {
            "template_id": "1234567890",
            "template_name": "order_confirmation",
            "status": "APPROVED",
            "language": "en_US"
          }
        }
      ]
    }
  ]
}
```

---

## Example cURL Commands

### Create Template
```bash
curl -X POST "https://graph.facebook.com/v18.0/{business-id}/message_templates" \
  -H "Authorization: Bearer {access-token}" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "order_confirmation",
    "language": "en_US",
    "category": "UTILITY",
    "components": [...]
  }'
```

### Get Templates
```bash
curl -X GET "https://graph.facebook.com/v18.0/{business-id}/message_templates?status=APPROVED" \
  -H "Authorization: Bearer {access-token}"
```

### Delete Template
```bash
curl -X DELETE "https://graph.facebook.com/v18.0/{template-id}" \
  -H "Authorization: Bearer {access-token}"
```

---

## Error Codes

| Error Code | Description |
|------------|-------------|
| 368 | Rate limit exceeded |
| 100 | Invalid parameter |
| 190 | Invalid access token |
| 200 | Permission denied |
| 368 | Too many calls |

---

## Best Practices

1. **Use descriptive template names** - Clear naming helps management
2. **Test with PENDING templates** - Validate before sending to users
3. **Monitor quality scores** - Keep templates GREEN to avoid pausing
4. **Use variables wisely** - Keep templates flexible with parameters
5. **Follow content policies** - Avoid spam, misleading content

---

## References

- [WhatsApp Business Management API](https://developers.facebook.com/docs/whatsapp/business-management-api/)
- [Message Templates](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates/)
- [Cloud API](https://developers.facebook.com/docs/whatsapp/cloud-api)