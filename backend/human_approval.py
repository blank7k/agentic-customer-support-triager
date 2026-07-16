from typing import Dict, Any
from state import AgentState, AgentType

def human_approval_node(state: AgentState) -> Dict[str, Any]:
    print("\n--- [Human Approval Node] Processing manager decision ---")
    status = state.get("approval_status", "pending")
    reason = state.get("approval_reason", "No reason provided")
    
    tasks = list(state.get("tasks", []))
    results = list(state.get("results", []))
    
    # Locate the active refund task
    target_task_idx = None
    for i in reversed(range(len(tasks))):
        if tasks[i]["agent"] == AgentType.REFUND:
            target_task_idx = i
            break
            
    if target_task_idx is None:
        print("Warning: No refund task found in state during approval step.")
        return {
            "approval_required": False
        }
        
    task_id = tasks[target_task_idx]["id"]
    
    # Locate the corresponding task execution ledger result
    result_idx = None
    for idx, r in enumerate(results):
        if r["task_id"] == task_id:
            result_idx = idx
            break
            
    if result_idx is None:
        print("Warning: No task result found matching refund task ID.")
        return {
            "approval_required": False
        }
        
    if status == "approved":
        print(f"Human Approval GRANTED for task {task_id}.")
        tasks[target_task_idx]["status"] = "completed"
        results[result_idx]["status"] = "completed"
        results[result_idx]["summary"] = f"Refund APPROVED by manager: {reason}"
        results[result_idx]["detail"] = f"[MANAGER APPROVED]\n{results[result_idx]['detail']}"
        
    elif status == "rejected":
        print(f"Human Approval REJECTED for task {task_id}.")
        tasks[target_task_idx]["status"] = "failed"
        results[result_idx]["status"] = "failed"
        results[result_idx]["summary"] = f"Refund DECLINED by manager: {reason}"
        
        # Extract the order ID from task results if possible
        order_info = results[result_idx].get("summary", "")
        
        results[result_idx]["detail"] = (
            f"Dear Customer,\n\nWe have reviewed your request. Unfortunately, your "
            f"refund request cannot be approved at this time.\n"
            f"Escalation Reason: {reason}\n\n"
            f"If you believe this is an error or have additional details to provide, "
            f"please reply to this support ticket."
        )
        
    # Reset approval trigger state
    return {
        "tasks": tasks,
        "results": results,
        "approval_required": False
    }
