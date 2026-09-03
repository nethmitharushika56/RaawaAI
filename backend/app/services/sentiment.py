import re

from app.services.external_llm import call_huggingface_sentiment_score

def extract_sentiment(text: str, use_model=True) -> float:
    hf_score = call_huggingface_sentiment_score(text) if use_model else None
    if hf_score is not None:
        return float(hf_score)

    match = re.search(r"Sentiment score:\s*(-?\d+\.?\d*)", text, re.IGNORECASE)
    if match:
        return float(match.group(1))

    match = re.search(r"(-?\d+\.?\d*)", text)
    return float(match.group(1)) if match else 0.0
