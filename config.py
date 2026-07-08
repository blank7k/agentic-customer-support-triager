import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

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

class NormalizedChatGoogleGenerativeAI(ChatGoogleGenerativeAI):
    """
    Custom wrapper to normalize list-based content returned by newer experimental 
    or preview Gemini models into standard strings for backwards compatibility.
    """
    def invoke(self, *args, **kwargs):
        res = super().invoke(*args, **kwargs)
        if hasattr(res, "content") and isinstance(res.content, list):
            text_parts = []
            for part in res.content:
                if isinstance(part, dict) and "text" in part:
                    text_parts.append(part["text"])
                elif isinstance(part, str):
                    text_parts.append(part)
            res.content = "".join(text_parts)
        return res

    def _generate(self, *args, **kwargs):
        res = super()._generate(*args, **kwargs)
        for gen in res.generations:
            if hasattr(gen.message, "content") and isinstance(gen.message.content, list):
                text_parts = []
                for part in gen.message.content:
                    if isinstance(part, dict) and "text" in part:
                        text_parts.append(part["text"])
                    elif isinstance(part, str):
                        text_parts.append(part)
                gen.message.content = "".join(text_parts)
        return res

# Initialize primary model using gemini-3.1-flash-lite
llm = NormalizedChatGoogleGenerativeAI(
    model="gemini-3.1-flash-lite",
    temperature=0.0
)



