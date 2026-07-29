"""
WhatsApp API - Alternative Approaches
Trying different methods to find the correct WABA ID
"""

import requests

ACCESS_TOKEN = "EAAWm0gqsuckBSCRuExebIIFElm53F7ItZBKo9Q0u0WnN8ZBZCjgazobPZBaLDUGivbXcptTT9urGE6Lg55h6D9aB1HDfFT4ZCwmLxLde4U8wAKl6csupanuqwun9QBb6PZB6u6YfPFuo0ZCEaznCK7ltMjhlzENs8Q8Yu1GC7eewWv9jAY9PFAqB1IongtgwIoVLQZDZD"

# Try different API versions
API_VERSIONS = ["v18.0", "v17.0", "v16.0", "v15.0"]

def try_api_versions():
    """Try different API versions"""
    business_id = "1634178838276151"
    
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    for version in API_VERSIONS:
        url = f"https://graph.facebook.com/{version}/{business_id}/message_templates"
        
        print(f"\nTrying API version: {version}")
        print(f"URL: {url}")
        
        try:
            response = requests.get(url, headers=headers)
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.json()}")
            
            if response.status_code == 200:
                return version, response.json()
        except Exception as e:
            print(f"Error: {e}")
    
    return None, None


def try_waba_endpoints():
    """Try different WABA endpoints"""
    business_id = "1634178838276151"
    
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    endpoints = [
        f"{business_id}/message_templates",
        f"{business_id}/templates",
        f"{business_id}/whatsapp_templates",
        f"whatsapp_business_accounts/{business_id}/message_templates",
    ]
    
    for endpoint in endpoints:
        url = f"https://graph.facebook.com/v18.0/{endpoint}"
        
        print(f"\nTrying endpoint: {endpoint}")
        
        try:
            response = requests.get(url, headers=headers)
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.json()}")
            
            if response.status_code == 200:
                return endpoint, response.json()
        except Exception as e:
            print(f"Error: {e}")
    
    return None, None


def create_template_v15():
    """Try creating template with API v15"""
    business_id = "1634178838276151"
    
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    
    url = f"https://graph.facebook.com/v15.0/{business_id}/message_templates"
    
    template_data = {
        "name": "test_template_v15",
        "language": "en",
        "category": "UTILITY",
        "components": [
            {
                "type": "BODY",
                "text": "Test message {{1}}",
                "parameters": [
                    {"type": "text", "text": "name"}
                ]
            }
        ]
    }
    
    print(f"\nTrying to create template with v15 API...")
    
    try:
        response = requests.post(url, json=template_data, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None


def get_phone_numbers():
    """Try to get phone numbers which might give us the WABA ID"""
    business_id = "1634178838276151"
    
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}"
    }
    
    url = f"https://graph.facebook.com/v18.0/{business_id}/phone_numbers"
    
    print(f"\nTrying to get phone numbers...")
    
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
    print("Trying Alternative Approaches")
    print("="*60)
    
    # Try different API versions
    version, result = try_api_versions()
    
    # Try different endpoints
    endpoint, result = try_waba_endpoints()
    
    # Try to get phone numbers
    get_phone_numbers()
    
    # Try to create template with v15
    create_template_v15()
