"""
WhatsApp Templates - APPROVED Format
Following the exact format of your approved templates
"""

import requests
import json
from datetime import datetime

WABA_ID = "1014658487838546"
ACCESS_TOKEN = "EAAWm0gqsuckBSCRuExebIIFElm53F7ItZBKo9Q0u0WnN8ZBZCjgazobPZBaLDUGivbXcptTT9urGE6Lg55h6D9aB1HDfFT4ZCwmLxLde4U8wAKl6csupanuqwun9QBb6PZB6u6YfPFuo0ZCEaznCK7ltMjhlzENs8Q8Yu1GC7eewWv9jAY9PFAqB1IongtgwIoVLQZDZD"
API_BASE_URL = "https://graph.facebook.com/v18.0"

# Templates that follow APPROVED format (like hello_world)
APPROVED_FORMAT_TEMPLATES = [
    {
        "name": "mahi_welcome",
        "language": "en_US",
        "category": "UTILITY",
        "components": [
            {
                "type": "HEADER",
                "format": "TEXT",
                "text": "Welcome to Mahi CRM"
            },
            {
                "type": "BODY",
                "text": "Hello {{1}}, welcome to Mahi CRM! Your account has been created successfully. We're here to help you manage your business effectively. Thank you for choosing us."
            },
            {
                "type": "FOOTER",
                "text": "Mahi CRM Support Team"
            },
            {
                "type": "BUTTONS",
                "buttons": [
                    {
                        "type": "QUICK_REPLY",
                        "text": "Get Started"
                    }
                ]
            }
        ]
    },
    {
        "name": "mahi_order_confirmation",
        "language": "en_US",
        "category": "UTILITY",
        "components": [
            {
                "type": "HEADER",
                "format": "TEXT",
                "text": "Order Confirmed"
            },
            {
                "type": "BODY",
                "text": "Hi {{1}},\n\nThank you for your purchase! Your order number is {{2}}.\n\nWe'll start processing your order right away.\n\nEstimated delivery: {{3}}.\n\nWe will let you know when your order ships."
            },
            {
                "type": "FOOTER",
                "text": "Thank you for shopping with us!"
            },
            {
                "type": "BUTTONS",
                "buttons": [
                    {
                        "type": "URL",
                        "text": "View Order Details",
                        "url": "https://example.com/order/{{1}}"
                    }
                ]
            }
        ]
    },
    {
        "name": "mahi_shipping_update",
        "language": "en_US",
        "category": "UTILITY",
        "components": [
            {
                "type": "HEADER",
                "format": "TEXT",
                "text": "Shipping Update"
            },
            {
                "type": "BODY",
                "text": "Great news {{1}}! Your order #{{2}} has been shipped.\n\nTracking number: {{3}}\n\nYour package is on its way and should arrive soon."
            },
            {
                "type": "FOOTER",
                "text": "Track your package for real-time updates"
            },
            {
                "type": "BUTTONS",
                "buttons": [
                    {
                        "type": "URL",
                        "text": "Track Shipment",
                        "url": "https://example.com/track/{{1}}"
                    }
                ]
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
    print("CREATING TEMPLATES WITH APPROVED FORMAT")
    print("=" * 70)
    print(f"WABA: {WABA_ID} (vonedigital)")
    print("=" * 70)
    
    # Create templates
    results = []
    for template in APPROVED_FORMAT_TEMPLATES:
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
