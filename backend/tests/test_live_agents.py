"""
LIVE integration tests for the RaawaAI multi-agent system.

Tests:
1. Environment configuration
2. Ollama connectivity
3. Hugging Face connectivity
4. Groq connectivity
5. DynamoDB connectivity
6. Full multi-agent endpoint
7. Ensures agents are actually active instead of silently falling back

Run:
    pytest tests/test_live_agents.py -v -s

IMPORTANT:
These are LIVE tests and may call external APIs.
"""

import os
import sys
from pathlib import Path
import requests
import pytest
from dotenv import load_dotenv

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

load_dotenv(BACKEND_DIR / ".env")

pytestmark = pytest.mark.live
if os.getenv("RUN_LIVE_TESTS") != "1":
    pytest.skip(
        "Set RUN_LIVE_TESTS=1 to run live external-service tests",
        allow_module_level=True,
    )


# ============================================================
# Configuration
# ============================================================

FASTAPI_URL = os.getenv(
    "FASTAPI_URL",
    "http://127.0.0.1:9000"
)

OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://localhost:11434"
)

OLLAMA_MODEL = os.getenv(
    "OLLAMA_MODEL",
    "llama3.2"
)

HF_TOKEN = os.getenv("HF_TOKEN") or os.getenv("HF_API_TOKEN") or os.getenv("HF_API_KEY")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")

DYNAMODB_ENDPOINT = os.getenv(
    "DYNAMODB_ENDPOINT",
    "http://localhost:8002"
)

DYNAMODB_TABLE = os.getenv(
    "DYNAMODB_TABLE",
    "raawa-data"
)


# ============================================================
# Helper
# ============================================================

def print_result(name, success, details=""):
    icon = "PASS" if success else "FAIL"

    print(f"\n[{icon}] {name}")

    if details:
        print(f"       {details}")


# ============================================================
# 1. Environment variables
# ============================================================

def test_environment_configuration():

    print("\n========== Environment Configuration ==========")

    checks = {
        "OLLAMA_BASE_URL": OLLAMA_BASE_URL,
        "OLLAMA_MODEL": OLLAMA_MODEL,
        "HF_TOKEN/HF_API_KEY": bool(HF_TOKEN),
        "GROQ_API_KEY": bool(GROQ_API_KEY),
        "DYNAMODB_ENDPOINT": DYNAMODB_ENDPOINT,
        "DYNAMODB_TABLE": DYNAMODB_TABLE,
    }

    for name, value in checks.items():
        print(f"{name}: {'configured' if value else 'MISSING'}")

    assert HF_TOKEN, "Hugging Face token is missing"
    assert GROQ_API_KEY, "Groq API key is missing"


# ============================================================
# 2. FastAPI
# ============================================================

def test_fastapi_running():

    try:
        response = requests.get(
            f"{FASTAPI_URL}/",
            timeout=5
        )

        print_result(
            "FastAPI",
            response.status_code < 500,
            f"HTTP {response.status_code}"
        )

        assert response.status_code < 500

    except requests.RequestException as exc:

        pytest.fail(
            f"FastAPI is not reachable at {FASTAPI_URL}: {exc}"
        )


# ============================================================
# 3. Ollama
# ============================================================

def test_ollama_running():

    try:
        response = requests.get(
            f"{OLLAMA_BASE_URL}/api/tags",
            timeout=5
        )

        response.raise_for_status()

        data = response.json()

        models = [
            model.get("name", "")
            for model in data.get("models", [])
        ]

        print_result(
            "Ollama",
            True,
            f"Available models: {models}"
        )

        assert models, "Ollama is running but no models are installed."

    except requests.RequestException as exc:

        pytest.fail(
            f"Ollama unavailable at {OLLAMA_BASE_URL}: {exc}"
        )


def test_ollama_model_installed():

    response = requests.get(
        f"{OLLAMA_BASE_URL}/api/tags",
        timeout=5
    )

    response.raise_for_status()

    models = [
        model.get("name", "")
        for model in response.json().get("models", [])
    ]

    installed = any(
        model == OLLAMA_MODEL
        or model.startswith(f"{OLLAMA_MODEL}:")
        for model in models
    )

    print_result(
        "Ollama model",
        installed,
        f"Expected: {OLLAMA_MODEL}"
    )

    assert installed, (
        f"{OLLAMA_MODEL} is not installed. "
        f"Run: ollama pull {OLLAMA_MODEL}"
    )


def test_ollama_generation():

    response = requests.post(
        f"{OLLAMA_BASE_URL}/api/generate",
        json={
            "model": OLLAMA_MODEL,
            "prompt": (
                "Reply with exactly: "
                "RAAWAAI_OLLAMA_OK"
            ),
            "stream": False
        },
        timeout=120
    )

    response.raise_for_status()

    output = response.json().get("response", "")

    print_result(
        "Ollama generation",
        bool(output),
        output[:100]
    )

    assert output.strip(), "Ollama returned an empty response."


