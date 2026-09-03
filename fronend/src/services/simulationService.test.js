import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import {
  loadSimulationResult,
  runSimulation,
  saveSimulationResult,
  SIMULATION_RESULT_STORAGE_KEY,
} from './simulationService';


describe('simulationService', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();

    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });


  it('normalizes the multi-agent backend response', async () => {
    const backendResponse = {
      simulation_id: 'sim-001',

      concept: 'AI Study Assistant',

      audience: 'GEN_Z',

      audience_label: 'University Students',

      backlash_probability: 18,

      sentiment_score: 72,

      summary: {
        total_events: 20,
      },

      reactions: [
        {
          id: 'reaction-1',
          personaName: 'Student A',
          sentiment: 'positive',
          tone: 'optimistic',
          postContent: 'This looks useful.',
        },
      ],

      heatmap_matrix: [
        {
          segment: 'Students',
          days: [
            {
              day: 1,
              score: 0.8,
            },
          ],
        },
      ],

      agent_status: {
        ollama: 'active',
        huggingface: 'active',
        groq: 'active',
      },
    };


    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,

        json: vi
          .fn()
          .mockResolvedValue(backendResponse),
      })
    );


    const result = await runSimulation(
      'AI Study Assistant',
      'GEN_Z'
    );


    expect(result.simulation_id).toBe(
      'sim-001'
    );

    expect(result.concept).toBe(
      'AI Study Assistant'
    );

    expect(result.audienceType).toBe(
      'University Students'
    );

    expect(result.backlashProbability).toBe(
      18
    );

    expect(result.sentimentScore).toBe(
      72
    );

    expect(result.heatmapMatrix).toEqual(
      backendResponse.heatmap_matrix
    );

    expect(result.agentStatus).toEqual({
      ollama: 'active',
      huggingface: 'active',
      groq: 'active',
    });
  });


  it('sends simulation settings to the backend', async () => {
    localStorage.setItem(
      'simulationFidelity',
      '75'
    );

    localStorage.setItem(
      'focusGroup',
      'international'
    );


    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,

        json: vi.fn().mockResolvedValue({
          concept: 'Test Concept',
          audience: 'GEN_Z',

          agent_status: {
            ollama: 'active',
            huggingface: 'active',
            groq: 'active',
          },
        }),
      })
    );


    await runSimulation(
      'Test Concept',
      'GEN_Z'
    );


    expect(fetch).toHaveBeenCalledTimes(1);


    const [, options] =
      fetch.mock.calls[0];


    expect(options.method).toBe('POST');


    expect(
      JSON.parse(options.body)
    ).toEqual({
      concept: 'Test Concept',
      audience: 'GEN_Z',
      fidelity: 75,
      focus_group: 'international',
    });
  });


  it('saves and loads simulation results', () => {
    const result = {
      simulationId: 'sim-002',

      concept: 'Test Simulation',

      agentStatus: {
        ollama: 'active',
        huggingface: 'active',
        groq: 'active',
      },
    };


    saveSimulationResult(result);


    expect(
      loadSimulationResult()
    ).toEqual(result);
  });


  it('returns null when no stored result exists', () => {
    expect(
      loadSimulationResult()
    ).toBeNull();
  });


  it('returns null for invalid stored JSON', () => {
    localStorage.setItem(
      SIMULATION_RESULT_STORAGE_KEY,
      '{invalid-json'
    );


    expect(
      loadSimulationResult()
    ).toBeNull();
  });


  it('throws when the backend returns an error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,

        status: 500,

        text: vi
          .fn()
          .mockResolvedValue(
            'Internal Server Error'
          ),
      })
    );


    await expect(
      runSimulation(
        'Broken Simulation',
        'GEN_Z'
      )
    ).rejects.toThrow('API error: 500');
  });
});
