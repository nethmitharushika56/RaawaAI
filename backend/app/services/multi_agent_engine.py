import math
import random
from collections import defaultdict
from statistics import mean, stdev
from app.services.persona_engine import simulate_day
from app.services.external_llm import call_huggingface_generation
from app.models.persona import Persona


def build_personas_from_audience(audience_spec: dict) -> list:
    # audience_spec can include regions and demographic targets
    regions = audience_spec.get("regions", ["Sri Lanka"])
    demographics = audience_spec.get("demographics", ["General"])

    personas = []
    for region in regions:
        for demo in demographics:
            pid = f"{region}-{demo}-{random.randint(1000,9999)}"
            traits = {
                "openness": random.uniform(0.2, 0.8),
                "trust_in_institutions": random.uniform(0.2, 0.9),
            }
            influence = random.uniform(0.3, 0.95)
            personas.append(Persona(persona_id=pid, demographic=f"{demo} ({region})", traits=traits, influence=influence))

    return personas


def _region_from_demographic(demographic: str) -> str:
    if "(" in demographic and ")" in demographic:
        return demographic.split("(")[-1].rstrip(") ")
    return "Unknown"


def _fallback_comment(prompt: str, persona_label: str, score: float) -> str:
    if score > 0.2:
        tone = "supportive"
    elif score < -0.2:
        tone = "critical"
    else:
        tone = "mixed"
    return f"{persona_label} is {tone} and suggests clearer context before launch. #resonance"


def run_simulation(concept: str, audience: dict, days: int =30, sampling=10, use_external_generation=True):
    personas = build_personas_from_audience(audience)

    all_events = []
    per_region = defaultdict(list)
    per_demo = defaultdict(list)
    region_day_scores = defaultdict(lambda: defaultdict(list))
    day_scores = defaultdict(list)

    for day in range(1, days + 1):
        day_events = simulate_day(personas, concept, day, use_llm=False)
        all_events.extend(day_events)
        for ev in day_events:
            # sentiment
            s = float(ev.get("sentiment", 0.0))
            # map to region/demo heuristics from persona_id
            persona_label = next((p.demographic for p in personas if p.persona_id == ev.get("persona_id")), "Unknown")
            region = _region_from_demographic(persona_label)

            per_region[region].append(s)
            per_demo[persona_label].append(s)
            region_day_scores[region][day].append(s)
            day_scores[day].append(s)

    # Heatmap data: average and volatility
    heatmap = {}
    for region, vals in per_region.items():
        avg = mean(vals) if vals else 0.0
        vol = stdev(vals) if len(vals) > 1 else 0.0
        heatmap[region] = {"average": round(avg, 3), "volatility": round(vol, 3), "count": len(vals)}

    heatmap_matrix = []
    for region in sorted(region_day_scores.keys()):
        day_rows = []
        for day in range(1, days + 1):
            values = region_day_scores[region].get(day, [])
            score = mean(values) if values else 0.0
            day_rows.append({
                "day": day,
                "score": round(score, 3),
                "count": len(values),
                "intensity": round(max(0, min(100, (score + 1) * 50))),
            })
        heatmap_matrix.append({
            "region": region,
            "average": heatmap.get(region, {}).get("average", 0.0),
            "volatility": heatmap.get(region, {}).get("volatility", 0.0),
            "days": day_rows,
        })

    # Backlash probability: weighted by negative mass and volatility
    negative_mass = sum(1 for e in all_events if float(e.get("sentiment", 0.0)) < -0.2)
    negative_ratio = negative_mass / max(1, len(all_events))
    avg_vol = mean([v["volatility"] for v in heatmap.values()]) if heatmap else 0.0
    overall_sentiment = mean([float(e.get("sentiment", 0.0)) for e in all_events]) if all_events else 0.0
    backlash_probability = int(max(0, min(100, round((negative_ratio * 0.7 + avg_vol * 0.3) * 100))))
    sentiment_score = int(max(-100, min(100, round(overall_sentiment * 100))))

    # Simulated social feed: sample posts + synthetic comments/hashtags using LLMs
    sample_posts = []
    sampled = random.sample(all_events, min(sampling, len(all_events))) if all_events else []
    for ev in sampled:
        persona_label = next((p.demographic for p in personas if p.persona_id == ev.get("persona_id")), "Persona")
        post_text = ev.get("post")
        prompt = (
            f"Generate 3 short comments with hashtags replying to this post from diverse viewpoints.\n"
            f"Post: {post_text}\n"
            f"Persona: {persona_label}\n"
            "Return only the comments."
        )
        comments = call_huggingface_generation(prompt, max_new_tokens=120) if use_external_generation else None
        if not comments or str(comments).startswith("("):
            comments = _fallback_comment(prompt, persona_label, float(ev.get("sentiment", 0.0)))

        sample_posts.append({
            "id": ev.get("event_id"),
            "persona": persona_label,
            "post": post_text,
            "sentiment": ev.get("sentiment"),
            "comments": comments,
        })

    # Backlash KPI as 0-100 already

    # Policy refinement uses the Hugging Face generation provider.
    refinement_prompt = (
        f"The following policy text should be refined to reduce public backlash while preserving intent.\nPolicy:\n{concept}\n\n"
        "Suggest a revised short version (one paragraph) and 3 specific mitigation talking points."
    )
    refinement = call_huggingface_generation(refinement_prompt, max_new_tokens=220) if use_external_generation else None
    if not refinement or str(refinement).startswith("("):
        refinement = "Simplify language, reduce absolute claims, add benefits and safeguards."

    return {
        "heatmap": heatmap,
        "heatmap_matrix": heatmap_matrix,
        "backlash_probability": backlash_probability,
        "sentiment_score": sentiment_score,
        "sample_posts": sample_posts,
        "refinement": refinement,
        "summary": {
            "total_events": len(all_events),
            "negative_ratio": round(negative_ratio, 3),
            "avg_volatility": round(avg_vol, 3),
            "average_sentiment": round(overall_sentiment, 3),
        }
    }
