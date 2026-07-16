from typing import Dict, Any, Optional
from graph import app
from guardrails import run_guarded_agent

class GraphService:
    @staticmethod
    def run_workflow(thread_id: str, customer_input: Optional[str]) -> Dict[str, Any]:
        """
        Runs the guarded agent workflow using the checkpointer thread session.
        """
        config = {"configurable": {"thread_id": thread_id}}
        return run_guarded_agent(customer_input, config)

    @staticmethod
    def inject_approval_decision(thread_id: str, decision: str) -> None:
        """
        Injects the manager's HITL approval/rejection state directly into the thread checkpointer memory.
        """
        config = {"configurable": {"thread_id": thread_id}}
        app.update_state(config, {"approval_status": decision})

    @staticmethod
    def get_thread_state(thread_id: str) -> Any:
        """
        Retrieves the current thread state metadata from LangGraph's checkpointer.
        """
        config = {"configurable": {"thread_id": thread_id}}
        return app.get_state(config)
