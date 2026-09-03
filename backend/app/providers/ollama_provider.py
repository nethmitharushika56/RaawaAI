import os

import requests


OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")


def generate(prompt: str, model: str | None = None) -> str | None:
    """Generate locally with Ollama; return None when Ollama is unavailable."""
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/generate",
            json={"model": model or OLLAMA_MODEL, "prompt": prompt, "stream": False},
            timeout=45,
        )
        response.raise_for_status()
        return response.json().get("response")
    except (requests.RequestException, ValueError, TypeError):
        return None
