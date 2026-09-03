import hashlib
from app.services.external_llm import call_huggingface_generation


def _clamp(value, minimum=-1.0, maximum=1.0):
        return max(minimum, min(maximum, value))


def _fallback_reaction(persona, concept, day):
    trait_values = list(persona.traits.values()) if persona.traits else []
    trait_bias = sum(trait_values) / len(trait_values) if trait_values else 0.5

    seed = hashlib.sha256(f"{persona.demographic}|{concept}|{day}".encode("utf-8")).hexdigest()
    noise = (int(seed[:8], 16) / 0xFFFFFFFF) - 0.5
    sentiment_score = _clamp(((trait_bias - 0.5) * 1.4) + (noise * 0.9))
    sentiment_score = round(sentiment_score, 2)

    if sentiment_score > 0.2:
        stance = "supportive"
        reaction = "sees the idea as practical and worth trying"
    elif sentiment_score < -0.2:
        stance = "concerned"
        reaction = "worries the message may create confusion or resistance"
    else:
        stance = "mixed"
        reaction = "is undecided and wants clearer context before reacting"

    concept_excerpt = concept.strip().replace("\n", " ")[:120]
    return (
        f"Reaction: {persona.demographic} is {stance} about day {day}. "
        f"Post: {reaction} regarding \"{concept_excerpt}\". "
        f"Sentiment score: {sentiment_score}"
    )

def generate_persona_reaction(persona, concept, day, use_llm=True):
    if not use_llm:
        return _fallback_reaction(persona, concept, day)

    concept_excerpt = concept.strip().replace("\n", " ")[:140]
    prompt = (
        f"You are a synthetic audience member.\n"
        f"Persona: {persona.demographic}\n"
        f"Traits: {persona.traits}\n"
        f"Day: {day}\n"
        f"Concept: {concept_excerpt}\n\n"
        "Write a short social post reacting to the concept. Keep it to 1-2 sentences. "
        "Do not mention that you are an AI. Focus on tone, trust, and likely public response."
    )

    ai_reaction = call_huggingface_generation(prompt, max_new_tokens=120)
    if ai_reaction and not str(ai_reaction).startswith("("):
        return ai_reaction.strip()

    return _fallback_reaction(persona, concept, day)
