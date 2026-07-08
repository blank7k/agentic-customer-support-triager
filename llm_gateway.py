import os
import time
import json
from dataclasses import dataclass
from datetime import datetime
from typing import List, Dict, Any, Type
import litellm
from litellm.caching import Cache

@dataclass
class LLMResponse:
    text: str
    provider: str
    model: str
    latency: float
    input_tokens: int
    output_tokens: int
    estimated_cost: float
    cache_hit: bool

class LLMGateway:
    def __init__(self, providers_config: List[Dict[str, Any]], enable_cache: bool = True):
        self.providers = providers_config
        self.telemetry_logs: List[Dict[str, Any]] = []
        
        # Configure LiteLLM global cache native delegation
        if enable_cache:
            try:
                litellm.cache = Cache()
                print("LiteLLM native caching enabled successfully.")
            except Exception as e:
                print(f"Warning: Failed to initialize LiteLLM cache: {e}")
                litellm.cache = None
        else:
            litellm.cache = None
            print("LiteLLM native caching disabled.")

    def _normalize_messages(self, messages: Any) -> List[Dict[str, str]]:
        """Converts incoming strings, list of strings, or LangChain messages into LiteLLM format."""
        if isinstance(messages, str):
            return [{"role": "user", "content": messages}]
            
        normalized = []
        for msg in messages:
            if hasattr(msg, "type"):
                # LangChain Message structure detection
                role = "assistant" if msg.type == "ai" else msg.type
                normalized.append({"role": role, "content": msg.content})
            elif isinstance(msg, dict):
                normalized.append(msg)
            else:
                normalized.append({"role": "user", "content": str(msg)})
        return normalized

    def invoke(self, messages: Any, **kwargs) -> LLMResponse:
        """Executes a text completion query with dynamic failover retry and telemetry logging."""
        normalized_messages = self._normalize_messages(messages)
        start_time = time.perf_counter()
        
        # 1. Attempt cache lookup using LiteLLM Cache Key generator
        cache_key = None
        cached_response = None
        if litellm.cache and litellm.cache.cache:
            try:
                # Cache lookup is generated against the primary model
                primary_model = self.providers[0]["model"]
                cache_key = litellm.cache.get_cache_key(
                    model=primary_model,
                    messages=normalized_messages,
                    **kwargs
                )
                if cache_key:
                    cached_response = litellm.cache.cache.get_cache(cache_key)
            except Exception as ce:
                print(f"[LLM Gateway] Cache lookup error: {ce}")

        if cached_response is not None:
            # Cache HIT!
            latency = time.perf_counter() - start_time
            usage = getattr(cached_response, "usage", None) or cached_response.get("usage")
            input_tokens = usage.get("prompt_tokens", 0) if usage else 0
            output_tokens = usage.get("completion_tokens", 0) if usage else 0
            
            model_used = getattr(cached_response, "model", self.providers[0]["model"])
            provider_name = self.providers[0]["name"]
            for p in self.providers:
                if p["model"] == model_used:
                    provider_name = p["name"]
                    break
                    
            record = {
                "timestamp": datetime.now().isoformat(),
                "provider": provider_name,
                "model": model_used,
                "latency": latency,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "estimated_cost": 0.0,  # Cache hits are free
                "cache_hit": True
            }
            self.telemetry_logs.append(record)
            
            response_text = cached_response.choices[0].message.content
            return LLMResponse(
                text=response_text,
                provider=provider_name,
                model=model_used,
                latency=latency,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                estimated_cost=0.0,
                cache_hit=True
            )

        # 2. Cache MISS: Proceed to fallback provider loop
        last_error = None
        response = None
        selected_provider = None
        
        for provider in self.providers:
            selected_provider = provider
            model_name = provider["model"]
            print(f"[LLM Gateway] Attempting execution with model: {model_name}...")
            
            try:
                response = litellm.completion(
                    model=model_name,
                    messages=normalized_messages,
                    **kwargs
                )
                break  # Success! Exit loop
            except Exception as e:
                print(f"[LLM Gateway] Provider {provider['name']} failed: {str(e)[:150]}")
                last_error = e
                
        if response is None:
            raise Exception(f"All LLM providers failed. Last error: {last_error}")

        # Save to Cache using primary key to match subsequent queries
        if cache_key and litellm.cache and litellm.cache.cache:
            try:
                litellm.cache.cache.set_cache(cache_key, response)
            except Exception as ce:
                print(f"[LLM Gateway] Failed to write cache: {ce}")

        # Metrics and Telemetry Logging
        latency = time.perf_counter() - start_time
        usage = getattr(response, "usage", None) or response.get("usage")
        input_tokens = usage.get("prompt_tokens", 0) if usage else 0
        output_tokens = usage.get("completion_tokens", 0) if usage else 0
        
        try:
            estimated_cost = litellm.completion_cost(completion_response=response)
        except Exception:
            estimated_cost = 0.0
            
        record = {
            "timestamp": datetime.now().isoformat(),
            "provider": selected_provider["name"],
            "model": selected_provider["model"],
            "latency": latency,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "estimated_cost": estimated_cost,
            "cache_hit": False
        }
        self.telemetry_logs.append(record)
        
        response_text = response.choices[0].message.content
        return LLMResponse(
            text=response_text,
            provider=selected_provider["name"],
            model=selected_provider["model"],
            latency=latency,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            estimated_cost=estimated_cost,
            cache_hit=False
        )

    def invoke_structured(self, messages: Any, schema: Type[Any], **kwargs) -> Any:
        """Executes a structured completion query enforcing the output Pydantic schema."""
        normalized_messages = self._normalize_messages(messages)
        start_time = time.perf_counter()
        
        # 1. Attempt cache lookup using LiteLLM Cache Key generator
        cache_key = None
        cached_response = None
        if litellm.cache and litellm.cache.cache:
            try:
                primary_model = self.providers[0]["model"]
                cache_key = litellm.cache.get_cache_key(
                    model=primary_model,
                    messages=normalized_messages,
                    response_format=schema,
                    **kwargs
                )
                if cache_key:
                    cached_response = litellm.cache.cache.get_cache(cache_key)
            except Exception as ce:
                print(f"[LLM Gateway] Cache lookup error: {ce}")

        if cached_response is not None:
            # Cache HIT!
            latency = time.perf_counter() - start_time
            usage = getattr(cached_response, "usage", None) or cached_response.get("usage")
            input_tokens = usage.get("prompt_tokens", 0) if usage else 0
            output_tokens = usage.get("completion_tokens", 0) if usage else 0
            
            model_used = getattr(cached_response, "model", self.providers[0]["model"])
            provider_name = self.providers[0]["name"]
            for p in self.providers:
                if p["model"] == model_used:
                    provider_name = p["name"]
                    break
                    
            record = {
                "timestamp": datetime.now().isoformat(),
                "provider": provider_name,
                "model": model_used,
                "latency": latency,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "estimated_cost": 0.0,
                "cache_hit": True,
                "structured": True
            }
            self.telemetry_logs.append(record)
            
            raw_json_str = cached_response.choices[0].message.content
            return self._validate_structured_json(raw_json_str, schema)

        # 2. Cache MISS: Proceed to fallback loop
        last_error = None
        response = None
        selected_provider = None
        
        for provider in self.providers:
            selected_provider = provider
            model_name = provider["model"]
            print(f"[LLM Gateway] Attempting structured completion with model: {model_name}...")
            
            try:
                response = litellm.completion(
                    model=model_name,
                    messages=normalized_messages,
                    response_format=schema,
                    **kwargs
                )
                break  # Success!
            except Exception as e:
                print(f"[LLM Gateway] Structured Provider {provider['name']} failed: {str(e)[:150]}")
                last_error = e
                
        if response is None:
            raise Exception(f"All structured LLM providers failed. Last error: {last_error}")

        # Save to Cache
        if cache_key and litellm.cache and litellm.cache.cache:
            try:
                litellm.cache.cache.set_cache(cache_key, response)
            except Exception as ce:
                print(f"[LLM Gateway] Failed to write cache: {ce}")

        latency = time.perf_counter() - start_time
        usage = getattr(response, "usage", None) or response.get("usage")
        input_tokens = usage.get("prompt_tokens", 0) if usage else 0
        output_tokens = usage.get("completion_tokens", 0) if usage else 0
        
        try:
            estimated_cost = litellm.completion_cost(completion_response=response)
        except Exception:
            estimated_cost = 0.0
            
        record = {
            "timestamp": datetime.now().isoformat(),
            "provider": selected_provider["name"],
            "model": selected_provider["model"],
            "latency": latency,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "estimated_cost": estimated_cost,
            "cache_hit": False,
            "structured": True
        }
        self.telemetry_logs.append(record)
        
        raw_json_str = response.choices[0].message.content
        return self._validate_structured_json(raw_json_str, schema)

    def _validate_structured_json(self, raw_json_str: str, schema: Type[Any]) -> Any:
        try:
            if hasattr(schema, "model_validate_json"):
                parsed_object = schema.model_validate_json(raw_json_str)
            elif hasattr(schema, "parse_raw"):
                parsed_object = schema.parse_raw(raw_json_str)
            else:
                data = json.loads(raw_json_str)
                parsed_object = schema(**data)
            return parsed_object
        except Exception as parse_err:
            raise Exception(f"Failed parsing response as schema: {parse_err}. Content: {raw_json_str}")
