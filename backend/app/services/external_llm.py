import os
import requests


HF_TEXT_MODEL = os.getenv("HF_TEXT_MODEL", "google/flan-t5-base")
HF_SENTIMENT_MODEL = os.getenv("HF_SENTIMENT_MODEL", "cardiffnlp/twitter-roberta-base-sentiment-latest")


def _hf_token():
    return os.getenv("HF_TOKEN") or os.getenv("HF_API_TOKEN") or os.getenv("HF_API_KEY")


def _hf_request(model: str, payload: dict):
    hf_token = _hf_token()
    headers = {"Authorization": f"Bearer {hf_token}"} if hf_token else {}
    url = f"https://router.huggingface.co/hf-inference/models/{model}"
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=45)
        response.raise_for_status()
        return response.json()
    except Exception:
        return None


def _extract_generated_text(data):
    if isinstance(data, list) and data:
        first = data[0]
        if isinstance(first, dict):
            if "generated_text" in first:
                return first["generated_text"]
            if "summary_text" in first:
                return first["summary_text"]
        if isinstance(first, str):
            return first
    if isinstance(data, dict):
        if "generated_text" in data:
            return data["generated_text"]
        if "summary_text" in data:
            return data["summary_text"]
        if "error" in data:
            return f"(HF error) {data['error']}"
    return None


def call_huggingface_generation(prompt: str, model: str | None = None, max_new_tokens: int = 160) -> str | None:
    data = _hf_request(
        model or HF_TEXT_MODEL,
        {
            "inputs": prompt,
            "parameters": {
                "max_new_tokens": max_new_tokens,
                "do_sample": True,
                "temperature": 0.6,
                "return_full_text": False,
            },
        },
    )
    if data is None:
        return None
    return _extract_generated_text(data)


def call_huggingface_sentiment_score(text: str, model: str | None = None) -> float | None:
    data = _hf_request(
        model or HF_SENTIMENT_MODEL,
        {"inputs": text},
    )
    if data is None:
        return None

    candidates = []
    if isinstance(data, list):
        for item in data:
            if isinstance(item, dict) and "label" in item and "score" in item:
                candidates.append(item)
    elif isinstance(data, dict) and "label" in data and "score" in data:
        candidates.append(data)

    if not candidates:
        return None

    label_scores = {item["label"].lower(): float(item["score"]) for item in candidates}
    positive = label_scores.get("positive", 0.0)
    negative = label_scores.get("negative", 0.0)
    neutral = label_scores.get("neutral", 0.0)

    if positive == 0.0 and negative == 0.0 and neutral == 0.0:
        best = max(candidates, key=lambda item: float(item["score"]))
        label = str(best["label"]).lower()
        if "pos" in label:
            return 0.7
        if "neg" in label:
            return -0.7
        return 0.0

    return max(-1.0, min(1.0, positive - negative + (neutral * 0.1)))


def call_huggingface_inference(model: str, inputs: str) -> str:
    data = _hf_request(model, {"inputs": inputs})
    if data is None:
        return "(HuggingFace key missing)" + inputs[:200]

    # Model outputs can vary; try to extract text
    if isinstance(data, dict) and "error" in data:
        return f"(HF error) {data['error']}"
    if isinstance(data, list):
        first = data[0]
        if isinstance(first, dict) and "generated_text" in first:
            return first["generated_text"]
        if isinstance(first, str):
            return first
    if isinstance(data, dict) and "generated_text" in data:
        return data["generated_text"]
    return str(data)
