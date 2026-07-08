import re
from typing import Optional, Dict, Any
from pydantic import BaseModel

class GuardrailResult(BaseModel):
    is_safe: bool
    rejection_reason: Optional[str] = None
    processed_text: str

def mask_pii(text: str) -> str:
    # 1. Mask Emails
    email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
    text = re.sub(email_pattern, "[EMAIL]", text)
    
    # 2. Mask Credit Card Numbers (13 to 16 digits, with optional spaces or dashes)
    # Ensure word boundary to avoid partial numeric sequence matches
    cc_pattern = r'\b(?:\d[ -]*?){13,16}\b'
    text = re.sub(cc_pattern, "[CREDIT_CARD]", text)
    
    # 3. Mask Phone Numbers (U.S., international, and standard 10-digit variants)
    phone_pattern = r'\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'
    text = re.sub(phone_pattern, "[PHONE]", text)
    
    return text

class InputGuardrail:
    def __init__(self, max_length: int = 2000):
        self.max_length = max_length
        self.injection_keywords = [
            "ignore previous instructions",
            "system prompt",
            "dan mode",
            "jailbreak",
            "you are now a",
            "forget your guidelines",
            "override instructions",
            "bypass system instructions"
        ]

    def validate(self, text: str) -> GuardrailResult:
        # Check 1: Empty prompt
        if not text or not text.strip():
            return GuardrailResult(
                is_safe=False,
                rejection_reason="Rejection: Prompt is empty.",
                processed_text=text
            )

        # Check 2: Excessively long prompts
        if len(text) > self.max_length:
            return GuardrailResult(
                is_safe=False,
                rejection_reason=f"Rejection: Prompt length ({len(text)} characters) exceeds the maximum limit of {self.max_length}.",
                processed_text=text
            )

        # Check 3: Prompt injection detection
        text_lower = text.lower()
        for keyword in self.injection_keywords:
            if keyword in text_lower:
                return GuardrailResult(
                    is_safe=False,
                    rejection_reason=f"Rejection: Potential prompt injection detected (keyword: '{keyword}').",
                    processed_text=text
                )

        # Step 4: Mask PII (does not reject the prompt, just masks it)
        masked_text = mask_pii(text)
        
        return GuardrailResult(
            is_safe=True,
            processed_text=masked_text
        )

class OutputGuardrail:
    def validate(self, text: str) -> GuardrailResult:
        # Check 1: Empty response check
        if not text or not text.strip():
            return GuardrailResult(
                is_safe=False,
                rejection_reason="Rejection: Synthesized response is empty.",
                processed_text=text
            )

        # Step 2: Mask PII (ensures no PII is printed/returned to customer)
        masked_text = mask_pii(text)

        return GuardrailResult(
            is_safe=True,
            processed_text=masked_text
        )

def run_guarded_agent(customer_input: str) -> Dict[str, Any]:
    """Wraps the LangGraph workflow invocation with input and output guardrails."""
    # 1. Run Input Guardrail
    input_guardrail = InputGuardrail()
    input_result = input_guardrail.validate(customer_input)
    
    if not input_result.is_safe:
        return {
            "success": False,
            "error_source": "input_guardrail",
            "message": input_result.rejection_reason,
            "final_response": input_result.rejection_reason,
            "tasks": [],
            "results": []
        }
    
    # 2. Invoke Core LangGraph
    # Import app inside the function to avoid circular import issues or premature loading
    from graph import app
    
    initial_state = {
        "customer_request": input_result.processed_text,
        "tasks": [],
        "current_task_index": 0,
        "results": [],
        "final_response": ""
    }
    
    try:
        final_state = app.invoke(initial_state)
    except Exception as e:
        return {
            "success": False,
            "error_source": "graph_execution",
            "message": f"Graph invocation failed: {str(e)}",
            "final_response": "An error occurred during backend resolution.",
            "tasks": [],
            "results": []
        }
        
    final_response = final_state.get("final_response", "")

    # 3. Run Output Guardrail
    output_guardrail = OutputGuardrail()
    output_result = output_guardrail.validate(final_response)
    
    if not output_result.is_safe:
        return {
            "success": False,
            "error_source": "output_guardrail",
            "message": output_result.rejection_reason,
            "final_response": output_result.rejection_reason,
            "tasks": final_state.get("tasks", []),
            "results": final_state.get("results", [])
        }

    return {
        "success": True,
        "final_response": output_result.processed_text,
        "tasks": final_state.get("tasks", []),
        "results": final_state.get("results", [])
    }
