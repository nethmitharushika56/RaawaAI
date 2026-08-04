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


@router.get("/simulation/{simulation_id}/report")
def get_report_endpoint(simulation_id: str):
    """Retrieve report for a simulation"""
    from app.services.dynamodb_service import get_report, save_report
    
    report = get_report(simulation_id)
    if report:
        return report
        
    # Fallback: If simulation exists but report doesn't, create a default report
    from app.services.dynamodb_service import get_simulation
    sim = get_simulation(simulation_id)
    if sim:
        concept = sim.get("concept", "Concept")
        audience = sim.get("audience", "general")
        backlash = sim.get("backlash_score", 0)
        
        # Try to extract sentiment score from metadata
        meta = sim.get("metadata") or {}
        sentiment = meta.get("sentiment_score", 50)
        
        report_data = {
            "title": f"Simulation Report: {concept}",
            "date": datetime.now(timezone.utc).strftime('%Y-%m-%d'),
            "executiveSummary": f"This report details the pilot reception for the concept '{concept}' targeting {audience}. Based on the simulation, the backlash risk is {backlash}% and the sentiment score is {sentiment}/100.",
            "riskAnalysis": f"The risk analysis flags potential concerns from skeptical user groups, centered on economic elitism and communication clarity.",
            "demographicImpact": f"The demographic profile ({audience}) shows varied opinions. Early-adopters react positively, while socially-conscious consumers remain cautious.",
            "strategicRecommendations": [
                "Clarify the key message to reduce ambiguity.",
                "Review pricing and positioning to increase inclusivity.",
                "Verify key local supplier collaborations to build trust.",
                "Monitor feedback feeds during early testing phases."
            ],
            "conclusion": "The concept shows testable potential, but adjusting the tone and addressing supply chain transparency is recommended.",
            "content": f"Automated strategic report generated for simulation {simulation_id}",
            "metadata": {"simulation_id": simulation_id, "concept": concept, "audience": audience}
        }
        try:
            save_report(simulation_id, report_data)
            return report_data
        except Exception:
            return report_data
            
    return {"error": "Report and simulation not found"}


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
    audience = req.audience if isinstance(req.audience, dict) else {"demographics": [req.audience or "General"]}
    
    # Process Regional Focus Groups setting
    focus_group = (req.focus_group or 'local').lower()
    if focus_group == 'global':
        audience["regions"] = ["United States", "United Kingdom", "Germany", "Japan", "Sri Lanka"]
    elif focus_group == 'asia':
        audience["regions"] = ["India", "Singapore", "Japan", "Sri Lanka"]
    else:  # local
        audience["regions"] = ["Sri Lanka"]

    # Process Simulation Fidelity setting (map 0-100 to days: 10-30 and sampling: 3-10)
    fidelity = req.fidelity if req.fidelity is not None else 50
    days = int(10 + (fidelity / 100.0) * 20)
    sampling = int(3 + (fidelity / 100.0) * 7)

    result = run_simulation(req.concept, audience, days=days, sampling=sampling)
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

    # Automatically generate and save a strategic report with recommendations
    try:
        from app.services.dynamodb_service import save_report
        report_data = {
            "title": f"Simulation Report: {req.concept}",
            "date": datetime.now(timezone.utc).strftime('%Y-%m-%d'),
            "executiveSummary": f"The simulation indicates a {result.get('backlash_probability', 0)}% backlash risk for {audience_label}. The overall sentiment score stands at {result.get('sentiment_score', 0)}/100, with reactions concentrated around tone, delivery, and socioeconomic accessibility.",
            "riskAnalysis": f"Friction markers indicate primary resistance from skeptical and price-sensitive groups. Sourcing transparency and pricing tiers present the highest reputational risk, potentially alienating the key target audience.",
            "demographicImpact": f"Analysis of the targeted demographic profile ({audience_label}) indicates structured divergence. While tech-friendly and early-adopter subsegments react positively to modern conveniences, value-driven subsegments express concerns about economic exclusivity.",
            "strategicRecommendations": [
                "Refine core concept language to highlight local sourcing and ethical partnerships.",
                "Introduce value-oriented packaging options or student tiers to counter exclusion perceptions.",
                "Address supply chain and ingredient provenance details proactively before launch.",
                "Roll out concept in monitored phases, tracking real-time public sentiment indicators."
            ],
            "conclusion": f"The concept shows high aesthetic appeal and digital resonance. Pivoting marketing from exclusive luxury to local inclusivity will help neutralize backlash threats and secure long-term adoption.",
            "content": f"Automated strategic report for concept '{req.concept}' targeting {audience_label}.",
            "metadata": {"simulation_id": simulation_id, "concept": req.concept, "audience": audience_label}
        }
        save_report(simulation_id, report_data)
    except Exception as re:
        print(f"Warning: Could not auto-generate report: {re}")

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
