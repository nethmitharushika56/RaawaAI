# RaawaAI

RaawaAI is a Digital Laboratory for stress-testing products, laws, and policies against a synthetic global public, predicting human resonance and brand backlash before launching. It features a FastAPI backend with a persistent SQLite database and a React frontend built with Vite.

## Key Features & Visual Architecture
- **Interactive Sentiment Heatmap**: Renders daily sentiment grids with visual intensity mapping (RGB gradients from Red for Negative to Emerald Green for Positive) and detailed hover tooltips.
- **Persistent SQLite Database Layer**: Integrates a persistent local database (`backend/raawa.db`) to store users, profiles, organizations, simulations, and reviews. If AWS credentials are not configured, this database acts as the active storage, replacing volatile in-memory fallback collections.
- **Security & Authorization Guard**: Implements secure user registration and login endpoints, salted SHA-256 password hashing, and active session tokens validating the `Authorization: Bearer <token>` header across all protected backend API routes.
- **Dynamic Visual Background**: Features high-performance color-shifting floating glow orbs and a digital dot matrix grid pattern with fluid continuous float animations.
- **Interactive Profile Pictures**: Implements a profile image upload, crop, resize (Canvas-based to 256x256), and remove capability stored locally and synchronized with the SQLite database.

## Repository Structure

- `backend/` — Python backend (FastAPI, SQLite, LLM Multi-agent Engine)
- `fronend/` — Vite + React frontend (Dashboard, Simulation Window, Persona Configuration)
- `scripts/` — Dev server automation runners

## Prerequisites

- Python 3.10+
- Node.js 16+ and npm

## Getting Started (Run Locally)

You can launch both the React frontend and the FastAPI backend concurrently using the root dev runner:

1. Clone the repository and navigate to the project directory:
   ```bash
   cd RaawaAI
   ```
2. Install npm packages in the root directory:
   ```bash
   npm install
   ```
3. Run the development environment:
   ```bash
   npm run dev
   ```
   This will automatically detect your python environment, initialize the SQLite database, and launch:
   - **Frontend**: http://localhost:3000
   - **Backend**: http://127.0.0.1:9000

## Backend Setup & Testing

If you want to manage or test the backend independently:

1. Set up the virtual environment:
   ```bash
   cd backend
   python -m venv .venv
   .\.venv\Scripts\activate
   pip install -r requirements.txt
   ```
2. Run the test suite:
   ```bash
   pytest
   ```

See [backend/README.md](file:///c:/Users/gamag/OneDrive/Desktop/My%20projects/RaawaAI/backend/README.md) for details on AWS DynamoDB configurations and environment variables.
