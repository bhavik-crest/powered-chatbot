from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class MessageIn(BaseModel):
    session_id: Optional[int] = None  # Make session_id optional
    content: str

class MessageOut(BaseModel):
    role: str
    content: str
    timestamp: str

class ChatResponse(BaseModel):
    reply: str
    session: int
    history: List[MessageOut]

class PromptUpdate(BaseModel):
    session_id: int
    system_prompt: str

class ChatSessionOut(BaseModel):
    id: int
    system_prompt: str | None = None
    created_at: datetime

    class Config:
        orm_mode = True