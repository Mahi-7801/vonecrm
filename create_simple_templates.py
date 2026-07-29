"""
WhatsApp Templates - Simple APPROVED Format
Creating simple templates without parameters first
"""

import requests
import json
from datetime import datetime

WABA_ID = "1014658487838546"
ACCESS_TOKEN = "EAAWm0gqsuckBSCRuExebIIFElm53F7ItZBKo9Q0u0WnN8ZBZCjgazobPZBaLDUGivbXcptTT9urGE6Lg55h6D9aB1HDfFT4ZCwmLxLde4U8wAKl6csupanuqwun9QBb6PZB6u6YfPFuo0ZCEaznCK7ltMjhlzENs8Q8Yu1GC7eewWv9jAY9PFAqB1IongtgwIoVLQZDZD"
API_BASE_URL = "https://graph.facebook.com/v18.0"

# Simple templates without parameters - matching hello_world format
SIMPLE_TEMPLATES = [
    {
        "name": "mahi_account_created",
        "language": "en_US",
        "category": "UTILITY",
        "components": [
            {
                "type": "HEADER",
                "format": "TEXT",
                "text": "Account Created"
            },
            {
                "type": "BODY",
                "text": "Welcome to Mahi CRM! Your account has been created successfully. This message confirms your ability to receive WhatsApp notifications from our platform. Thank you for choosing Mahi CRM."
            },
            {
                "type": "FOOTER",
                "text": "Mahi CRM Support Team"
            }
        ]
    },
    {
        "name": "mahi_order_received",
        "language": "en_US",
        "category": "UTILITY",
        "components": [
            {
                "type": "HEADER",
                "format": "TEXT",
                "text": "Order Received"
            },
            {
                "type": "BODY",
                "text": "Thank you for your order! We have received your order and it is now being processed. You will receive a confirmation email shortly with your order details and tracking information."
            },
            {
                "type": "FOOTER",
                "text": "Thank you for shopping with us!"
            }
        ]
    },
    {
        "name": "mahi_support_received",
        "language": "en_US",
        "category": "UTILITY",
        "components": [
            {
                "type": "HEADER",
                "format": "TEXT",
                "text": "Support Request Received"
            },
            {
                "type": "BODY",
                "text": "We have received your support request. Our team will review your inquiry and respond within 24 hours. Thank you for contacting Mahi CRM support."
            },
            {
                "type": "FOOTER",
                "text": "Mahi CRM Support"
            }
        ]
    },
]


def create_template(template_data):
    """Create a template"""
    url = f"{API_BASE_URL}/{WABA_ID}/message_templates"
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    print(f"\nCreating: {template_data['name']}")
    
    try:
        response = requests.post(url, json=template_data, headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            print(f"  ✅ Created! ID: {result.get('id')} | Status: {result.get('status')}")
            return {"success": True, "id": result.get("id"), "status": result.get("status")}
        else:
            error = response.json().get("error", {})
            print(f"  ❌ Failed: {error.get('message')}")
            return {"success": False, "error": error.get("message")}
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return {"success": False, "error": str(e)}


def get_templates():
    """Get all templates"""
    url = f"{API_BASE_URL}/{WABA_ID}/message_templates"
    headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
    
    response = requests.get(url, headers=headers)
    
    if response.status_code == 200:
        return response.json().get("data", [])
    return []


if __name__ == "__main__":
    print("=" * 70)
    print("CREATING SIMPLE TEMPLATES (NO PARAMETERS)")
    print("=" * 70)
    print(f"WABA: {WABA_ID} (vonedigital)")
    print("=" * 70)
    
    # Create templates
    results = []
    for template in SIMPLE_TEMPLATES:
        result = create_template(template)
        results.append(result)
    
    # Get all templates
    print("\n\n" + "=" * 70)
    print("ALL TEMPLATES ON YOUR DASHBOARD")
    print("=" * 70)
    
    templates = get_templates()
    
    print(f"\n{'Name':<30} {'Category':<12} {'Status':<15}")
    print("-" * 57)
    
    for t in templates:
        print(f"{t.get('name', 'N/A'):<30} {t.get('category', 'N/A'):<12} {t.get('status', 'N/A'):<15}")
    
    print("-" * 57)
    print(f"Total: {len(templates)} templates")
    
    # Summary
    successful = sum(1 for r in results if r.get("success"))
    approved = sum(1 for r in results if r.get("status") == "APPROVED")
    pending = sum(1 for r in results if r.get("status") == "PENDING")
    
    print(f"\n✅ Created: {successful}/{len(results)}")
    print(f"   - Approved: {approved}")
    print(f"   - Pending: {pending}")
    
    print(f"\n📋 Check your Meta Dashboard:")
    print(f"   https://business.facebook.com/latest/whatsapp_manager/message_templates/?business_id=1634178838276151")
