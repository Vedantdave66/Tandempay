"""
One-time script to provide test verification data for sandbox Stripe Connect accounts.
This enables the 'transfers' capability so test payments can flow through.
"""
import os
import stripe

stripe.api_key = os.environ.get("STRIPE_SECRET_KEY")

# Get all connected accounts
accounts = stripe.Account.list(limit=10)

for acct in accounts.data:
    acct_id = acct.id
    print(f"\n--- Processing: {acct.get('business_profile', {}).get('name', acct_id)} ({acct_id}) ---")
    print(f"  Status: charges_enabled={acct.charges_enabled}, payouts_enabled={acct.payouts_enabled}")
    
    try:
        # Update the account with test verification data
        stripe.Account.modify(
            acct_id,
            individual={
                "first_name": "Test",
                "last_name": "User",
                "dob": {"day": 1, "month": 1, "year": 1990},
                "address": {
                    "line1": "123 Test Street",
                    "city": "Toronto",
                    "state": "ON",
                    "postal_code": "M5V 3L9",
                    "country": "CA",
                },
                "id_number": "000000000",  # Stripe test SIN that auto-verifies
            },
            business_profile={
                "mcc": "5734",
                "url": "https://tandempay.ca",
            },
        )
        
        # Request transfers capability
        stripe.Account.modify(
            acct_id,
            capabilities={
                "transfers": {"requested": True},
            },
        )
        
        # Re-fetch to check status
        updated = stripe.Account.retrieve(acct_id)
        print(f"  Updated: charges_enabled={updated.charges_enabled}, payouts_enabled={updated.payouts_enabled}")
        print(f"  Capabilities: {dict(updated.capabilities) if updated.capabilities else 'N/A'}")
        print(f"  ✅ Done")
    except Exception as e:
        print(f"  ❌ Error: {e}")

print("\n\nAll accounts processed!")
