import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import SimulationResultWindow from './SimulationResultWindow';
import { SIMULATION_RESULT_STORAGE_KEY } from '../services/simulationService';

vi.mock('../utils/simulationResultPdf', () => ({
  downloadSimulationResultPdf: vi.fn(),
}));

const createResult = (agentStatus = {}) => ({
  simulation_id: 'sim-ui-001',
  concept: 'AI Study Assistant',
  audience: 'GEN_Z',
  audienceType: 'University Students',

  backlashProbability: 18,
  sentimentScore: 72,

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

  heatmapMatrix: [],

  agentStatus,
});

const storeResult = (result) => {
  localStorage.setItem(
    SIMULATION_RESULT_STORAGE_KEY,
    JSON.stringify(result)
  );
};

describe('SimulationResultWindow', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows waiting state when no simulation result exists', () => {
    render(<SimulationResultWindow />);

    expect(
      screen.getByText('Waiting for simulation output')
    ).toBeInTheDocument();

    expect(
      screen.getByText(
        /run a simulation first/i
      )
    ).toBeInTheDocument();
  });

  it('renders the three AI agents', () => {
    storeResult(
      createResult({
        ollama: 'active',
        huggingface: 'active',
        groq: 'active',
      })
    );

    render(<SimulationResultWindow />);

    expect(
      screen.getByText('Ollama')
    ).toBeInTheDocument();

    expect(
      screen.getByText('Hugging Face')
    ).toBeInTheDocument();

    expect(
      screen.getByText('Groq')
    ).toBeInTheDocument();
  });

  it('renders the correct role for each AI agent', () => {
    storeResult(
      createResult({
        ollama: 'active',
        huggingface: 'active',
        groq: 'active',
      })
    );

    render(<SimulationResultWindow />);

    expect(
      screen.getByText('Audience Simulation')
    ).toBeInTheDocument();

    expect(
      screen.getByText('Sentiment Analysis')
    ).toBeInTheDocument();

    expect(
      screen.getByText('Strategic Analysis')
    ).toBeInTheDocument();
  });

  it('shows active status for all active agents', () => {
    storeResult(
      createResult({
        ollama: 'active',
        huggingface: 'active',
        groq: 'active',
      })
    );

    render(<SimulationResultWindow />);

    expect(
      screen.getAllByText('active')
    ).toHaveLength(3);
  });

  it('shows fallback status', () => {
    storeResult(
      createResult({
        ollama: 'active',
        huggingface: 'fallback',
        groq: 'active',
      })
    );

    render(<SimulationResultWindow />);

    expect(
      screen.getByText('fallback')
    ).toBeInTheDocument();

    expect(
      screen.getAllByText('active')
    ).toHaveLength(2);
  });

  it('shows unknown when an agent status is missing', () => {
    storeResult(
      createResult({
        ollama: 'active',
        huggingface: 'active',
      })
    );

    render(<SimulationResultWindow />);

    expect(
      screen.getByText('unknown')
    ).toBeInTheDocument();
  });

  it('supports object-based agent status', () => {
    storeResult(
      createResult({
        ollama: {
          status: 'active',
        },

        huggingface: {
          status: 'fallback',
        },

        groq: {
          status: 'active',
        },
      })
    );

    render(<SimulationResultWindow />);

    expect(
      screen.getAllByText('active')
    ).toHaveLength(2);

    expect(
      screen.getByText('fallback')
    ).toBeInTheDocument();
  });

  it('renders simulation metrics', () => {
    storeResult(
      createResult({
        ollama: 'active',
        huggingface: 'active',
        groq: 'active',
      })
    );

    render(<SimulationResultWindow />);

    expect(
      screen.getByText('18%')
    ).toBeInTheDocument();

    expect(
      screen.getByText('+72')
    ).toBeInTheDocument();

    expect(
      screen.getByText('20')
    ).toBeInTheDocument();
  });
});