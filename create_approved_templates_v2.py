"""
WhatsApp Templates - Creating APPROVED Templates
Analyzing why templates get rejected and fixing them
"""

import requests
import json
from datetime import datetime

WABA_ID = "1014658487838546"
ACCESS_TOKEN = "EAAWm0gqsuckBSCRuExebIIFElm53F7ItZBKo9Q0u0WnN8ZBZCjgazobPZBaLDUGivbXcptTT9urGE6Lg55h6D9aB1HDfFT4ZCwmLxLde4U8wAKl6csupanuqwun9QBb6PZB6u6YfPFuo0ZCEaznCK7ltMjhlzENs8Q8Yu1GC7eewWv9jAY9PFAqB1IongtgwIoVLQZDZD"
API_BASE_URL = "https://graph.facebook.com/v18.0"

# Templates that EXACTLY match the format of APPROVED templates
# Based on hello_world and jaspers_market templates
APPROVED_TEMPLATES = [
    {
        "name": "mahi_welcome_message",
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
                "text": "Welcome and congratulations! Your Mahi CRM account has been created successfully. This message confirms your ability to receive WhatsApp notifications from our platform. Thank you for choosing Mahi CRM for your business."
            },
            {
                "type": "FOOTER",
                "text": "Mahi CRM Support"
            }
        ]
    },
    {
        "name": "mahi_order_update",
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
                "text": "Hi {{1}},\n\nThank you for your purchase! Your order number is {{2}}.\n\nWe'll start getting your items ready to ship.\n\nEstimated delivery: {{3}}.\n\nWe will let you know when your order ships."
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
                "text": "Hi {{1}},\n\nGreat news! Your order #{{2}} has been shipped.\n\nTracking number: {{3}}\n\nYour package is on its way and should arrive soon. We'll keep you updated on the delivery status."
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
    {
        "name": "mahi_appointment_reminder",
        "language": "en_US",
        "category": "UTILITY",
        "components": [
            {
                "type": "HEADER",
                "format": "TEXT",
                "text": "Appointment Reminder"
            },
            {
                "type": "BODY",
                "text": "Hi {{1}},\n\nThis is a reminder about your upcoming appointment.\n\nDate: {{2}}\nTime: {{3}}\nLocation: {{4}}\n\nPlease reply CONFIRM to confirm your appointment or CANCEL if you need to reschedule."
            },
            {
                "type": "FOOTER",
                "text": "We look forward to seeing you!"
            },
            {
                "type": "BUTTONS",
                "buttons": [
                    {
                        "type": "QUICK_REPLY",
                        "text": "CONFIRM"
                    },
                    {
                        "type": "QUICK_REPLY",
                        "text": "CANCEL"
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


def analyze_approved_templates():
    """Analyze what makes templates get approved"""
    print("\n" + "=" * 70)
    print("ANALYZING APPROVED TEMPLATES")
    print("=" * 70)
    
    templates = get_templates()
    
    approved = [t for t in templates if t.get("status") == "APPROVED"]
    rejected = [t for t in templates if t.get("status") == "REJECTED"]
    
    print(f"\nApproved: {len(approved)}")
    print(f"Rejected: {len(rejected)}")
    
    print("\n--- APPROVED TEMPLATES ANALYSIS ---")
    for t in approved:
        print(f"\nName: {t.get('name')}")
        print(f"Category: {t.get('category')}")
        for comp in t.get("components", []):
            if comp.get("type") == "BODY":
                text = comp.get("text", "")
                print(f"Body length: {len(text)} chars")
                print(f"Has {{1}}: {'{{1}}' in text}")
                print(f"Preview: {text[:100]}...")
    
    return approved


if __name__ == "__main__":
    print("=" * 70)
    print("CREATING APPROVED FORMAT TEMPLATES")
    print("=" * 70)
    print(f"WABA: {WABA_ID} (vonedigital)")
    print("=" * 70)
    
    # First analyze approved templates
    approved = analyze_approved_templates()
    
    # Create new templates
    print("\n\n" + "=" * 70)
    print("CREATING NEW TEMPLATES")
    print("=" * 70)
    
    results = []
    for template in APPROVED_TEMPLATES:
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
    approved_count = sum(1 for r in results if r.get("status") == "APPROVED")
    pending_count = sum(1 for r in results if r.get("status") == "PENDING")
    
    print(f"\n✅ Created: {successful}/{len(results)}")
    print(f"   - Approved: {approved_count}")
    print(f"   - Pending: {pending_count}")
    
    print(f"\n📋 Check your Meta Dashboard:")
    print(f"   https://business.facebook.com/latest/whatsapp_manager/message_templates/?business_id=1634178838276151")
