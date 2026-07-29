"""
WhatsApp API - Find Correct WABA ID
"""

import requests

ACCESS_TOKEN = "EAAWm0gqsuckBSCRuExebIIFElm53F7ItZBKo9Q0u0WnN8ZBZCjgazobPZBaLDUGivbXcptTT9urGE6Lg55h6D9aB1HDfFT4ZCwmLxLde4U8wAKl6csupanuqwun9QBb6PZB6u6YfPFuo0ZCEaznCK7ltMjhlzENs8Q8Yu1GC7eewWv9jAY9PFAqB1IongtgwIoVLQZDZD"
API_BASE_URL = "https://graph.facebook.com/v18.0"

def get_businesses():
    """Get businesses"""
    url = f"{API_BASE_URL}/me/accounts"
    
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}"
    }
    
    print("Fetching businesses...")
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None


def get_waba_from_business(business_id):
    """Get WhatsApp Business Accounts from business"""
    url = f"{API_BASE_URL}/{business_id}/owned_whatsapp_business_accounts"
    
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}"
    }
    
    print(f"\nFetching WABA for business {business_id}...")
    
    try:
        response = requests.get(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.json()
    except Exception as e:
        print(f"Error: {e}")
        return None


def try_direct_waba():
    """Try to use the business ID directly as WABA ID"""
    # The URL has business_id=1634178838276151
    # Let's try different formats
    
    business_id = "1634178838276151"
    
    # Try 1: Direct use
    url = f"{API_BASE_URL}/{business_id}/message_templates"
    headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
    
    print(f"\nTrying direct use of business ID: {business_id}")
    response = requests.get(url, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.json()}")
    
    # Try 2: Try as string with different format
    # Sometimes WABA IDs are different from business IDs
    # Let's try to find the WABA by listing all accounts
    
    return response.json()


if __name__ == "__main__":
    print("="*60)
    print("Finding Correct WhatsApp Business Account ID")
    print("="*60)
    
    # Get businesses
    businesses = get_businesses()
    
    # Try direct WABA access
    try_direct_waba()
    
    # If we found businesses, get their WABAs
    if businesses and "data" in businesses:
        for business in businesses["data"]:
            business_id = business.get("id")
            get_waba_from_business(business_id)
