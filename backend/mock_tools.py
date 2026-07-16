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

def mock_get_tracking_status(tracking_number: str, instruction: str = "") -> dict:
    """Simulates querying the logistics/carrier database."""
    clean_tracking = str(tracking_number).strip()
    clean_instr = str(instruction).lower()
    
    status = "In Transit"
    delivery_date = None
    notes = "Delayed slightly due to weather in central region."
    
    # If the user is checking for a package delivered 3 days ago (Test Case 7)
    if "delivered" in clean_instr or "3 days" in clean_instr or "shattered" in clean_instr:
        status = "Delivered"
        delivery_date = "2026-07-04"
        notes = "Delivered to front porch. Signature waived."

    return {
        "tracking_number": clean_tracking if clean_tracking else "TRK-XYZ888",
        "carrier": "FedEx",
        "status": status,
        "last_update_location": "Memphis Hub, TN" if status == "In Transit" else "Local Facility, Destination",
        "destination_address": "123 Maple Street, Springfield, OR 97477",
        "ship_date": "2026-07-02",
        "estimated_delivery": "2026-07-07" if status == "In Transit" else "2026-07-04",
        "delivery_date": delivery_date,
        "package_weight_lbs": 3.4,
        "notes": notes
    }

def mock_process_refund(order_id: str, instruction: str = "") -> dict:
    """Simulates checking order status and initiating return authorization/refund check."""
    clean_order = str(order_id).strip()
    clean_instr = str(instruction).lower()
    
    # Default values (Scenario C / general)
    purchase_date = "2026-06-15"
    delivery_date = "2026-06-18"
    item_id = "SHOE-001"
    item_name = "Classic Running Shoes"
    return_status = "Authorized"
    refund_eligibility = "Full Refund Approved"
    warehouse_notes = "Flagged as 'Arrived Damaged' by customer. Pre-paid label generated."
    
    # Test Case 6: Footwear window edge case (12 days ago)
    if "12 days" in clean_instr or "sneakers" in clean_instr:
        purchase_date = "2026-06-23"
        delivery_date = "2026-06-25"
        item_id = "SHOE-002"
        item_name = "Casual Sneakers"
        return_status = "Pending Policy Verification"
        refund_eligibility = "Pending Policy Verification"
        warehouse_notes = "Customer requested return due to fit issues. Order delivery date was 12 days ago."
        
    # Test Case 7: Damaged Smartphone 48h limit check
    elif "smartphone" in clean_instr or "phone" in clean_instr or "screen" in clean_instr:
        purchase_date = "2026-07-01"
        delivery_date = "2026-07-04"
        item_id = "PHONE-002"
        item_name = "Premium Smartphone"
        return_status = "Pending Policy Verification"
        refund_eligibility = "Pending Policy Verification"
        warehouse_notes = "Customer reporting shattered screen. Package delivered 3 days ago (July 4, 2026)."

    return {
        "order_id": clean_order if clean_order else "ORD-45678",
        "purchase_date": purchase_date,
        "delivery_date": delivery_date,
        "total_order_value": 75.00,
        "items": [
            {"item_id": item_id, "name": item_name, "qty": 1, "price": 75.00}
        ],
        "return_status": return_status,
        "refund_eligibility": refund_eligibility,
        "refund_amount": 75.00,
        "original_payment_method": "Mastercard ending in 9901",
        "processing_time": "3-5 business days from return receipt",
        "warehouse_notes": warehouse_notes
    }
