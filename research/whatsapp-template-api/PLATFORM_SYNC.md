# Template Sync Flow: Your Platform → Meta Dashboard

## Overview

This document explains how templates created on your platform automatically appear on the Meta WhatsApp Manager Dashboard.

---

## Architecture Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR PLATFORM                            │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │  Admin Panel  │───▶│  Template    │───▶│  WhatsApp    │      │
│  │  (Create)     │    │  Service     │    │  API Client  │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    META WHATSAPP API                            │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  POST /{business-id}/message_templates               │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                  META DASHBOARD (WhatsApp Manager)              │
│  ┌──────────────────────────────────────────────────────┐      │
│  │  Message Templates Page                              │      │
│  │  - mahi_greeting (In review)                         │      │
│  │  - hello_world (Active)                              │      │
│  │  - [NEW TEMPLATE] (Pending) ◄── AUTO APPEARS HERE    │      │
│  └──────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step-by-Step Implementation

### Step 1: Admin Creates Template on Your Platform

**Your Platform's Admin Panel:**
```
┌─────────────────────────────────────────┐
│  Create New WhatsApp Template           │
├─────────────────────────────────────────┤
│  Template Name: [order_confirmation]    │
│  Category: [Marketing ▼]               │
│  Language: [English ▼]                 │
│                                         │
│  Header: [Your order {{1}} is ready!]   │
│  Body: [Hi {{1}}, your order...]       │
│  Footer: [Thank you for shopping!]     │
│                                         │
│  [Create Template]                     │
└─────────────────────────────────────────┘
```

### Step 2: Your Backend Calls WhatsApp API

```python
# your_platform/template_service.py

import requests

class WhatsAppTemplateService:
    def __init__(self, business_id, access_token):
        self.business_id = business_id
        self.access_token = access_token
        self.base_url = "https://graph.facebook.com/v18.0"
    
    def create_template(self, template_data):
        """
        Create template via WhatsApp API
        This automatically syncs to Meta Dashboard
        """
        url = f"{self.base_url}/{self.business_id}/message_templates"
        
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "name": template_data["name"],
            "language": template_data["language"],
            "category": template_data["category"],
            "components": self._build_components(template_data)
        }
        
        response = requests.post(url, json=payload, headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            # Template created - will appear on Meta Dashboard
            return {
                "success": True,
                "template_id": result["id"],
                "status": "PENDING"
            }
        else:
            return {
                "success": False,
                "error": response.json().get("error", {})
            }
    
    def _build_components(self, data):
        components = []
        
        # Header
        if data.get("header"):
            components.append({
                "type": "HEADER",
                "format": "TEXT",
                "text": data["header"]
            })
        
        # Body with parameters
        body_text = data.get("body", "")
        parameters = []
        
        # Extract {{1}}, {{2}}, etc.
        import re
        params = re.findall(r'\{\{(\d+)\}\}', body_text)
        for param in params:
            parameters.append({
                "type": "text",
                "text": f"param_{param}"
            })
        
        components.append({
            "type": "BODY",
            "text": body_text,
            "parameters": parameters
        })
        
        # Footer
        if data.get("footer"):
            components.append({
                "type": "FOOTER",
                "text": data["footer"]
            })
        
        return components
```

### Step 3: Template Appears on Meta Dashboard

After API call succeeds:
1. **Immediate**: Template shows as "PENDING" on Meta Dashboard
2. **24-48 hours**: WhatsApp reviews template
3. **After review**: Status changes to APPROVED/REJECTED

---

## Complete Integration Code

### Backend API Endpoint

```python
# your_platform/api/templates.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import requests

router = APIRouter()

class TemplateCreateRequest(BaseModel):
    name: str
    language: str = "en_US"
    category: str = "MARKETING"
    header: Optional[str] = None
    body: str
    footer: Optional[str] = None

class TemplateResponse(BaseModel):
    success: bool
    template_id: Optional[str] = None
    status: Optional[str] = None
    error: Optional[str] = None

@router.post("/api/templates", response_model=TemplateResponse)
async def create_template(request: TemplateCreateRequest):
    """
    Create WhatsApp template from admin panel.
    Template will automatically appear on Meta Dashboard.
    """
    
    # Your WhatsApp API credentials
    BUSINESS_ID = "1634178838276151"
    ACCESS_TOKEN = "your-access-token-here"
    
    # Build API request
    url = f"https://graph.facebook.com/v18.0/{BUSINESS_ID}/message_templates"
    
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # Build components
    components = []
    
    if request.header:
        components.append({
            "type": "HEADER",
            "format": "TEXT",
            "text": request.header
        })
    
    # Extract parameters from body
    import re
    params = re.findall(r'\{\{(\d+)\}\}', request.body)
    parameters = [{"type": "text", "text": f"param_{p}"} for p in params]
    
    components.append({
        "type": "BODY",
        "text": request.body,
        "parameters": parameters
    })
    
    if request.footer:
        components.append({
            "type": "FOOTER",
            "text": request.footer
        })
    
    payload = {
        "name": request.name,
        "language": request.language,
        "category": request.category,
        "components": components
    }
    
    # Call WhatsApp API
    response = requests.post(url, json=payload, headers=headers)
    
    if response.status_code == 200:
        result = response.json()
        return TemplateResponse(
            success=True,
            template_id=result["id"],
            status="PENDING"
        )
    else:
        error = response.json().get("error", {})
        return TemplateResponse(
            success=False,
            error=error.get("message", "Unknown error")
        )
```