# ============================================================
# 4. Hugging Face
# ============================================================

def test_huggingface_provider():

    assert HF_TOKEN, "HF_TOKEN/HF_API_KEY missing"

    try:
        from app.providers.huggingface_provider import score_sentiment

        result = score_sentiment(
            "RaawaAI is an excellent project and I really like it."
        )

        print_result(
            "Hugging Face",
            result is not None,
            str(result)[:300]
        )

        assert result is not None, (
            "Hugging Face returned None. "
            "The provider may have silently fallen back."
        )

    except Exception as exc:

        pytest.fail(
            f"Hugging Face provider failed: {exc}"
        )


# ============================================================
# 5. Groq
# ============================================================

def test_groq_provider():

    assert GROQ_API_KEY, "GROQ_API_KEY missing"

    try:
        from app.providers.groq_provider import generate_strategy

        result = generate_strategy(
            """
            RaawaAI integration test.

            Return a very short strategy recommendation.
            """
        )

        print_result(
            "Groq",
            result is not None,
            str(result)[:300]
        )

        assert result is not None, (
            "Groq returned None. "
            "Check GROQ_API_KEY and GROQ_MODEL."
        )

    except ImportError as exc:

        pytest.fail(
            "Could not import Groq provider. "
            f"Check groq_provider.py. Error: {exc}"
        )

    except Exception as exc:

        pytest.fail(
            f"Groq provider failed: {exc}"
        )


# ============================================================
# 6. DynamoDB
# ============================================================

def test_dynamodb_connection():

    try:
        from app.services.dynamodb_service import get_table

        table = get_table()

        assert table is not None

        print_result(
            "DynamoDB",
            True,
            f"Table: {table.table_name}"
        )

        assert table.table_name == DYNAMODB_TABLE

    except Exception as exc:

        pytest.fail(
            f"DynamoDB connection failed: {exc}"
        )


# ============================================================
# 7. Full multi-agent endpoint
# ============================================================

def test_multi_agent_endpoint():

    payload = {
        # IMPORTANT:
        # Replace these fields with the exact request body
        # expected by your /multi_start endpoint.
        "concept": (
            "A university introduces an AI assistant "
            "to help students plan their studies."
        ),
        "audience": "General",
        "fidelity": 0,
        "focus_group": "local",
    }

    print(
        f"\nCalling {FASTAPI_URL}/api/simulation/multi_start"
    )

    try:
        response = requests.post(
            f"{FASTAPI_URL}/api/simulation/multi_start",
            json=payload,
            timeout=180
        )

    except requests.RequestException as exc:

        pytest.fail(
            f"Multi-agent endpoint unreachable: {exc}"
        )

    print(f"HTTP status: {response.status_code}")

    if response.status_code != 200:

        print("Response:")
        print(response.text)

    assert response.status_code == 200

    data = response.json()

    print("\n========== Multi-Agent Response ==========")

    print(str(data)[:2000])

    assert data, "Endpoint returned empty JSON."

    assert "agent_status" in data, (
        "Response does not contain agent_status."
    )

    statuses = data["agent_status"]

    print("\n========== Agent Status ==========")

    for agent, status in statuses.items():
        print(f"{agent}: {status}")


# ============================================================
# 8. Ensure no silent fallbacks
# ============================================================

def test_all_agents_active():

    payload = {
        # Replace with your actual request schema.
        "concept": (
            "A city launches an AI-powered public "
            "transport recommendation system."
        ),
        "audience": "General",
        "fidelity": 0,
        "focus_group": "local",
    }

    response = requests.post(
        f"{FASTAPI_URL}/api/simulation/multi_start",
        json=payload,
        timeout=180
    )

    assert response.status_code == 200, response.text

    data = response.json()

    statuses = data.get("agent_status", {})

    required_agents = [
        "ollama",
        "huggingface",
        "groq"
    ]

    failures = []

    for agent in required_agents:

        status = statuses.get(agent)

        # Supports:
        #
        # "ollama": "active"
        #
        # AND
        #
        # "ollama": {
        #     "status": "active"
        # }

        if isinstance(status, dict):
            actual_status = status.get("status")
        else:
            actual_status = status

        if actual_status != "active":

            failures.append(
                f"{agent}: {actual_status or 'missing'}"
            )

    print("\n========== Final Agent Check ==========")

    if failures:

        for failure in failures:
            print(f"[FAIL] {failure}")

    else:

        print("[PASS] Ollama active")
        print("[PASS] Hugging Face active")
        print("[PASS] Groq active")

    assert not failures, (
        "Some agents are not actually active:\n"
        + "\n".join(failures)
    )