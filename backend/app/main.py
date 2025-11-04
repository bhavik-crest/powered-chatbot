from fastapi import FastAPI, Depends, HTTPException, Query, APIRouter
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import ChatSession, Message
from app.schemas import MessageIn, MessageOut, ChatResponse, ChatSessionOut, PromptUpdate, PaginatedSessionsResponse
from app.llm_client import call_openrouter
from typing import List
from sqlalchemy import desc
from datetime import datetime
from app.core.db_client import supabase
from fastapi import APIRouter, HTTPException, Query
from typing import List

app = FastAPI()
api_router = APIRouter(prefix="/api")

# List all origins you want to allow requests from
origins = [
    "http://localhost:3000",  # your Next.js dev server origin
    "http://127.0.0.1:3000",  # possible alternative local address
    "https://powered-chatbot.vercel.app",   # ✅ your deployed frontend
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


def clean_response(content: str) -> str:
    for token in ["[/s]", "<s>", "</s>", "<|endoftext|>"]:
        content = content.replace(token, "")
    return content.strip()


# ---- GET /sessions ----
@api_router.get("/sessions", response_model=PaginatedSessionsResponse)
def get_all_sessions(skip: int = Query(0, ge=0), limit: int = Query(10, ge=1, le=100)):
    try:
        all_sessions = supabase.table("sessions").select("*").order("id", desc=True).execute()
        total = len(all_sessions.data)
        sessions = all_sessions.data[skip: skip + limit]
        if not sessions:
            raise HTTPException(status_code=404, detail="No chat sessions found")
        return {"total": total, "data": sessions}
    except Exception as ex:
        raise HTTPException(status_code=500, detail=str(ex))


# ---- GET /messages/{session_id} ----
@api_router.get("/messages/{session_id}", response_model=List[MessageOut])
def get_messages(session_id: int):
    try:
        result = supabase.table("messages").select("*").eq("session_id", session_id).order("timestamp", desc=False).execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Session or messages not found")
        return [
            MessageOut(role=m["role"], content=m["content"], timestamp=m["timestamp"])
            for m in result.data
        ]
    except Exception as ex:
        raise HTTPException(status_code=500, detail=str(ex))


# ---- POST /chat ----
@api_router.post("/chat", response_model=ChatResponse)
def chat_endpoint(message_in: MessageIn):
    try:
        session_id = message_in.session_id

        # 1. Get or create session
        if not session_id:
            new_session = supabase.table("sessions").insert({"system_prompt": "You are a helpful assistant."}).execute()
            session_id = new_session.data[0]["id"]

        # 2. Retrieve message history
        history = supabase.table("messages").select("*").eq("session_id", session_id).order("timestamp", desc=False).execute()
        messages_payload = [{"role": m["role"], "content": m["content"]} for m in history.data]

        # 3. Add user message
        supabase.table("messages").insert({
            "session_id": session_id,
            "role": "user",
            "content": message_in.content,
            "timestamp": datetime.utcnow().isoformat()
        }).execute()

        messages_payload.append({"role": "user", "content": message_in.content})

        # 4. Add system prompt if missing
        session_data = supabase.table("sessions").select("system_prompt").eq("id", session_id).execute()
        system_prompt = session_data.data[0]["system_prompt"] or "You are a helpful assistant."
        if not any(m["role"] == "system" for m in messages_payload):
            messages_payload.insert(0, {"role": "system", "content": system_prompt})

        # 5. Call LLM
        reply_raw = call_openrouter(messages_payload)
        reply = clean_response(reply_raw)
        if not reply:
            raise Exception("Empty completion received from LLM")

        # 6. Save assistant reply
        supabase.table("messages").insert({
            "session_id": session_id,
            "role": "assistant",
            "content": reply,
            "timestamp": datetime.utcnow().isoformat()
        }).execute()

        # 7. Return updated history
        final_msgs = supabase.table("messages").select("*").eq("session_id", session_id).order("timestamp", desc=False).execute()
        history_out = [
            MessageOut(role=m["role"], content=m["content"], timestamp=m["timestamp"])
            for m in final_msgs.data
        ]

        return ChatResponse(reply=reply, session=session_id, history=history_out)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ---- POST /reset/{session_id} ----
@api_router.post("/reset/{session_id}")
def reset_endpoint(session_id: int):
    try:
        supabase.table("messages").delete().eq("session_id", session_id).execute()
        supabase.table("sessions").delete().eq("id", session_id).execute()
        return {"status": "reset", "session_id": session_id}
    except Exception as ex:
        raise HTTPException(status_code=500, detail=str(ex))


# ---- POST /set_system_prompt ----
@api_router.post("/set_system_prompt")
def set_prompt(data: PromptUpdate):
    try:
        supabase.table("sessions").update({"system_prompt": data.system_prompt}).eq("id", data.session_id).execute()
        return {"status": "updated", "session_id": data.session_id, "system_prompt": data.system_prompt}
    except Exception as ex:
        raise HTTPException(status_code=500, detail=str(ex))


app.include_router(api_router)
