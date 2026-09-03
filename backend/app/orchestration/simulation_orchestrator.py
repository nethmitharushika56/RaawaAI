from app.providers.groq_provider import generate_strategy
from app.providers.ollama_provider import generate as generate_local
from app.providers.huggingface_provider import score_sentiment
from app.services.multi_agent_engine import run_simulation as run_baseline_simulation


def run_multi_agent_simulation(concept: str, audience: dict, days: int = 30, sampling: int = 10) -> dict:
    """Coordinate local audience simulation, HF scoring, and Groq strategy analysis."""
    result = run_baseline_simulation(
        concept,
        audience,
        days=days,
        sampling=sampling,
        use_external_generation=False,
    )
    agent_status = {"ollama": "fallback", "huggingface": "fallback", "groq": "fallback"}

    audience_prompt = (
        "Simulate three concise public reactions to this concept. Return only the reactions, "
        f"one per line. Audience: {audience}. Concept: {concept}"
    )
    local_reactions = generate_local(audience_prompt)
    if local_reactions:
        agent_status["ollama"] = "active"
        result["audience_agent_output"] = local_reactions

    score_text = " ".join(
        post.get("post", "") for post in result.get("sample_posts", [])
    )
    hf_score = score_sentiment(score_text) if score_text else None
    if hf_score is not None:
        agent_status["huggingface"] = "active"
        result["sentiment_agent_score"] = round(hf_score, 3)

    strategy_prompt = (
        "Provide a concise strategic risk analysis and three recommendations for this concept. "
        f"Concept: {concept}. Audience: {audience}. "
        f"Simulation summary: {result.get('summary', {})}."
    )
    strategy = generate_strategy(strategy_prompt)
    if strategy:
        agent_status["groq"] = "active"
        result["strategy_agent_output"] = strategy

    result["agent_status"] = agent_status
    return result
