import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
