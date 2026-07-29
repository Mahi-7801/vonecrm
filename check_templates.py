import requests

WABA_ID = "1009816581971683"
ACCESS_TOKEN = "EAAWm0gqsuckBSCRuExebIIFElm53F7ItZBKo9Q0u0WnN8ZBZCjgazobPZBaLDUGivbXcptTT9urGE6Lg55h6D9aB1HDfFT4ZCwmLxLde4U8wAKl6csupanuqwun9QBb6PZB6u6YfPFuo0ZCEaznCK7ltMjhlzENs8Q8Yu1GC7eewWv9jAY9PFAqB1IongtgwIoVLQZDZD"

url = f"https://graph.facebook.com/v18.0/{WABA_ID}/message_templates"
headers = {"Authorization": f"Bearer {ACCESS_TOKEN}"}

response = requests.get(url, headers=headers)
data = response.json()

print("ALL TEMPLATES ON YOUR ACCOUNT:")
print("=" * 70)
print(f"{'Name':<30} {'Category':<12} {'Status':<15}")
print("-" * 70)

for t in data.get("data", []):
    name = t.get("name", "N/A")
    cat = t.get("category", "N/A")
    status = t.get("status", "N/A")
    print(f"{name:<30} {cat:<12} {status:<15}")

print("-" * 70)
print(f"Total: {len(data.get('data', []))} templates")
