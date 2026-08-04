# Backend Setup

This backend includes DynamoDB wiring through `app/services/dynamodb_service.py` as well as a local SQLite database fallback for zero-configuration persistent storage.

It supports two primary database modes:
- **AWS DynamoDB** (using `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in `.env`)
- **SQLite Database** (stored at `raawa.db` inside the backend directory, used automatically if DynamoDB is unconfigured)

## Environment Variables

Copy `.env.example` to `.env` and fill in the values:

- `AWS_REGION` - AWS region for the table (e.g. `ap-south-1`)
- `DYNAMODB_TABLE` - DynamoDB table name (defaults to `raawa-simulations`)
- `DYNAMODB_ENDPOINT` - local endpoint (e.g. `http://localhost:8000`)
- `AWS_ACCESS_KEY_ID` - AWS access key for DynamoDB in AWS
- `AWS_SECRET_ACCESS_KEY` - AWS secret key for DynamoDB in AWS
- `OPENAI_API_KEY` - used by the LLM service layer

## SQLite Persistent Database Fallback
- When boto3/AWS credentials are not configured, the backend automatically stores all models (Simulations, Refinements, Reports, Users, Organizations, Profiles, and Reviews) inside a local SQLite database (`backend/raawa.db`).
- This guarantees data is not lost on uvicorn server reloads.

## Security & JWT Bearer Authentication
- **Hashing**: User passwords are saved with cryptographically secure, random 16-byte salts and SHA-256 hashes.
- **Authorization Guard**: The FastAPI router uses `Depends(get_current_user_email)` to enforce token authentication. 
- All protected API requests must include the header:
  `Authorization: Bearer <session_token>`

## Running and Testing the Backend Independently

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Start the backend:
   ```bash
   uvicorn app.main:app --reload --port 8001
   ```
3. Run the automated test suite:
   ```bash
   pytest
   ```

## Docker Compose

To run the backend with a local DynamoDB instance:

1. Copy `backend/.env.example` to `backend/.env` and fill in any needed values.
2. Start the stack from the repository root:
   ```bash
   docker compose up --build
   ```

The backend will be available on `http://localhost:8000` and DynamoDB Local will be exposed on `http://localhost:8001`.
