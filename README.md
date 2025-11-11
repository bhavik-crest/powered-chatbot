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

### Frontend Setup

1. Navigate to the frontend folder
2. Install dependencies:
3. cd frontend
4. npm install
5. Create a `.env.local` file and define the backend API base URL: NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api
6. Run the development server : `npm run dev`
7. Access the app at `http://localhost:3000`

### Backend Setup

1. Clone the repository
2. Create a virtual environment and install dependencies
3. cd backend
4. pip install -r requirements.txt
5. Set environment variables (e.g., `.env`) with your database URL and API settings
6. Run migrations using Alembic to setup your database schema
7. Start the backend server : uvicorn app.main:app --reload