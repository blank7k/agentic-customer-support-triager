import os
from dotenv import load_dotenv
from llm_gateway import LLMGateway

# Load .env file
dotenv_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(dotenv_path)

# Map credentials to standard environment variables for LangChain compatibility
if os.getenv("Gemini_API_Key"):
    os.environ["GEMINI_API_KEY"] = os.getenv("Gemini_API_Key")
if os.getenv("groq_api_key"):
    os.environ["GROQ_API_KEY"] = os.getenv("groq_api_key")
if os.getenv("TAVILY_API_KEY"):
    os.environ["TAVILY_API_KEY"] = os.getenv("TAVILY_API_KEY")
if os.getenv("OPENAI_API_KEY"):
    os.environ["OPENAI_API_KEY"] = os.getenv("OPENAI_API_KEY")

# 1. Define priorities and provider configurations
PROVIDERS_CONFIG = [
    {"name": "groq", "model": "groq/llama-3.3-70b-versatile"},
    {"name": "gemini", "model": "gemini/gemini-3.1-flash-lite"},
    {"name": "openai", "model": "openai/gpt-4o-mini"}
]

# 2. Instantiate explicit LLMGateway
gateway = LLMGateway(PROVIDERS_CONFIG, enable_cache=True)

# 3. Create LangChain Adapter Classes to maintain zero code change in nodes
class LangChainGatewayAdapter:
    def __init__(self, gateway_instance: LLMGateway):
        self.gateway = gateway_instance

    def invoke(self, messages, **kwargs):
        # Maps LangChain invoke to gateway invoke
        response = self.gateway.invoke(messages, **kwargs)
        from langchain_core.messages import AIMessage
        return AIMessage(content=response.text)

    def with_structured_output(self, schema, **kwargs):
        return LangChainStructuredAdapter(self.gateway, schema)

class LangChainStructuredAdapter:
    def __init__(self, gateway_instance: LLMGateway, schema):
        self.gateway = gateway_instance
        self.schema = schema

    def invoke(self, messages, **kwargs):
        # Maps LangChain structured invoke to gateway structured invoke
        return self.gateway.invoke_structured(messages, self.schema, **kwargs)

# Export the adapter as the legacy 'llm' instance
llm = LangChainGatewayAdapter(gateway)




