import os
import re
from typing import Dict
from config import llm
from llm_gateway import TaskType

PREVIEW_SUMMARIES: Dict[str, str] = {
    "1. General Return Conditions & Smartphone Policy": "Include the general 1-12 policy rules, international export limitations, technician visits, and the 48-hour damage reporting window rule for mobiles.",
    "2. Books, Movies, Music, and Digital Content": "Include Kindle Books 7-day accidental refund rule, Paid Skills 3-day window, and the 10-day replacement rule for physical books.",
    "3. Electronics, TVs, and Large Appliances": "Include the 10-day replacement rule for TVs, Air Conditioners, and Large Appliances, alongside technician inspection workflows.",
    "4. Clothing, Shoes, and Fashion Accessories": "Include the 10-day free return/exchange window for standard clothing and shoes, and explicitly note the non-returnable hygiene terms for innerwear/socks.",
    "5. Fine Art, Gold/Silver Coins, and Custom Products": "Include the 2-day inspect & buy rule, 10-day seller contact window for Fine Art, and non-returnable terms for personalized/custom products and bullion."
}

ROUTER_SYSTEM_PROMPT = """You are a policy routing assistant for customer support.
Your task is to analyze the customer query and select the most relevant policy section from the available store policy sections.

Below are the available policy sections along with their titles and preview summaries of the rules they contain:

{section_list}

Instructions:
1. Compare the customer query against both the Section Title AND the preview summaries.
2. Select the single most relevant section that covers the products or terms mentioned in the query.
3. If no specific category matches, or if it is a general return question, default to "1. General Return Conditions & Smartphone Policy".
4. Output your final selection in the exact format:
SELECTED_SECTION: <Title Name>

Ensure you only select one of the exact Section Titles listed above. Do not output anything other than the SELECTED_SECTION line.
"""

class VectorlessRetriever:
    def __init__(self, policy_file_path: str = None):
        if policy_file_path is None:
            policy_file_path = os.path.join(os.path.dirname(__file__), "store_policy.txt")
        self.policy_file_path = policy_file_path
        self.sections = self._load_sections()

    def _load_sections(self) -> Dict[str, str]:
        if not os.path.exists(self.policy_file_path):
            print(f"Warning: Policy file not found at {self.policy_file_path}")
            return {}
        
        with open(self.policy_file_path, "r", encoding="utf-8") as f:
            content = f.read()
        
        # Split on the exact regex split pattern requested: r'\[SECTION:\s*(.*?)\]'
        parts = re.split(r'\[SECTION:\s*(.*?)\]', content)
        
        sections = {}
        for i in range(1, len(parts), 2):
            title = parts[i].strip()
            body = parts[i+1] if i+1 < len(parts) else ""
            sections[title] = body.strip()
            
        return sections

    def retrieve_relevant_context(self, query: str) -> str:
        # Format the section list with summaries for the LLM prompt
        section_list_str = ""
        for title, summary in PREVIEW_SUMMARIES.items():
            section_list_str += f"- Title: {title}\n  Summary: {summary}\n\n"
            
        system_prompt = ROUTER_SYSTEM_PROMPT.format(section_list=section_list_str)
        user_message = f"Customer Query: {query}"
        
        try:
            # Call Groq LLM client
            response = llm.invoke([
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_message}
            ], task_type=TaskType.RETRIEVAL)
            response_text = response.content.strip()
        except Exception as e:
            print(f"Error calling LLM in retriever: {e}")
            response_text = ""
            
        # Parse the selected section
        selected_section = self._parse_selected_section(response_text)
        
        # Retrieve context from parsed sections
        if selected_section in self.sections:
            return self.sections[selected_section]
        
        # Fallback to general policy
        default_section = "1. General Return Conditions & Smartphone Policy"
        return self.sections.get(default_section, "No policy context found.")

    def _parse_selected_section(self, parsed_string: str) -> str:
        # Clean parsed string
        parsed_string_clean = parsed_string.strip()
        
        # 1. Regex attempt to match "SELECTED_SECTION: <Title Name>"
        match = re.search(r'SELECTED_SECTION:\s*(.*)', parsed_string_clean, re.IGNORECASE)
        if match:
            extracted_title = match.group(1).strip()
            if extracted_title in self.sections:
                return extracted_title
            
            # Case-insensitive check
            for title in self.sections.keys():
                if title.lower() == extracted_title.lower():
                    return title

        # 2. Lowercase partial substring intersection fallback
        # "Use a safe fallback parsing mechanism in python: if the model drifts from the title string, search using a lowercase partial substring intersection (if key.lower() in parsed_string)."
        for key in self.sections.keys():
            if key.lower() in parsed_string_clean.lower():
                return key
                
        # Default fallback
        return "1. General Return Conditions & Smartphone Policy"
