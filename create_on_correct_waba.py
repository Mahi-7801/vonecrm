"""
WhatsApp Templates - CORRECT WABA ID
Creating templates on the right account: 1014658487838546 (vonedigital)
"""

import requests
import json
from datetime import datetime

# CORRECT WABA ID - This is your "vonedigital" account shown on dashboard!
WABA_ID = "1014658487838546"
ACCESS_TOKEN = "EAAWm0gqsuckBSCRuExebIIFElm53F7ItZBKo9Q0u0WnN8ZBZCjgazobPZBaLDUGivbXcptTT9urGE6Lg55h6D9aB1HDfFT4ZCwmLxLde4U8wAKl6csupanuqwun9QBb6PZB6u6YfPFuo0ZCEaznCK7ltMjhlzENs8Q8Yu1GC7eewWv9jAY9PFAqB1IongtgwIoVLQZDZD"
API_BASE_URL = "https://graph.facebook.com/v18.0"

# Templates to create
TEMPLATES = [
    {
        "name": "mahi_order_update",
        "language": "en_US",
        "category": "UTILITY",
        "components": [
            {
                "type": "HEADER",
                "format": "TEXT",
                "text": "Order Update"
            },
            {
                "type": "BODY",
                "text": "Hi {{1}}, your order #{{2}} has been confirmed! Total: {{3}}. We'll notify you when it ships."
            },
            {
                "type": "FOOTER",
                "text": "Thank you for shopping with us!"
            }
        ]
    },
    {
        "name": "mahi_shipping_alert",
        "language": "en_US",
        "category": "UTILITY",
        "components": [
            {
                "type": "BODY",
                "text": "Your order #{{1}} has been shipped! Track here: {{2}}"
            }
        ]
    },
    {
        "name": "mahi_support_ticket",
        "language": "en_US",
        "category": "UTILITY",
        "components": [
            {
                "type": "BODY",
                "text": "Your support ticket #{{1}} has been received. Our team will respond within 24 hours."
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
            return {"success": True, "id": result.get("id")}
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
    print("CREATING TEMPLATES ON CORRECT WABA: 1014658487838546 (vonedigital)")
    print("=" * 70)
    
    # Create templates
    results = []
    for template in TEMPLATES:
        result = create_template(template)
        results.append(result)
    
    # Get all templates
    print("\n\n" + "=" * 70)
    print("ALL TEMPLATES ON YOUR DASHBOARD (vonedigital)")
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
    print(f"\n✅ Created: {successful}/{len(results)}")
    print(f"\n📋 Check your Meta Dashboard NOW:")
    print(f"   https://business.facebook.com/latest/whatsapp_manager/message_templates/?business_id=1634178838276151")
