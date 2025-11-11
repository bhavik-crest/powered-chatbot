# Powered Chatbot Project

## Overview

This project is a full-stack web application featuring a LLM chatbot interface. The backend is built with FastAPI and Supabase, while the frontend uses Next.js and Tailwind CSS. The app supports features like Chat list with pagination, prompt editing, infinite scrolling for chat messages, and clear Chat as well.

---

## Features

- Backend API with FastAPI, including prefixed routes under `/api/`
- PostgreSQL database management via SQLAlchemy ORM and Alembic migrations
- Frontend built with Next.js and Tailwind CSS for responsive and aesthetic UI
- Infinite scroll pagination of chat sessions with optimized state management
- Edit prompt modal for updating session system prompts dynamically
- Robust error handling and feedback for CRUD operations (delete/reset sessions)
- Environment variable management for flexible API endpoint configuration

---

## Getting Started

### Prerequisites

- Python 3.10
- Node.js 18+
- Supabase managed PostgreSQL
- `poetry` or `pip` for Python dependency management
- Vercel or similar platform for frontend deployment (optional)

### Backend Setup

1. Clone the repository
2. Create a virtual environment and install dependencies