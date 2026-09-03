import os

import requests


GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"


def generate_strategy(prompt: str) -> str | None:
    """Generate strategic analysis with Groq when a server-side key is configured."""
    groq_api_key = os.getenv("GROQ_API_KEY")
    groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
    if not groq_api_key:
        return None

    try:
        response = requests.post(
            GROQ_API_URL,
            headers={
                "Authorization": f"Bearer {groq_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": groq_model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.4,
            },
            timeout=45,
        )
        if not response.ok:
            try:
                error = response.json().get("error", {})
                detail = error.get("message", "unknown API error")
            except (ValueError, TypeError):
                detail = "unreadable API error"
            print(f"[Groq] HTTP {response.status_code}: {detail[:200]}")
            return None
        choices = response.json().get("choices", [])
        return choices[0].get("message", {}).get("content", "").strip() or None
    except requests.RequestException as exc:
        print(f"[Groq] {type(exc).__name__}: {exc}")
        return None
    except (ValueError, TypeError, IndexError, KeyError) as exc:
        print(f"[Groq] {type(exc).__name__}: invalid response")
        return None