import requests
import json

ACCESS_TOKEN = "EAAWm0gqsuckBSCRuExebIIFElm53F7ItZBKo9Q0u0WnN8ZBZCjgazobPZBaLDUGivbXcptTT9urGE6Lg55h6D9aB1HDfFT4ZCwmLxLde4U8wAKl6csupanuqwun9QBb6PZB6u6YfPFuo0ZCEaznCK7ltMjhlzENs8Q8Yu1GC7eewWv9jAY9PFAqB1IongtgwIoVLQZDZD"

# Try different IDs from the URL
IDS_TO_TRY = [
    "1634178838276151",  # business_id from URL
    "1014658487838546",  # asset_id from URL
    "1009816581971683",  # WABA ID we've been using
]

print("=" * 70)
print("TRYING DIFFERENT IDs TO FIND TEMPLATES")
print("=" * 70)

for id_value in IDS_TO_TRY:
    print(f"\n--- Trying ID: {id_value} ---")
    
    # Try as WABA
    url = f"https://graph.facebook.com/v18.0/{id_value}/message_templates"
    headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
    
    try:
        response = requests.get(url, headers=headers)
        data = response.json()
        
        if "data" in data:
            templates = data["data"]
            print(f"✅ Found {len(templates)} templates!")
            for t in templates[:3]:  # Show first 3
                print(f"   - {t.get('name')}: {t.get('status')}")
        else:
            print(f"❌ Error: {data.get('error', {}).get('message', 'Unknown')}")
    except Exception as e:
        print(f"❌ Exception: {e}")

# Also try to get WABA list from business
print("\n\n--- Getting WABA from Business ---")
url = f"https://graph.facebook.com/v18.0/1634178838276151/owned_whatsapp_business_accounts"
headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}

try:
    response = requests.get(url, headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
