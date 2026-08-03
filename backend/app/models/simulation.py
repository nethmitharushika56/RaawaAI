from pydantic import BaseModel
from typing import Dict, Union, Optional

class SimulationRequest(BaseModel):
    concept: str
    audience: Union[str, Dict]
    fidelity: Optional[int] = 50
    focus_group: Optional[str] = "local"
