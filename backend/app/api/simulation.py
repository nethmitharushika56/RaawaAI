from fastapi import APIRouter
import uuid
from datetime import datetime, timezone

from app.models.simulation import SimulationRequest
from app.models.persona import Persona
from app.services.persona_engine import simulate_day
from app.services.multi_agent_engine import run_simulation
from app.services.dynamodb_service import save_simulation, save_refinement, save_report
from app.services.sentiment import extract_sentiment

router = APIRouter()


def _sentiment_label(score: float) -> str:
    if score > 0.2:
        return "positive"
    if score < -0.2:
        return "negative"
    return "neutral"


def _tone_for(score: float) -> str:
    if score > 0.35:
        return "advocating"
    if score < -0.35:
        return "critical"
    return "analytical"


def _audience_label(audience):
    if isinstance(audience, str):
        return audience
    if isinstance(audience, dict):
        return audience.get("type", "general")
    return "general"

@router.post("/simulation/start")
def start_simulation(req: SimulationRequest):
    simulation_id = str(uuid.uuid4())
    
    personas = [
        Persona(
            persona_id=str(uuid.uuid4()),
            demographic="Sri Lankan Gen-Z Urban",
            traits={"skeptical": 0.8, "tech_friendly": 0.6},
            influence=0.9
        ),
        Persona(
            persona_id=str(uuid.uuid4()),
            demographic="Rural Farmers",
            traits={"tradition": 0.9, "risk_averse": 0.8},
            influence=0.6
        )
    ]

    all_events = []

    for day in range(1, 31):
        all_events.extend(simulate_day(personas, req.concept, day))

    avg_sentiment = sum(float(e["sentiment"]) for e in all_events) / len(all_events)
    sentiment_score = max(-100, min(100, int(round(avg_sentiment * 100))))
    backlash_probability = max(0, min(100, int(round(((1 - avg_sentiment) / 2) * 100))))
    
    persona_lookup = {persona.persona_id: persona for persona in personas}
    reactions = []
    for event in all_events[:4]:
        persona = persona_lookup.get(event["persona_id"])
        score = float(event["sentiment"])
        reactions.append({
            "id": event["event_id"],
            "personaName": persona.demographic if persona else "Persona",
            "postContent": event["post"],
            "sentiment": _sentiment_label(score),
            "tone": _tone_for(score),
            "influenceWeight": persona.influence if persona else 0.5,
        })

    summary = (
        f"Simulation indicates a {backlash_probability}% backlash risk for {_audience_label(req.audience)}. "
        f"Average sentiment is {sentiment_score}/100, with the strongest reactions clustering around tone and clarity."
    )

    # Save to DynamoDB
    audience_type = _audience_label(req.audience)
    try:
        save_simulation(
            simulation_id=simulation_id,
            concept=req.concept,
            audience=audience_type,
            backlash_score=backlash_probability,
            sample_posts=reactions,
            metadata={
                "summary": summary,
                "sentiment_score": sentiment_score,
                "backlash_probability": backlash_probability,
            }
        )
    except Exception as e:
        print(f"Warning: Could not save to DynamoDB: {e}")

    return {
        "simulation_id": simulation_id,
        "concept": req.concept,
        "audience": audience_type,
        "sentiment_score": sentiment_score,
        "backlash_probability": backlash_probability,
        "summary": summary,
        "sample_posts": reactions,
        "reactions": reactions,
        "created_at": datetime.now(timezone.utc).isoformat()
    }


@router.post("/simulation/{simulation_id}/refine")
def refine_simulation(simulation_id: str, refinement_input: dict):
    """Refine simulation results"""
    policy = refinement_input.get("policy", f"Refined policy based on simulation {simulation_id}")
    refinement_data = {
        "policy": policy,
        "improvedConcept": policy,
        "reasoning": "The wording is simplified to reduce ambiguity while preserving the original intent.",
        "recommendations": "Implement changes in phases: Plan, Test, Deploy, Monitor",
        "metadata": {"simulation_id": simulation_id}
    }
    
    try:
        save_refinement(simulation_id, refinement_data)
    except Exception as e:
        print(f"Warning: Could not save refinement to DynamoDB: {e}")
    
    return refinement_data


@router.post("/simulation/{simulation_id}/report")
def generate_report_endpoint(simulation_id: str, report_input: dict):
    """Generate report for simulation"""
    concept = report_input.get('concept', 'RaawaAI Analysis')
    audience = report_input.get('audience', 'general')
    report_data = {
        "title": "Simulation Report",
        "date": datetime.now(timezone.utc).strftime('%Y-%m-%d'),
        "executiveSummary": f"The simulation shows how {audience} may react to the proposed concept.",
        "riskAnalysis": f"Backlash signals are derived from persona reactions in simulation {simulation_id}.",
        "demographicImpact": f"Audience segmentation highlights differing responses across the selected demographic profile.",
        "strategicRecommendations": [
            "Clarify the message before launch.",
            "Test the revised wording with a narrower audience.",
            "Monitor sentiment during early rollout phases.",
        ],
        "conclusion": "The concept is testable, but wording and framing should be refined before release.",
        "content": f"Comprehensive analysis based on simulation {simulation_id}",
        "metadata": {"simulation_id": simulation_id, "concept": concept, "audience": audience}
    }
    
    try:
        save_report(simulation_id, report_data)
    except Exception as e:
        print(f"Warning: Could not save report to DynamoDB: {e}")
    
    return report_data


@router.get("/simulation/{simulation_id}")
def get_simulation_result(simulation_id: str):
    """Get simulation results from DynamoDB"""
    from app.services.dynamodb_service import get_simulation
    
    result = get_simulation(simulation_id)
    if result:
        return result
    return {"error": "Simulation not found"}


@router.get("/simulations")
def list_simulations():
    """List all simulations"""
    from app.services.dynamodb_service import get_all_simulations
    
    simulations = get_all_simulations()
    return {"simulations": simulations, "count": len(simulations)}


@router.post("/simulation/multi_start")
def start_multi_simulation(req: SimulationRequest):
    """Run a richer multi-agent simulation using LLMs and aggregation logic."""
    audience = req.audience if isinstance(req.audience, dict) else {"demographics": [req.audience or "General"], "regions": ["Sri Lanka"]}
    result = run_simulation(req.concept, audience, days=30, sampling=6)
    audience_label = _audience_label(req.audience)

    # Persist summary similar to existing endpoint
    summary = result.get("summary", {})
    simulation_id = str(uuid.uuid4())
    try:
        save_simulation(
            simulation_id=simulation_id,
            concept=req.concept,
            audience=audience,
            backlash_score=result.get("backlash_probability", 0),
            sample_posts=result.get("sample_posts", []),
            metadata={
                "summary": summary,
                "heatmap": result.get("heatmap"),
            }
        )
    except Exception as e:
        print(f"Warning: Could not save multi simulation: {e}")

    return {
        "simulation_id": simulation_id,
        "concept": req.concept,
        "audience": audience,
        "audience_label": audience_label,
        "summary": summary,
        "sentiment_score": result.get("sentiment_score"),
        "backlash_probability": result.get("backlash_probability"),
        "heatmap": result.get("heatmap"),
        "heatmap_matrix": result.get("heatmap_matrix"),
        "sample_posts": result.get("sample_posts"),
        "reactions": result.get("sample_posts"),
        "refinement": result.get("refinement"),
    }
