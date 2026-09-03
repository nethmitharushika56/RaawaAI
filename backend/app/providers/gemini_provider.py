import os

import requests


GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")


def generate_strategy(prompt: str) -> str | None:
    """Generate strategic analysis with Gemini when a server-side key is configured."""
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        return None
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{GEMINI_MODEL}:generateContent?key={gemini_api_key}"
    )
    try:
        response = requests.post(
            url,
            json={"contents": [{"parts": [{"text": prompt}]}]},
            timeout=45,
        )
        response.raise_for_status()
        parts = response.json().get("candidates", [{}])[0].get("content", {}).get("parts", [])
        return "".join(part.get("text", "") for part in parts).strip() or None
    except (requests.RequestException, ValueError, TypeError, IndexError, KeyError):
        return None
