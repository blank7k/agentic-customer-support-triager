import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq

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

# Initialize primary model
# Using Groq llama-3.3-70b-versatile to avoid Gemini 20 requests/day quota limit
llm = ChatGroq(
    model="llama-3.3-70b-versatile",
    temperature=0.0
)
