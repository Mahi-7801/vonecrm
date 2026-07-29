import requests

WABA_ID = "1009816581971683"
ACCESS_TOKEN = "EAAWm0gqsuckBSCRuExebIIFElm53F7ItZBKo9Q0u0WnN8ZBZCjgazobPZBaLDUGivbXcptTT9urGE6Lg55h6D9aB1HDfFT4ZCwmLxLde4U8wAKl6csupanuqwun9QBb6PZB6u6YfPFuo0ZCEaznCK7ltMjhlzENs8Q8Yu1GC7eewWv9jAY9PFAqB1IongtgwIoVLQZDZD"
API_BASE_URL = "https://graph.facebook.com/v18.0"

# Templates to delete (REJECTED ones we created)
TEMPLATES_TO_DELETE = [
    {"name": "mahi_order_update", "id": "27459216847033245"},
    {"name": "mahi_promo_offer", "id": "1049698697455685"},
    {"name": "mahi_order_confirmation", "id": "1354368686831460"},
    {"name": "mahi_support_ticket", "id": "1350188163919901"},
    {"name": "mahi_appointment_reminder", "id": "2098151157751512"},
]

def delete_template(template_id, template_name):
    """Delete a template"""
    url = f"{API_BASE_URL}/{template_id}"
    headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}
    
    print(f"Deleting: {template_name} (ID: {template_id})")
    
    try:
        response = requests.delete(url, headers=headers)
        if response.status_code == 200:
            print(f"  ✅ Deleted successfully")
            return True
        else:
            print(f"  ❌ Failed: {response.json()}")
            return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

if __name__ == "__main__":
    print("=" * 60)
    print("CLEANING UP REJECTED TEMPLATES")
    print("=" * 60)
    
    for template in TEMPLATES_TO_DELETE:
        delete_template(template["id"], template["name"])
    
    print("\n" + "=" * 60)
    print("DONE! Check your dashboard now.")
    print("=" * 60)
