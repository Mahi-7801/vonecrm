"""
WhatsApp Template Creation Test - FINAL VERSION
Using correct WABA ID: 1009816581971683
"""

import requests
import json
from datetime import datetime

# Configuration - CORRECT IDs
WABA_ID = "1009816581971683"  # WhatsApp Business Account ID
BUSINESS_ID = "1634178838276151"  # Business Manager ID
ACCESS_TOKEN = "EAAWm0gqsuckBSCRuExebIIFElm53F7ItZBKo9Q0u0WnN8ZBZCjgazobPZBaLDUGivbXcptTT9urGE6Lg55h6D9aB1HDfFT4ZCwmLxLde4U8wAKl6csupanuqwun9QBb6PZB6u6YfPFuo0ZCEaznCK7ltMjhlzENs8Q8Yu1GC7eewWv9jAY9PFAqB1IongtgwIoVLQZDZD"
API_BASE_URL = "https://graph.facebook.com/v18.0"

# Test templates - Fixed format (no parameters in component definition)
TEST_TEMPLATES = [
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
        "name": "mahi_promo_offer",
        "language": "en_US",
        "category": "MARKETING",
        "components": [
            {
                "type": "HEADER",
                "format": "TEXT",
                "text": "Special Offer!"
            },
            {
                "type": "BODY",
                "text": "Hi {{1}}, enjoy {{2}}% off! Use code: {{3}}. Valid for 7 days only."
            },
            {
                "type": "FOOTER",
                "text": "Limited time offer!"
            }
        ]
    }
]


def create_template(template_data):
    """Create a single template via WhatsApp API"""
    url = f"{API_BASE_URL}/{WABA_ID}/message_templates"
    
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    print(f"\n{'='*60}")
    print(f"Creating template: {template_data['name']}")
    print(f"{'='*60}")
    
    try:
        response = requests.post(url, json=template_data, headers=headers)
        
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"✅ SUCCESS!")
            print(f"Template ID: {result.get('id')}")
            print(f"Status: {result.get('status', 'PENDING')}")
            print(f"\n📋 Template will appear on Meta Dashboard shortly!")
            return {
                "success": True,
                "template_id": result.get("id"),
                "name": template_data["name"]
            }
        else:
            error = response.json().get("error", {})
            print(f"❌ FAILED!")
            print(f"Error Code: {error.get('code')}")
            print(f"Error Message: {error.get('message')}")
            return {
                "success": False,
                "error": error.get("message")
            }
            
    except requests.exceptions.RequestException as e:
        print(f"❌ REQUEST ERROR: {str(e)}")
        return {"success": False, "error": str(e)}


def get_all_templates():
    """Get all templates from WhatsApp API"""
    url = f"{API_BASE_URL}/{WABA_ID}/message_templates"
    
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}"
    }
    
    print(f"\n{'='*60}")
    print("Fetching all templates...")
    print(f"{'='*60}")
    
    try:
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            templates = data.get("data", [])
            
            print(f"\n📊 Total Templates: {len(templates)}")
            print(f"\n{'Template Name':<25} {'Category':<12} {'Status':<15} {'Language':<10}")
            print("-" * 62)
            
            for template in templates:
                print(f"{template.get('name', 'N/A'):<25} "
                      f"{template.get('category', 'N/A'):<12} "
                      f"{template.get('status', 'N/A'):<15} "
                      f"{template.get('language', 'N/A'):<10}")
            
            return templates
        else:
            print(f"❌ Failed to fetch templates")
            print(f"Response: {response.json()}")
            return []
            
    except requests.exceptions.RequestException as e:
        print(f"❌ REQUEST ERROR: {str(e)}")
        return []


def run_tests():
    """Run all template creation tests"""
    print("\n" + "="*60)
    print("WHATSAPP TEMPLATE CREATION TEST - FINAL")
    print("="*60)
    print(f"WABA ID: {WABA_ID}")
    print(f"Business ID: {BUSINESS_ID}")
    print(f"Account: vonedigital")
    print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    results = []
    
    # Test 1: Create templates
    print("\n\n📝 TEST 1: Creating Templates")
    for template in TEST_TEMPLATES:
        result = create_template(template)
        results.append(result)
    
    # Test 2: Get all templates
    print("\n\n📋 TEST 2: Fetching All Templates")
    templates = get_all_templates()
    
    # Summary
    print("\n\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    successful = sum(1 for r in results if r.get("success"))
    failed = sum(1 for r in results if not r.get("success"))
    
    print(f"Total Tests: {len(results)}")
    print(f"✅ Successful: {successful}")
    print(f"❌ Failed: {failed}")
    
    if successful > 0:
        print(f"\n✅ Created Templates:")
        for r in results:
            if r.get("success"):
                print(f"   - {r.get('name')} (ID: {r.get('template_id')})")
    
    print(f"\n📋 Check Meta Dashboard to see the templates!")
    print(f"   URL: https://business.facebook.com/latest/whatsapp_manager/message_templates/?business_id={BUSINESS_ID}")
    
    return results


if __name__ == "__main__":
    results = run_tests()