### Frontend Admin Panel

```javascript
// your_platform/admin/CreateTemplate.jsx

import React, { useState } from 'react';

const CreateTemplate = () => {
  const [formData, setFormData] = useState({
    name: '',
    category: 'MARKETING',
    language: 'en_US',
    header: '',
    body: '',
    footer: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      setResult(data);
      
      if (data.success) {
        alert('Template created! Check Meta Dashboard in a few minutes.');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-template">
      <h2>Create WhatsApp Template</h2>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Template Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({...formData, name: e.target.value})}
            placeholder="e.g., order_confirmation"
            required
          />
        </div>
        
        <div className="form-group">
          <label>Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({...formData, category: e.target.value})}
          >
            <option value="MARKETING">Marketing</option>
            <option value="UTILITY">Utility</option>
            <option value="AUTHENTICATION">Authentication</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Header (optional)</label>
          <input
            type="text"
            value={formData.header}
            onChange={(e) => setFormData({...formData, header: e.target.value})}
            placeholder="Your order {{1}} is ready!"
          />
        </div>
        
        <div className="form-group">
          <label>Body</label>
          <textarea
            value={formData.body}
            onChange={(e) => setFormData({...formData, body: e.target.value})}
            placeholder="Hi {{1}}, your order #{{2}} has been confirmed."
            required
          />
        </div>
        
        <div className="form-group">
          <label>Footer (optional)</label>
          <input
            type="text"
            value={formData.footer}
            onChange={(e) => setFormData({...formData, footer: e.target.value})}
            placeholder="Thank you for your purchase!"
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Template'}
        </button>
      </form>
      
      {result && (
        <div className={`result ${result.success ? 'success' : 'error'}`}>
          {result.success ? (
            <>
              <p>✅ Template created successfully!</p>
              <p>Template ID: {result.template_id}</p>
              <p>Status: {result.status}</p>
              <p>Check Meta Dashboard → Message Templates</p>
            </>
          ) : (
            <p>❌ Error: {result.error}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default CreateTemplate;
```

---

## Your Business Details

From your Meta Dashboard screenshot:

| Field | Value |
|-------|-------|
| Business ID | 1634178838276151 |
| Asset ID | 101465848738546 |
| Account Name | vonedigital |
| Current Templates | 2 of 250 |

---

## Webhook for Status Updates

To get notified when template status changes (e.g., APPROVED):

```python
# your_platform/webhooks/whatsapp.py

from fastapi import APIRouter, Request

router = APIRouter()

@router.post("/webhook/whatsapp")
async def whatsapp_webhook(request: Request):
    data = await request.json()
    
    if data.get("object") == "whatsapp_business_account":
        for entry in data.get("entry", []):
            for change in entry.get("changes", []):
                if change["field"] == "message_templates":
                    value = change["value"]
                    
                    template_id = value.get("template_id")
                    template_name = value.get("template_name")
                    status = value.get("status")
                    
                    # Update your database
                    await update_template_status(template_id, status)
                    
                    # Notify admin if needed
                    if status == "APPROVED":
                        await notify_admin(f"Template '{template_name}' is now approved!")
    
    return {"status": "ok"}

@router.get("/webhook/whatsapp")
async def verify_webhook(request: Request):
    verify_token = request.query_params.get("hub.verify_token")
    challenge = request.query_params.get("hub.challenge")
    
    if verify_token == "your-verify-token":
        return challenge
    return {"error": "Forbidden"}
```

---

## Timeline

```
Admin clicks "Create Template" on Your Platform
        ↓
Your Backend calls WhatsApp API
        ↓
WhatsApp returns template_id (status: PENDING)
        ↓
Template appears on Meta Dashboard (within minutes)
        ↓
WhatsApp reviews template (24-48 hours)
        ↓
Status changes → APPROVED / REJECTED
        ↓
Webhook notifies Your Platform
        ↓
Admin sees status update
```

---

## Summary

| Step | Action | Result |
|------|--------|--------|
| 1 | Admin creates template on your platform | Form submitted |
| 2 | Your backend calls WhatsApp API | API request sent |
| 3 | WhatsApp processes template | Template created |
| 4 | Template appears on Meta Dashboard | ✅ Auto-synced |
| 5 | WhatsApp reviews template | 24-48 hours |
| 6 | Status updates via webhook | Real-time notification |

**The sync is automatic - no manual action needed!**