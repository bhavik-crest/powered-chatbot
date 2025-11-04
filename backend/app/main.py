from fastapi import FastAPI, Depends, HTTPException, Query, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import ChatSession, Message
from app.schemas import MessageIn, MessageOut, ChatResponse, ChatSessionOut, PromptUpdate, PaginatedSessionsResponse
from app.llm_client import call_openrouter
from typing import List
from sqlalchemy import desc

app = FastAPI()
api_router = APIRouter(prefix="/api")

# List all origins you want to allow requests from
origins = [
    "http://localhost:3000",  # your Next.js dev server origin
    "http://127.0.0.1:3000",  # possible alternative local address
    # Add other domains here if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,           # Allows requests from these origins
    allow_credentials=True,
    allow_methods=["*"],             # Allow all standard HTTP methods
    allow_headers=["*"],             # Allow all headers
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/health")
async def health():
    return {"status": "ok"}
