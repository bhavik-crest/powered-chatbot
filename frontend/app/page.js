"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import EditPromptModal from "./components/EditPromptModal";

export default function SessionsPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [currentPrompt, setCurrentPrompt] = useState("");

  const skipRef = useRef(0);
  const isFetchingRef = useRef(false);
  const triggeredOnceAtBottom = useRef(false);
  const limit = 10;

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

  // ============================
  // Fetch Sessions with Pagination
  // ============================
  async function fetchSessions() {
    if (isFetchingRef.current || !hasMore) return;

    isFetchingRef.current = true;
    setLoading(true);
    setError("");

    try {
      const skip = skipRef.current;
      const res = await fetch(
        `http://127.0.0.1:8000/sessions?skip=${skip}&limit=${limit}`
      );

      if (!res.ok) {
        setHasMore(false);
        throw new Error(`Failed to fetch sessions: ${res.statusText}`);
      }

      const result = await res.json(); // expecting { total, data: [...] }

      if (!result || !Array.isArray(result.data)) {
        console.error("Invalid response format:", result);
        setHasMore(false);
        return;
      }

      setTotal(result.total);

      setSessions((prev) => {
        const existingIds = new Set(prev.map((s) => String(s.id)));
        const newSessions = result.data.filter(
          (s) => !existingIds.has(String(s.id))
        );
        return [...prev, ...newSessions];
      });

      skipRef.current += result.data.length;

      // Stop when all are loaded
      if (skipRef.current >= result.total) {
        setHasMore(false);
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setError("Could not fetch sessions. Please check backend.");
      setHasMore(false);
    } finally {
      setLoading(false);
      isFetchingRef.current = false;
      triggeredOnceAtBottom.current = false;
    }
  }

  // ============================
  // Infinite Scroll Logic
  // ============================
  const handleScroll = () => {
    if (
      !hasMore ||
      loading ||
      isFetchingRef.current ||
      triggeredOnceAtBottom.current
    )
      return;

    const scrollPosition =
      window.innerHeight + document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.offsetHeight;

    if (scrollHeight - scrollPosition < 200) {
      triggeredOnceAtBottom.current = true;
      fetchSessions();
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  });

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

      {/* Loading or Error */}
      {error && (
        <p className="text-red-600 text-center mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </p>
      )}
      {loading && sessions.length === 0 && (
        <div className="flex justify-center items-center h-full w-full">
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
        </div>
      )}
      {!loading && sessions.length === 0 && !error && (
        <p className="text-gray-600 text-center">No chat sessions found.</p>
      )}

      {/* Session List */}
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
              onKeyDown={(e) =>
                (e.key === "Enter" || e.key === " ") && goToSession(session.id)
              }
              aria-label={`Go to session ${session.id} messages`}
            >
              <p className="text-lg font-semibold text-gray-800">
                Session ID: {session.id}
              </p>
              {session.system_prompt && (
                <p className="text-gray-600 truncate max-w-3xl">
                  <strong>Prompt:</strong> {session.system_prompt}
                </p>
              )}
              <p className="text-sm text-gray-400">
                Created at: {new Date(session.created_at).toLocaleString()}
              </p>
            </div>
            <div className="mt-4 flex space-x-6 text-blue-600 text-sm font-medium">
              <button
                onClick={() => openEditPrompt(session)}
                aria-label={`Edit system prompt for session ${session.id}`}
                className="hover:underline focus:outline-none"
              >
                Edit
              </button>
              <button
                className="hover:underline cursor-not-allowed opacity-50"
                disabled
              >
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

      {/* Loader & End Messages */}
      {loading && sessions.length > 0 && (
        <div className="flex justify-center items-center h-full w-full">
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
        </div>
      )}

      {!loading && !hasMore && sessions.length >= total && (
        <p className="text-center text-gray-400 py-4">
          🎉 All {total} sessions loaded
        </p>
      )}

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