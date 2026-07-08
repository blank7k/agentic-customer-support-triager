import sys
from graph import app

# Pre-defined verification test scenarios
TEST_SCENARIOS = [
    {
        "name": "Scenario A: Billing (Single Task)",
        "request": "Hi, I noticed a charge of $21.60 on invoice #INV-2026B. But my monthly rate is supposed to be $10.80. Why was I charged double?"
    },
    {
        "name": "Scenario B: Shipping (Single Task)",
        "request": "Where is my package? The tracking number is #TRK-881920."
    },
    {
        "name": "Scenario C: Refund & Return (Single Task)",
        "request": "I received damaged shoes in my last order #ORD-88122. I would like to return them and get a full refund."
    },
    {
        "name": "Scenario D: Multi-Task Sequential Support",
        "request": "Hello, my credit card was double-charged on invoice #INV-DOUBLE-99. Also, I need to know where my order tracking #TRK-DEL-981 is, and I want to request a return/refund for order #ORD-REF-303 because it was damaged."
    },
    {
        "name": "Scenario E: Out of Scope / Greeting",
        "request": "Hello there! Hope you are having a nice day. What are your store hours?"
    },
    {
        "name": "Test Case 6 (Footwear window edge case)",
        "request": "I bought casual sneakers 12 days ago, but they don't fit well. Can I exchange them for a larger size or get a refund?"
    },
    {
        "name": "Test Case 7 (Damaged Smartphone 48h limit check)",
        "request": "I opened my package today and found my new smartphone screen is completely shattered. The tracking details show it was delivered 3 days ago. Please send a replacement."
    }
]

def run_agentic_triage(request_text: str):
    print("=" * 80)
    print(f"Customer Input: \"{request_text}\"")
    print("=" * 80)
    
    # Run the compiled LangGraph workflow
    initial_state = {
        "customer_request": request_text,
        "tasks": [],
        "current_task_index": 0,
        "results": [],
        "final_response": ""
    }
    
    final_state = app.invoke(initial_state)
    
    # Output execution results log
    print("\n" + "=" * 30 + " EXECUTION LEDGER " + "=" * 30)
    print(f"Total tasks planned: {len(final_state.get('tasks', []))}")
    for idx, task in enumerate(final_state.get("tasks", [])):
        print(f"Task {task['id']} - Agent: {task['agent'].value} | Status: {task['status']}")
        print(f"  Instruction: {task['instruction']}")
        
    print("\n" + "-" * 20 + " Results Recorded " + "-" * 20)
    for res in final_state.get("results", []):
        print(f"[{res['agent'].value.upper()}] Status: {res['status']} | Summary: {res['summary']}")
        print(f"  Details: {res['detail'].strip()}\n")
        
    print("=" * 30 + " FINAL SYNTHESIZED RESPONSE " + "=" * 30)
    print(final_state.get("final_response", ""))
    print("=" * 80 + "\n")

def main():
    print("Welcome to the Agentic Customer Support Triager!")
    
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        print("\n--- Running Verification Test Scenarios ---\n")
        for i, scenario in enumerate(TEST_SCENARIOS):
            print(f"\n[RUNNING TEST CASE {i + 1}] {scenario['name']}")
            run_agentic_triage(scenario["request"])
        print("\nAll verification scenarios complete.")
        return
        
    # Interactive CLI Mode
    print("Type '--test' to run automated scenarios, or interact directly below.")
    while True:
        try:
            user_input = input("\nEnter customer support request (or 'exit' to quit): ").strip()
            if not user_input:
                continue
            if user_input.lower() in ['exit', 'quit']:
                print("Exiting customer support triager.")
                break
            run_agentic_triage(user_input)
        except KeyboardInterrupt:
            print("\nExiting.")
            break

if __name__ == "__main__":
    main()
