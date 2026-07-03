// Backend API Service
const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
const API_BASE_URL = rawApiBaseUrl.endsWith('/api') ? rawApiBaseUrl : `${rawApiBaseUrl}/api`;
export const SIMULATION_RESULT_STORAGE_KEY = 'latestSimulationResult';

const sentimentFromBacklash = (backlashProbability) => {
  const normalized = Number(backlashProbability) || 0;
  return Math.round((50 - normalized) * 2);
};

const normalizeReaction = (reaction, concept, index) => ({
  id: reaction.id || `reaction-${index}`,
  personaName: reaction.personaName || `Persona ${index + 1}`,
  sentiment: reaction.sentiment || 'neutral',
  tone: reaction.tone || 'analytical',
  postContent: reaction.postContent || reaction.post || `Response to ${concept}`,
  influenceWeight: reaction.influenceWeight ?? 0.5,
});

const normalizeAudienceLabel = (audience) => {
  if (typeof audience === 'string') return audience;
  if (audience && typeof audience === 'object') {
    return audience.label || audience.type || audience.demographics?.[0] || 'General';
  }
  return 'General';
};

export const runSimulation = async (concept, audience) => {
  try {
    const response = await fetch(`${API_BASE_URL}/simulation/multi_start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        concept: concept,
        audience: audience || 'GEN_Z'
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    const backlashProbability = Number(data.backlash_probability ?? data.backlash_score ?? 0);
    const sentimentScore = Number(data.sentiment_score ?? data.sentimentScore ?? sentimentFromBacklash(backlashProbability));
    const reactions = (data.reactions || data.sample_posts || []).map((reaction, idx) =>
      normalizeReaction(reaction, data.concept, idx)
    );
    const summaryDetails = data.summary || {};
    const summaryText = typeof summaryDetails === 'string'
      ? summaryDetails
      : `Simulation results for "${data.concept}" targeting ${normalizeAudienceLabel(data.audience)}. Backlash probability: ${backlashProbability}%`;

    return {
      ...data,
      summary: summaryText,
      summaryDetails,
      audienceType: normalizeAudienceLabel(data.audience_label || data.audience),
      backlashProbability,
      sentimentScore,
      reactions,
      heatmapMatrix: data.heatmap_matrix || data.heatmapMatrix || [],
    };
  } catch (error) {
    console.error('Simulation failed:', error);
    throw error;
  }
};

export const refinePolicy = async (concept, summary) => {
  try {
    // Extract simulation ID from context if available
    const simulationId = sessionStorage.getItem('currentSimulationId') || 'default';
    
    const response = await fetch(`${API_BASE_URL}/simulation/${simulationId}/refine`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        policy: concept,
        summary: summary
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      policy: data.improvedConcept || data.policy || `Refined policy based on: ${concept}`,
      improvedConcept: data.improvedConcept || data.policy || `Refined policy based on: ${concept}`,
      reasoning: data.reasoning || data.recommendations || 'Implement changes in phases: Plan, Test, Deploy, Monitor',
      recommendations: data.recommendations || 'Implement changes in phases: Plan, Test, Deploy, Monitor'
    };
  } catch (error) {
    console.error('Policy refinement failed:', error);
    throw error;
  }
};

export const generateReport = async (result) => {
  try {
    const simulationId = sessionStorage.getItem('currentSimulationId') || result.simulation_id || 'default';
    
    const response = await fetch(`${API_BASE_URL}/simulation/${simulationId}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        concept: result.concept,
        audience: result.audienceType || result.audience
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    
    return {
      title: data.title || `Simulation Report: ${result.concept}`,
      date: data.date,
      executiveSummary: data.executiveSummary || `Comprehensive report for simulation analyzing "${result.concept}"`,
      riskAnalysis: data.riskAnalysis,
      demographicImpact: data.demographicImpact,
      strategicRecommendations: data.strategicRecommendations || [],
      conclusion: data.conclusion,
      content: data.content || `Comprehensive report for simulation analyzing "${result.concept}"`,
      metadata: {
        generatedAt: new Date().toISOString(),
        simulationId: simulationId,
        audience: result.audienceType
      }
    };
  } catch (error) {
    console.error('Report generation failed:', error);
    throw error;
  }
};

export const saveSimulationId = (simulationId) => {
  sessionStorage.setItem('currentSimulationId', simulationId);
};

export const saveSimulationResult = (result) => {
  localStorage.setItem(SIMULATION_RESULT_STORAGE_KEY, JSON.stringify(result));
};

export const loadSimulationResult = () => {
  const raw = localStorage.getItem(SIMULATION_RESULT_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};
