from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models import ChatSession, Message
from app.schemas import MessageIn, MessageOut, ChatResponse, ChatSessionOut, PromptUpdate
from app.llm_client import call_openrouter
from typing import List

app = FastAPI()

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

# --- POST /chat: Send/receive messages---
def clean_response(content: str) -> str:
    # Remove trailing special tokens common in some LLM outputs
    for token in ["[/s]", "<s>", "</s>", "<|endoftext|>"]:
        content = content.replace(token, "")
    return content.strip()

@app.get("/sessions", response_model=List[ChatSessionOut])
def get_all_sessions(db: Session = Depends(get_db)):
    sessions = db.query(ChatSession).all()
    if not sessions:
        raise HTTPException(status_code=404, detail="No chat sessions found")
    return sessions

@app.get("/messages/{session_id}", response_model=List[MessageOut])
def get_messages(session_id: int, db: Session = Depends(get_db)):
    messages = db.query(Message).filter_by(session_id=session_id).order_by(Message.timestamp).all()
    if not messages:
        raise HTTPException(status_code=404, detail="Session or messages not found")
    
    return [
        MessageOut(
            role=msg.role,
            content=msg.content,
            timestamp=str(msg.timestamp)
        )
        for msg in messages
    ]

@app.post("/chat", response_model=ChatResponse)
def chat_endpoint(message_in: MessageIn, db: Session = Depends(get_db)):
    # Get or create session
    session_id = message_in.session_id
    if session_id:
        session = db.query(ChatSession).filter_by(id=session_id).first()
    else:
        session = ChatSession()
        db.add(session)
        db.commit()
        db.refresh(session)
        session_id = session.id

    # Retrieve session messages (history)
    history = db.query(Message).filter_by(session_id=session_id).order_by(Message.timestamp).all()
    messages_payload = [{"role": msg.role, "content": msg.content} for msg in history]

    # Add user message to history and payload
    user_msg = Message(session_id=session_id, role="user", content=message_in.content)
    db.add(user_msg)
    db.commit()
    db.refresh(user_msg)
    messages_payload.append({"role": "user", "content": message_in.content})

    # Add system prompt if not present
    system_prompt = session.system_prompt or "You are a helpful assistant."
    if not any(m["role"] == "system" for m in messages_payload):
        messages_payload.insert(0, {"role": "system", "content": system_prompt})

    # Call LLM with full history
    try:
        reply_raw = call_openrouter(messages_payload)
        reply = clean_response(reply_raw)
        if not reply:
            raise Exception("Empty completion received from LLM")
    except Exception as e:
        if "Empty completion" in str(e):
            raise HTTPException(status_code=503, detail="LLM returned empty response, please try again.")
        elif "LLM API Error" in str(e):
            raise HTTPException(status_code=503, detail=str(e))
        else:
            raise HTTPException(status_code=500, detail="Internal server error")

    # Save assistant reply in history
    assistant_msg = Message(session_id=session_id, role="assistant", content=reply)
    db.add(assistant_msg)
    db.commit()

    # Prepare updated history for response
    all_msgs = db.query(Message).filter_by(session_id=session_id).order_by(Message.timestamp).all()
    history_out = [
        MessageOut(role=msg.role, content=msg.content, timestamp=str(msg.timestamp))
        for msg in all_msgs
    ]

    return ChatResponse(reply=reply, session=session_id, history=history_out)

# ---- Bonus: Reset session (clear history) ----

@app.post("/reset")
def reset_endpoint(session_id: int, db: Session = Depends(get_db)):
    db.query(Message).filter_by(session_id=session_id).delete()
    db.commit()
    return {"status": "reset", "session_id": session_id}

# ---- Bonus: Set system prompt (personality) ----

@app.post("/set_system_prompt")
def set_prompt(data: PromptUpdate, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter_by(id=data.session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    session.system_prompt = data.system_prompt
    db.commit()
    return {"status": "updated", "session_id": data.session_id, "system_prompt": data.system_prompt}
