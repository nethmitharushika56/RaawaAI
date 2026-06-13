from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.simulation import router as simulation_router
from app.api.account import router as account_router
from app.api.profile import router as profile_router

app = FastAPI(title="RaawaAI Backend")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(simulation_router, prefix="/api")
app.include_router(account_router, prefix="/api")
app.include_router(profile_router, prefix="/api")

@app.get("/")
def root():
    return {"status": "RaawaAI backend running", "version": "1.0.0"}
