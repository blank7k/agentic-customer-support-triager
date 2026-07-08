from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from state import AgentState, AgentType
from nodes import (
    planner_node,
    billing_node,
    shipping_node,
    refund_node,
    response_synthesizer_node
)
from human_approval import human_approval_node

# Dispatcher function: pure Python logic mapping current task index to node name
def dispatcher(state: AgentState) -> str:
    tasks = state.get("tasks", [])
    idx = state.get("current_task_index", 0)
    
    if idx < len(tasks):
        next_task = tasks[idx]
        agent_type = next_task["agent"]
        
        # Map AgentType Enum value to correct Graph Node ID
        if agent_type == AgentType.BILLING:
            return "billing_node"
        elif agent_type == AgentType.SHIPPING:
            return "shipping_node"
        elif agent_type == AgentType.REFUND:
            return "refund_node"
            
    # Default to synthesis when all tasks completed (or plan is empty)
    return "response_synthesizer_node"

# Approval Router: checks if human review is required, else routes back to dispatcher
def approval_router(state: AgentState) -> str:
    if state.get("approval_required", False):
        return "human_approval_node"
    return dispatcher(state)

# Construct State Graph
workflow = StateGraph(AgentState)

# Add Nodes
workflow.add_node("planner_node", planner_node)
workflow.add_node("billing_node", billing_node)
workflow.add_node("shipping_node", shipping_node)
workflow.add_node("refund_node", refund_node)
workflow.add_node("human_approval_node", human_approval_node)
workflow.add_node("response_synthesizer_node", response_synthesizer_node)

# Add Start Edge
workflow.add_edge(START, "planner_node")

# Routing Map for Dispatcher and Router
routing_map = {
    "billing_node": "billing_node",
    "shipping_node": "shipping_node",
    "refund_node": "refund_node",
    "response_synthesizer_node": "response_synthesizer_node"
}

# Add Conditional Edges from Planner Node
workflow.add_conditional_edges(
    "planner_node",
    dispatcher,
    routing_map
)

# Add Conditional Edges from Worker Nodes (they cycle back to dispatcher)
workflow.add_conditional_edges(
    "billing_node",
    dispatcher,
    routing_map
)

workflow.add_conditional_edges(
    "shipping_node",
    dispatcher,
    routing_map
)

# Refund Node routes through the Approval Router
workflow.add_conditional_edges(
    "refund_node",
    approval_router,
    {
        "human_approval_node": "human_approval_node",
        "billing_node": "billing_node",
        "shipping_node": "shipping_node",
        "refund_node": "refund_node",
        "response_synthesizer_node": "response_synthesizer_node"
    }
)

# Human Approval Node routes back to dispatcher after decision is recorded
workflow.add_conditional_edges(
    "human_approval_node",
    dispatcher,
    routing_map
)

# Add End Edge
workflow.add_edge("response_synthesizer_node", END)

# Compile Graph with Checkpoint Memory and Interrupt Before human approval
memory = MemorySaver()
app = workflow.compile(
    checkpointer=memory,
    interrupt_before=["human_approval_node"]
)


