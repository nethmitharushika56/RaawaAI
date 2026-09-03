<div align="center">

🚀 **RaawaAI**

**AI-Powered Public Sentiment Simulation Platform**

*Simulate audience reactions • Analyze sentiment • Generate AI-driven insights*

</div>

---

✨ **About RaawaAI**

RaawaAI is an AI-powered public sentiment simulation platform designed to simulate how different audience groups may react to campaigns, products, ideas, and concepts.

The platform combines **AI personas, Large Language Models (LLMs), sentiment analysis, and interactive visualizations** to transform simulated audience reactions into meaningful insights.

---

🏗️ **Project Architecture**

```text
                         👤 User
                            │
                            ▼
                 ┌─────────────────────┐
                 │   React Frontend    │
                 │   + Tailwind CSS    │
                 └──────────┬──────────┘
                            │
                         REST API
                            │
                            ▼
                 ┌─────────────────────┐
                 │   FastAPI Backend   │
                 │       Python        │
                 └──────────┬──────────┘
                            │
               ┌────────────┼────────────┐
               │            │            │
               ▼            ▼            ▼
        ┌────────────┐ ┌──────────┐ ┌──────────┐
        │ 🤗 Hugging │ │ ⚡ Groq  │ │ 🦙 Ollama│
        │    Face    │ │          │ │ Local LLM│
        └─────┬──────┘ └────┬─────┘ └────┬─────┘
              │             │             │
              └─────────────┼─────────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │  AI Persona Engine  │
                 │                     │
                 │ Simulated Audience  │
                 │     Reactions       │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Sentiment Analysis  │
                 │                     │
                 │ Positive • Neutral  │
                 │      • Negative     │
                 └──────────┬──────────┘
                            │
                            ▼
                 ┌─────────────────────┐
                 │ Analytics Dashboard │
                 │                     │
                 │ 📊 Insights         │
                 │ 🔥 Heatmaps         │
                 │ 💬 AI Responses     │
                 └─────────────────────┘
```

---

⚙️ **How RaawaAI Works**

```text
Campaign / Idea
      │
      ▼
👤 User Input
      │
      ▼
💻 React Frontend
      │
      ▼
⚡ FastAPI REST API
      │
      ▼
🧠 Persona Simulation Engine
      │
      ├────► 🤗 Hugging Face
      │
      ├────► ⚡ Groq
      │
      └────► 🦙 Ollama
      │
      ▼
🤖 AI Persona Responses
      │
      ▼
💭 Sentiment Analysis
      │
      ▼
📊 Audience Insights
      │
      ▼
🔥 Dashboard & Visualizations
```

---

🛠️ **Tech Stack**

| Area | Technologies |
|------|--------------|
| 🎨 Frontend | React, JavaScript, Tailwind CSS |
| ⚙️ Backend | Python, FastAPI |
| 🔗 API | REST API |
| 🤗 AI Models | Hugging Face |
| ⚡ LLM Inference | Groq |
| 🦙 Local LLM | Ollama |
| 🧠 AI | LLMs, Persona Simulation, Sentiment Analysis |
| 📊 Visualization | Interactive Dashboards, Heatmaps |

---

📁 **Project Structure**

```text
RaawaAI/
│
├── 📂 frontend/
│   │
│   ├── 📂 src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── assets/
│   │   └── App.jsx
│   │
│   ├── public/
│   ├── package.json
│   └── .env
│
├── 📂 backend/
│   │
│   ├── main.py
│   ├── routes/
│   ├── services/
│   ├── models/
│   ├── requirements.txt
│   └── .env
│
├── .gitignore
└── README.md
```

---

🚀 **Getting Started**

First, clone the repository:

```bash
git clone <your-repository-url>
cd RaawaAI
```

---

🐍 **Backend Setup**

Navigate to the backend:

```bash
cd backend
```

Create a virtual environment:

**Windows**

```bash
python -m venv .venv
.venv\Scripts\activate
```

**macOS / Linux**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

---

🔐 **Environment Variables**

Create a `.env` file inside the `backend` directory:

```env
GROQ_API_KEY=your_groq_api_key
HUGGINGFACE_TOKEN=your_huggingface_token
```

⚠️ Never commit your `.env` file, API keys, tokens, or other credentials to GitHub.

Add these to `.gitignore`:

```gitignore
.env
.venv/
__pycache__/
*.pyc
```

---

🦙 **Ollama Setup**

Install Ollama from:

👉 https://ollama.com/

Verify the installation:

```bash
ollama --version
```

Pull the model required by RaawaAI:

```bash
ollama pull llama3.2
```

Check your installed models:

```bash
ollama list
```

Start Ollama if it is not already running:

```bash
ollama serve
```

Ollama runs by default at:

```text
http://localhost:11434
```

> 💡 If RaawaAI uses a different Ollama model, replace `llama3.2` with the model configured in the backend.

---

⚡ **Run the FastAPI Backend**

From the `backend` directory:

```bash
uvicorn main:app --reload
```

Backend:

```text
http://127.0.0.1:8000
```

Interactive Swagger API documentation:

```text
http://127.0.0.1:8000/docs
```

---

⚛️ **Frontend Setup**

Open a new terminal and navigate to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

If required, create:

```text
frontend/.env
```

Add the backend URL:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Start the frontend:

```bash
npm run dev
```

The development server will normally run at:

```text
http://localhost:5173
```

---

▶️ **Running RaawaAI**

For local development, keep three terminals running.

**Terminal 1 — 🦙 Ollama**

```bash
ollama serve
```

**Terminal 2 — ⚡ FastAPI**

```bash
cd backend
.venv\Scripts\activate
uvicorn main:app --reload
```

**Terminal 3 — ⚛️ React**

```bash
cd frontend
npm run dev
```

---

🌐 **Development URLs**

| Service | URL |
|---------|-----|
| ⚛️ React Frontend | `http://localhost:5173` |
| ⚡ FastAPI Backend | `http://127.0.0.1:8000` |
| 📚 Swagger API Docs | `http://127.0.0.1:8000/docs` |
| 🦙 Ollama | `http://localhost:11434` |

---

🔄 **Runtime Flow**

```text
                        👤 USER
                           │
                           ▼
                  ⚛️ React Frontend
                           │
                        REST API
                           │
                           ▼
                  ⚡ FastAPI Backend
                           │
              ┌────────────┼────────────┐
              │            │            │
              ▼            ▼            ▼
       🤗 Hugging Face   ⚡ Groq      🦙 Ollama
              │            │            │
              └────────────┼────────────┘
                           │
                           ▼
                    🧠 AI Personas
                           │
                           ▼
                  💬 Persona Responses
                           │
                           ▼
                  💭 Sentiment Analysis
                           │
                           ▼
                  📊 Audience Insights
                           │
                           ▼
                 🔥 Visual Dashboard
```

---

💡 **Core AI Features**

- 🤖 AI-powered persona simulation
- 👥 Multiple audience perspectives
- 💬 LLM-generated audience reactions
- 💭 Sentiment analysis
- 📊 Audience insight generation
- 🔥 Interactive sentiment visualizations
- 🤗 Hugging Face model integration
- ⚡ Groq-powered LLM inference
- 🦙 Local LLM support through Ollama

---

<div align="center">

🚀 **RaawaAI**

*Simulating reactions. Understanding audiences. Exploring ideas with AI.*

**React • FastAPI • Hugging Face • Groq • Ollama**

</div>