"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import EditPromptModal from "./components/EditPromptModal";

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState("");

  // Open modal on edit click
  function openEditPrompt(session) {
    setSelectedSessionId(session.id);
    setCurrentPrompt(session.system_prompt || "");
    setModalOpen(true);
  }

  // Update local state after prompt update
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Chats</h1>
        <button
          onClick={() => goToSession()}
          className="bg-blue-600 text-white px-6 py-3 rounded-md shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          aria-label="Start a new chat session"
        >
          New Chat
        </button>
      </div>

      {loading && <div className="flex justify-center items-center h-full w-full">
        <svg
          fill="hsl(228, 97%, 42%)"
          viewBox="0 0 60 60"
          xmlns="http://www.w3.org/2000/svg"
          width="60"
          height="60"
        >
          <circle cx="5" cy="15" r="5">
            <animate
              id="spinner_qFRN"
              begin="0;spinner_OcgL.end+0.25s"
              attributeName="cy"
              calcMode="spline"
              dur="0.6s"
              values="12;6;12"
              keySplines=".33,.66,.66,1;.33,0,.66,.33"
            />
          </circle>
          <circle cx="20" cy="15" r="5">
            <animate
              begin="spinner_qFRN.begin+0.1s"
              attributeName="cy"
              calcMode="spline"
              dur="0.6s"
              values="12;6;12"
              keySplines=".33,.66,.66,1;.33,0,.66,.33"
            />
          </circle>
          <circle cx="35" cy="15" r="5">
            <animate
              id="spinner_OcgL"
              begin="spinner_qFRN.begin+0.2s"
              attributeName="cy"
              calcMode="spline"
              dur="0.6s"
              values="12;6;12"
              keySplines=".33,.66,.66,1;.33,0,.66,.33"
            />
          </circle>
        </svg>
      </div>}
      {!loading && sessions.length === 0 && (
        <p className="text-gray-600 text-center">No chat sessions found.</p>
      )}

      <ul>
        {sessions.map((session) => (
          <li
            key={session.id}
            className="border border-gray-300 rounded-lg shadow-sm p-5 mb-4 hover:shadow-lg transition cursor-default"
          >
            <div
              onClick={() => goToSession(session.id)}
              className="cursor-pointer space-y-1"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && goToSession(session.id)}
              aria-label={`Go to session ${session.id} messages`}
            >
              <p className="text-lg font-semibold text-gray-800">Session ID : {session.id}</p>
              {session.system_prompt && (
                <p className="text-gray-600 truncate max-w-3xl">
                  <strong>Prompt :</strong> {session.system_prompt}
                </p>
              )}
              <p className="text-sm text-gray-400">
                Created at : {new Date(session.created_at).toLocaleString()}
              </p>
            </div>
            <div className="mt-4 flex space-x-6 text-blue-600 text-sm font-medium">
              <button
                onClick={() => openEditPrompt(session)}
                aria-label={`Edit system prompt for session ${session.id}`}
                className="hover:underline focus:outline-none"
              >
                Edit System Prompt
              </button>
              <button className="hover:underline cursor-not-allowed opacity-50" disabled>
                Delete
              </button>
              <button
                onClick={() => goToSession(session.id)}
                className="hover:underline focus:outline-none"
              >
                View
              </button>
            </div>
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
