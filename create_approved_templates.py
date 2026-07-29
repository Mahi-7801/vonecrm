"""
WhatsApp API - Create APPROVED Templates
Templates that follow WhatsApp content guidelines
"""

import requests
import json
from datetime import datetime

# Configuration
WABA_ID = "1009816581971683"
ACCESS_TOKEN = "EAAWm0gqsuckBSCRuExebIIFElm53F7ItZBKo9Q0u0WnN8ZBZCjgazobPZBaLDUGivbXcptTT9urGE6Lg55h6D9aB1HDfFT4ZCwmLxLde4U8wAKl6csupanuqwun9QBb6PZB6u6YfPFuo0ZCEaznCK7ltMjhlzENs8Q8Yu1GC7eewWv9jAY9PFAqB1IongtgwIoVLQZDZD"
API_BASE_URL = "https://graph.facebook.com/v18.0"

# Better templates that follow WhatsApp guidelines
APPROVED_TEMPLATES = [
    {
        "name": "mahi_welcome_message",
        "language": "en_US",
        "category": "UTILITY",
        "components": [
            {
                "type": "BODY",
                "text": "Welcome to Mahi CRM! Your account has been created successfully. How can we help you today?"
            }
        ]
    },
    {
        "name": "mahi_order_confirmation",
        "language": "en_US",
        "category": "UTILITY",
        "components": [
            {
                "type": "BODY",
                "text": "Your order has been confirmed. Order ID: {{1}}. Thank you for your purchase!"
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
    {
        "name": "mahi_appointment_reminder",
        "language": "en_US",
        "category": "UTILITY",
        "components": [
            {
                "type": "BODY",
                "text": "Reminder: You have an appointment scheduled for {{1}}. Please reply CONFIRM to confirm."
            }
        ]
    }
]


def create_template(template_data):
    """Create a single template"""
    url = f"{API_BASE_URL}/{WABA_ID}/message_templates"
    
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    print(f"\n{'='*60}")
    print(f"Creating: {template_data['name']}")
    print(f"{'='*60}")
    
    try:
        response = requests.post(url, json=template_data, headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ Created! ID: {result.get('id')} | Status: {result.get('status')}")
            return {"success": True, "id": result.get("id"), "name": template_data["name"]}
        else:
            error = response.json().get("error", {})
            print(f"❌ Failed: {error.get('message')}")
            return {"success": False, "error": error.get("message")}
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
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
    print("="*60)
    print("CREATING WHATSAPP TEMPLATES - FOLLOWING GUIDELINES")
    print("="*60)
    print(f"WABA: {WABA_ID}")
    print(f"Account: vonedigital")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    # Create templates
    results = []
    for template in APPROVED_TEMPLATES:
        result = create_template(template)
        results.append(result)
    
    # Get all templates
    print("\n\n" + "="*60)
    print("ALL TEMPLATES ON META DASHBOARD")
    print("="*60)
    
    templates = get_templates()
    
    print(f"\n{'Name':<30} {'Category':<12} {'Status':<15}")
    print("-" * 57)
    
    for t in templates:
        print(f"{t.get('name', 'N/A'):<30} {t.get('category', 'N/A'):<12} {t.get('status', 'N/A'):<15}")
    
    # Summary
    successful = sum(1 for r in results if r.get("success"))
    print(f"\n✅ Created: {successful}/{len(results)}")
    print(f"\n📋 Check Meta Dashboard:")
    print(f"   https://business.facebook.com/latest/whatsapp_manager/message_templates/?business_id=1634178838276151")
