"""
WhatsApp API - Get WhatsApp Business Account ID
This script finds the correct WhatsApp Business Account ID for API calls
"""

import requests

ACCESS_TOKEN = "EAAWm0gqsuckBSCRuExebIIFElm53F7ItZBKo9Q0u0WnN8ZBZCjgazobPZBaLDUGivbXcptTT9urGE6Lg55h6D9aB1HDfFT4ZCwmLxLde4U8wAKl6csupanuqwun9QBb6PZB6u6YfPFuo0ZCEaznCK7ltMjhlzENs8Q8Yu1GC7eewWv9jAY9PFAqB1IongtgwIoVLQZDZD"
API_BASE_URL = "https://graph.facebook.com/v18.0"

def get_business_accounts():
    """Get all WhatsApp Business Accounts"""
    url = f"{API_BASE_URL}/me"
    
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}"
    }
    
    params = {
        "fields": "id,name,whatsapp_business_accounts{id,name,phone_numbers,account_mode}"
    }
    
    print("Fetching WhatsApp Business Accounts...")
    
    try:
        response = requests.get(url, headers=headers, params=params)
        
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            data = response.json()
            return data
        else:
            print(f"Error: {response.json()}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"Request Error: {str(e)}")
        return None


def get_waba_direct():
    """Try to get WABA directly"""
    url = f"{API_BASE_URL}/debug_token"
    
    headers = {
        "Authorization": f"Bearer {ACCESS_TOKEN}"
    }
    
    params = {
        "input_token": ACCESS_TOKEN
    }
    
    print("\nDebugging token...")
    
    try:
        response = requests.get(url, headers=headers, params=params)
        
        print(f"Status Code: {response.status_code}")
        data = response.json()
        print(f"Response: {data}")
        
        return data
            
    except requests.exceptions.RequestException as e:
        print(f"Request Error: {str(e)}")
        return None


if __name__ == "__main__":
    print("="*60)
    print("Finding WhatsApp Business Account ID")
    print("="*60)
    
    # Method 1: Get business accounts
    result = get_business_accounts()
    
    # Method 2: Debug token
    token_info = get_waba_direct()
    
    if token_info and "data" in token_info:
        scopes = token_info["data"].get("scopes", [])
        print(f"\nToken Scopes: {scopes}")
        
        granular_scopes = token_info["data"].get("granular_scopes", [])
        for scope in granular_scopes:
            print(f"Scope: {scope.get('scope')}")
            print(f"Target IDs: {scope.get('target_ids', [])}")
