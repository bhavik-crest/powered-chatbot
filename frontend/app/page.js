"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import EditPromptModal from "./components/EditPromptModal";

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null)
  const [currentPrompt, setCurrentPrompt] = useState("")

  // Call this when user clicks edit icon button
  function openEditPrompt(session) {
    setSelectedSessionId(session.id);
    setCurrentPrompt(session.system_prompt || "");
    setModalOpen(true);
  }

  // Callback after prompt updated, update local session list accordingly
  function onPromptUpdate(newPrompt) {
    setSessions((prev) =>
      prev.map((s) =>
        s.id === selectedSessionId ? { ...s, system_prompt: newPrompt } : s
      )
    );
  }

  useEffect(() => {
    async function fetchSessions() {
      setLoading(true);
      try {
        const res = await fetch("http://127.0.0.1:8000/sessions");
        if (!res.ok) {
          const errorData = await res.json();
          alert(`Error fetching sessions: ${errorData.detail || "Unknown error"}`);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setSessions(data);
      } catch (error) {
        alert("Failed to fetch sessions: " + error.message);
      }
      setLoading(false);
    }

    fetchSessions();
  }, []);

  function goToSession(sessionId) {
    if (sessionId) {
      router.push(`/messages/${sessionId}`);
    } else {
      router.push(`/messages/`);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Chat Sessions</h1>
        <button
          onClick={() => goToSession()}
          className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Start a new chat session"
        >
          New Chat
        </button>
      </div>

      {loading && <p>Loading sessions...</p>}
      {!loading && sessions.length === 0 && <p>No chat sessions found.</p>}
      <ul className="space-y-3">
        {sessions.map((session) => (
          <li
            key={session.id}
            className="cursor-pointer border p-4 rounded-md shadow-sm bg-white hover:bg-blue-50 transition"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && goToSession(session.id)}
            aria-label={`Go to session ${session.id} messages`}
          >
            <p><strong>Session ID:</strong> {session.id}</p>
            {session.system_prompt && <p><strong>System Prompt:</strong> {session.system_prompt}</p>}
            <p><strong>Created At:</strong> {new Date(session.created_at).toLocaleString()}</p>
            <p className="mt-5">
              <strong 
                onClick={() => openEditPrompt(session)}
                aria-label={`Edit system prompt for session ${session.id}`}
                className="text-blue-600 hover:text-blue-800 p-2"
              >Edit</strong> | <strong>Delete</strong> | <strong onClick={() => goToSession(session.id)}>View</strong></p>
          </li>
        ))}
      </ul>

      {/* Modal */}
      <EditPromptModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        sessionId={selectedSessionId}
        initialPrompt={currentPrompt}
        onUpdate={onPromptUpdate}
      />
    </div>
  );
}
