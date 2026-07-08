from typing import Tuple, Optional

def needs_refund_approval(refund_result: dict) -> Tuple[bool, Optional[str]]:
    """
    Evaluates whether a refund transaction requires human approval.
    
    Escalation triggers:
    1. Refund amount exceeds the high-value limit (value > 70, representing high value / > ₹5000).
    2. Order information is missing or unresolved.
    3. Refund status requires manual verification (e.g. 'Pending Policy Verification').
    """
    refund_amount = refund_result.get("refund_amount", 0.0)
    order_id = refund_result.get("order_id", "").strip()
    refund_eligibility = refund_result.get("refund_eligibility", "").strip()
    
    # 1. High-value refund check
    if refund_amount > 70.0:
        return True, f"High-value escalation: Refund amount {refund_amount} exceeds auto-approval threshold."
        
    # 2. Missing order info check
    if not order_id or order_id == "ORD-45678":
        return True, "Escalation: Missing or default order information."
        
    # 3. Manual policy verification check
    if refund_eligibility == "Pending Policy Verification":
        return True, f"Manual Escalation: Refund eligibility is pending policy verification for order {order_id}."
        
    return False, None
