import re

def mock_fetch_invoice_details(invoice_id: str) -> dict:
    """Simulates looking up invoice and billing details in the billing system."""
    clean_id = str(invoice_id).strip()
    
    # Check if this invoice is double charged (common support request)
    is_double_charge = any(x in clean_id.lower() for x in ["double", "twice", "extra", "two", "dup"])
    
    return {
        "invoice_id": clean_id if clean_id else "INV-99999",
        "billing_date": "2026-06-28",
        "due_date": "2026-07-28",
        "base_amount": 10.00,
        "tax": 0.80,
        "total_billed": 21.60 if is_double_charge else 10.80,
        "items": [
            {"description": "Premium Support Subscription (Monthly Promotion)", "qty": 1, "price": 10.00}
        ],
        "billing_cycle": "Monthly",
        "payment_status": "Paid",
        "payment_method": "Visa ending in 4242",
        "system_notes": "Double charge detected due to connection timeout." if is_double_charge else "Normal billing cycle execution."
    }

def mock_get_tracking_status(tracking_number: str) -> dict:
    """Simulates querying the logistics/carrier database."""
    clean_tracking = str(tracking_number).strip()
    
    return {
        "tracking_number": clean_tracking if clean_tracking else "TRK-XYZ888",
        "carrier": "FedEx",
        "status": "In Transit",
        "last_update_location": "Memphis Hub, TN",
        "destination_address": "123 Maple Street, Springfield, OR 97477",
        "ship_date": "2026-07-02",
        "estimated_delivery": "2026-07-07",
        "package_weight_lbs": 3.4,
        "notes": "Delayed slightly due to weather in central region."
    }

def mock_process_refund(order_id: str) -> dict:
    """Simulates checking order status and initiating return authorization/refund check."""
    clean_order = str(order_id).strip()
    
    return {
        "order_id": clean_order if clean_order else "ORD-45678",
        "purchase_date": "2026-06-15",
        "total_order_value": 75.00,
        "items": [
            {"item_id": "SHOE-001", "name": "Classic Running Shoes", "qty": 1, "price": 75.00}
        ],
        "return_status": "Authorized",
        "refund_eligibility": "Full Refund Approved",
        "refund_amount": 75.00,
        "original_payment_method": "Mastercard ending in 9901",
        "processing_time": "3-5 business days from return receipt",
        "warehouse_notes": "Flagged as 'Arrived Damaged' by customer. Pre-paid label generated."
    }
