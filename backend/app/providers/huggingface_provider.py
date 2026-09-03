import os

import requests


HF_API_URL = "https://api-inference.huggingface.co/models"
HF_SENTIMENT_MODEL = os.getenv(
    "HF_SENTIMENT_MODEL", "cardiffnlp/twitter-roberta-base-sentiment-latest"
)


def score_sentiment(text: str, model: str | None = None) -> float | None:
    """Return a normalized sentiment score, or None when inference is unavailable."""
    hf_api_key = os.getenv("HF_API_KEY")
    if not hf_api_key:
        return None
    try:
        response = requests.post(
            f"{HF_API_URL}/{model or HF_SENTIMENT_MODEL}",
            headers={"Authorization": f"Bearer {hf_api_key}"},
            json={"inputs": text},
            timeout=45,
        )
        response.raise_for_status()
        data = response.json()
        candidates = data[0] if isinstance(data, list) and data else data
        if candidates and isinstance(candidates[0], list):
            candidates = candidates[0]
        if not isinstance(candidates, list):
            return None
        scores = {str(item.get("label", "")).lower(): float(item["score"]) for item in candidates}
        return max(-1.0, min(1.0, scores.get("positive", 0.0) - scores.get("negative", 0.0)))
    except (requests.RequestException, ValueError, TypeError, KeyError):
        return None
