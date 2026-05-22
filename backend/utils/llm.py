import json
import urllib.request
import urllib.error
from config import settings

async def generate_completion(
    prompt: str, 
    system_prompt: str = "You are an assistant helping run a civilization simulation.",
    temperature: float = 0.7,
    max_tokens: int = 1000
) -> str:
    """
    Generate completion using OpenRouter and the configured free model.
    Sends request asynchronously using standard asyncio executors if needed, 
    or synchronously for simplicity depending on application calling patterns.
    """
    api_key = settings.openrouter_api_key
    if not api_key:
        raise ValueError("No API key configured for OpenRouter / LLM client.")

    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/google/antigravity",
        "X-Title": "AI Civilization Simulator"
    }

    data = {
        "model": settings.openrouter_model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": temperature,
        "max_tokens": max_tokens
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode("utf-8"),
        headers=headers,
        method="POST"
    )

    # Use urllib synchronous request (can be run in threadpool if non-blocking is required)
    try:
        # Wrap the blocking call to avoid blocking the main async loop
        import asyncio
        loop = asyncio.get_event_loop()
        
        def _call_api():
            with urllib.request.urlopen(req, timeout=60) as response:
                res_body = response.read().decode("utf-8")
                res_data = json.loads(res_body)
                return res_data["choices"][0]["message"]["content"]
                
        return await loop.run_in_executor(None, _call_api)
        
    except urllib.error.HTTPError as e:
        error_details = e.read().decode("utf-8")
        raise RuntimeError(f"OpenRouter API returned HTTP {e.code}: {error_details}")
    except Exception as e:
        raise RuntimeError(f"Failed to communicate with OpenRouter: {str(e)}")
