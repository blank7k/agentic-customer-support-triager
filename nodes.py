import re
from pydantic import BaseModel, Field
from typing import List, Dict, Any

from retriever import VectorlessRetriever

retriever = VectorlessRetriever()

from config import llm
from state import AgentState, AgentType, Task, TaskResult
from prompts import (
    PLANNER_SYSTEM_PROMPT,
    BILLING_AGENT_SYSTEM_PROMPT,
    SHIPPING_AGENT_SYSTEM_PROMPT,
    REFUND_AGENT_SYSTEM_PROMPT,
    SYNTHESIZER_SYSTEM_PROMPT
)
from mock_tools import (
    mock_fetch_invoice_details,
    mock_get_tracking_status,
    mock_process_refund
)

# Define Pydantic schema for Planner structured output
class TaskModel(BaseModel):
    agent: AgentType = Field(description="Target department. Must be 'billing', 'shipping', or 'refund'.")
    instruction: str = Field(description="Explicit, clear instruction of what this department should resolve.")

class RouterPlan(BaseModel):
    reasons: str = Field(description="Step-by-step reasoning explaining the planned tasks.")
    tasks: List[TaskModel] = Field(description="List of tasks to perform sequentially. Empty if query is simple greeting or out-of-scope.")

# Planner Node
def planner_node(state: AgentState) -> Dict[str, Any]:
    print("\n--- [Planner Node] Analyzing customer request ---")
    customer_request = state.get("customer_request", "")
    
    # Configure LLM for structured output
    structured_llm = llm.with_structured_output(RouterPlan)
    
    # Call LLM
    try:
        response = structured_llm.invoke([
            {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
            {"role": "user", "content": f"Customer Request:\n\"{customer_request}\""}
        ])
        
        # Build tasks list with unique IDs and pending status
        tasks: List[Task] = []
        for idx, t in enumerate(response.tasks):
            tasks.append({
                "id": f"task_{idx}",
                "agent": t.agent,
                "instruction": t.instruction,
                "status": "pending"
            })
            
        print(f"Plan Reason: {response.reasons}")
        print(f"Scheduled Tasks: {[f'{t['id']}:{t['agent'].value}' for t in tasks]}")
        
        return {
            "tasks": tasks,
            "current_task_index": 0,
            "results": []
        }
    except Exception as e:
        print(f"Planner error: {e}")
        # Fallback empty plan
        return {
            "tasks": [],
            "current_task_index": 0,
            "results": []
        }

# Helper to extract IDs from instruction text
def extract_id(instruction: str, pattern_desc: str) -> str:
    # Try looking for a hash followed by alphanumeric e.g. #12345
    hash_match = re.search(r'#([A-Za-z0-9\-]+)', instruction)
    if hash_match:
        return hash_match.group(1)
    
    # Look for alphanumeric sequence after identifier keyword
    id_match = re.search(rf'{pattern_desc}\s*(?:id|number|#)?\s*([A-Za-z0-9\-]+)', instruction, re.I)
    if id_match:
        return id_match.group(1)
        
    # Generic fallback: look for any 4+ digit number
    number_match = re.search(r'\b(\d{4,})\b', instruction)
    if number_match:
        return number_match.group(1)
        
    return ""

# Billing Department Node
def billing_node(state: AgentState) -> Dict[str, Any]:
    idx = state["current_task_index"]
    task = state["tasks"][idx]
    print(f"\n--- [Billing Department Node] Executing task {task['id']} ---")
    print(f"Instruction: {task['instruction']}")
    
    # Step 1: Execute Tool (Mocked)
    # Extract reference ID (like invoice number)
    invoice_id = extract_id(task["instruction"], "invoice")
    tool_output = mock_fetch_invoice_details(invoice_id)
    print(f"Tool Executed: mock_fetch_invoice_details('{invoice_id}') -> Status: {tool_output['payment_status']}, Total: {tool_output['total_billed']}")
    
    # Step 2: Invoke LLM to resolve instruction with tool context
    prompt = BILLING_AGENT_SYSTEM_PROMPT.format(
        instruction=task["instruction"],
        tool_output=str(tool_output)
    )
    
    response = llm.invoke(prompt)
    
    # Step 3: Write back result
    result: TaskResult = {
        "task_id": task["id"],
        "agent": AgentType.BILLING,
        "status": "completed",
        "summary": f"Invoice details retrieved for ID {tool_output['invoice_id']}.",
        "detail": response.content
    }
    
    # Return updates to ledger and index pointer
    updated_results = list(state.get("results", [])) + [result]
    
    # Mark task in state as completed (optional but good hygiene)
    updated_tasks = list(state["tasks"])
    updated_tasks[idx]["status"] = "completed"
    
    return {
        "results": updated_results,
        "tasks": updated_tasks,
        "current_task_index": idx + 1
    }

# Shipping Department Node
def shipping_node(state: AgentState) -> Dict[str, Any]:
    idx = state["current_task_index"]
    task = state["tasks"][idx]
    print(f"\n--- [Shipping Department Node] Executing task {task['id']} ---")
    print(f"Instruction: {task['instruction']}")
    
    # Step 1: Execute Tool (Mocked)
    tracking_id = extract_id(task["instruction"], "tracking|order|shipment")
    tool_output = mock_get_tracking_status(tracking_id, task["instruction"])
    print(f"Tool Executed: mock_get_tracking_status('{tracking_id}') -> Carrier: {tool_output['carrier']}, Status: {tool_output['status']}")
    
    # Step 2: Invoke LLM
    prompt = SHIPPING_AGENT_SYSTEM_PROMPT.format(
        instruction=task["instruction"],
        tool_output=str(tool_output)
    )
    
    response = llm.invoke(prompt)
    
    # Step 3: Write back result
    result: TaskResult = {
        "task_id": task["id"],
        "agent": AgentType.SHIPPING,
        "status": "completed",
        "summary": f"Tracking status is {tool_output['status']} (Carrier: {tool_output['carrier']}).",
        "detail": response.content
    }
    
    updated_results = list(state.get("results", [])) + [result]
    updated_tasks = list(state["tasks"])
    updated_tasks[idx]["status"] = "completed"
    
    return {
        "results": updated_results,
        "tasks": updated_tasks,
        "current_task_index": idx + 1
    }

# Refund Department Node
def refund_node(state: AgentState) -> Dict[str, Any]:
    idx = state["current_task_index"]
    task = state["tasks"][idx]
    print(f"\n--- [Refund Department Node] Executing task {task['id']} ---")
    print(f"Instruction: {task['instruction']}")
    
    # Step 1: Execute Tool (Mocked)
    order_id = extract_id(task["instruction"], "order|refund|item")
    tool_output = mock_process_refund(order_id, task["instruction"])
    print(f"Tool Executed: mock_process_refund('{order_id}') -> Return: {tool_output['return_status']}, Refund: {tool_output['refund_eligibility']}")
    
    # Step 2: Retrieve policy context
    customer_request = state.get("customer_request", "")
    policy_context = retriever.retrieve_relevant_context(customer_request)
    print(f"Policy Context Retrieved ({len(policy_context)} characters)")
    
    # Step 3: Invoke LLM with policy context
    prompt = REFUND_AGENT_SYSTEM_PROMPT.format(
        instruction=task["instruction"],
        tool_output=str(tool_output),
        policy_context=policy_context
    )
    
    response = llm.invoke(prompt)
    
    # Step 3: Write back result
    result: TaskResult = {
        "task_id": task["id"],
        "agent": AgentType.REFUND,
        "status": "completed",
        "summary": f"Refund status verified. {tool_output['refund_eligibility']}.",
        "detail": response.content
    }
    
    updated_results = list(state.get("results", [])) + [result]
    updated_tasks = list(state["tasks"])
    updated_tasks[idx]["status"] = "completed"
    
    return {
        "results": updated_results,
        "tasks": updated_tasks,
        "current_task_index": idx + 1
    }

# Response Synthesizer Node
def response_synthesizer_node(state: AgentState) -> Dict[str, Any]:
    print("\n--- [Response Synthesizer Node] Generating final customer response ---")
    customer_request = state.get("customer_request", "")
    results = state.get("results", [])
    
    # Format ledger entries as text block for prompt
    ledger_text = ""
    for r in results:
        ledger_text += f"\n- [{r['agent'].value.upper()}] Status: {r['status']}\n  Summary: {r['summary']}\n  Draft Resolution: {r['detail']}\n"
    
    if not ledger_text:
        ledger_text = "No tasks executed. The query is simple or out-of-scope for billing, shipping, or refund departments."
        
    prompt = SYNTHESIZER_SYSTEM_PROMPT.format(
        customer_request=customer_request,
        ledger=ledger_text
    )
    
    response = llm.invoke(prompt)
    
    return {
        "final_response": response.content
    }


