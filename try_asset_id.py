"""
WhatsApp API - Try with Asset ID as WABA ID
"""

import requests

ACCESS_TOKEN = "EAAWm0gqsuckBSCRuExebIIFElm53F7ItZBKo9Q0u0WnN8ZBZCjgazobPZBaLDUGivbXcptTT9urGE6Lg55h6D9aB1HDfFT4ZCwmLxLde4U8wAKl6csupanuqwun9QBb6PZB6u6YfPFuo0ZCEaznCK7ltMjhlzENs8Q8Yu1GC7eewWv9jAY9PFAqB1IongtgwIoVLQZDZD"

# From your URL: asset_id=101465848738546
ASSET_ID = "101465848738546"
BUSINESS_ID = "1634178838276151"


def test_asset_id():
    """Test if asset_id works as WABA ID"""
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # Try to get templates using asset_id
    url = f"https://graph.facebook.com/v18.0/{ASSET_ID}/message_templates"
    
    print(f"\nTrying asset_id as WABA ID: {ASSET_ID}")
    print(f"URL: {url}")
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            return True, response.json()
    except Exception as e:
        print(f"Error: {e}")
    
    return False, None


def create_template_with_asset_id():
    """Try creating template with asset_id"""
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    url = f"https://graph.facebook.com/v18.0/{ASSET_ID}/message_templates"
    
    template_data = {
        "name": "test_api_template",
        "language": "en_US",
        "category": "UTILITY",
        "components": [
            {
                "type": "BODY",
                "text": "Hello {{1}}, this is a test template from API!",
                "parameters": [
                    {"type": "text", "text": "user_name"}
                ]
            }
        ]
    }
    
    print(f"\nCreating template with asset_id...")
    
    try:
        response = requests.post(url, json=template_data, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None


def get_waba_details():
    """Get WABA details"""
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}"
    }
    
    # Try to get WABA info
    url = f"https://graph.facebook.com/v18.0/{ASSET_ID}"
    
    print(f"\nGetting WABA details for: {ASSET_ID}")
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None


if __name__ == "__main__":
    print("="*60)
    print("Testing with Asset ID as WABA ID")
    print("="*60)
    print(f"Asset ID from URL: {ASSET_ID}")
    print(f"Business ID from URL: {BUSINESS_ID}")
    
    # Get WABA details
    get_waba_details()
    
    # Test getting templates
    success, templates = test_asset_id()
    
    if success:
        print(f"\n✅ SUCCESS! Found {len(templates.get('data', []))} templates")
        
        # Try to create a template
        create_template_with_asset_id()
    else:
        print("\n❌ Asset ID didn't work either")
        print("\nYou need to find your WhatsApp Business Account (WABA) ID")
        print("It can be found in:")
        print("1. Meta Business Suite → WhatsApp → API Setup")
        print("2. Or via the WhatsApp Business Management API")
