"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

const MessageContent = ({ content }) => (
  <div className="markdown-container">
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {content}
    </ReactMarkdown>
  </div>
);

export default function ChatPage() {
  const { sessionId } = useParams();
  const router = useRouter();

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change (new message sent)
  useEffect(() => {
    if (page === 1) messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Fetch messages for a given page
  async function fetchMessages(currentPage = 1, appendTop = false) {
  try {
    if (currentPage === 1) setLoading(true);
    else setLoadingMore(true);

    const res = await fetch(`${API_BASE_URL}/messages/${sessionId}?page=${currentPage}`);
    if (!res.ok) {
      const err = await res.json();
      if (res.status === 404) router.push(`/`);
      else alert(`Error: ${err.detail || "Unknown error"}`);
      return;
    }

    const data = await res.json();

    setTotalPages(data.total_pages || 1);
    setPage(currentPage);

    // ✅ If loading older messages, prepend them (avoid duplicates)
    if (appendTop) {
      setMessages((prev) => {
        const newMsgs = data.messages.filter(
          (m) => !prev.some((pm) => pm.timestamp === m.timestamp && pm.content === m.content)
        );
        return [...newMsgs, ...prev];
      });
    } else {
      setMessages(data.messages);
    }
  } catch (error) {
    alert("Failed to fetch messages: " + error.message);
  } finally {
    setLoading(false);
    setLoadingMore(false);
  }
}


  // Fetch first page on mount
  useEffect(() => {
    if (sessionId) fetchMessages(1);
  }, [sessionId]);

  // ✅ Scroll event: load older messages when scrolled to top
  function handleScroll(e) {
  const container = e.target;
  if (container.scrollTop === 0 && !loadingMore && page < totalPages) {
    const prevScrollHeight = container.scrollHeight;
    const nextPage = page + 1;
    fetchMessages(nextPage, true).then(() => {
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight - prevScrollHeight;
      });
    });
  }
}


  async function sendMessage() {
    if (!input.trim()) return;
    setButtonLoading(true);
    const userMsg = { role: "user", content: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const body = { session_id: sessionId, content: userMsg.content };
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${err.detail || "Unknown error"}`);
        setButtonLoading(false);
        return;
      }

      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (error) {
      alert("Failed to send message: " + error.message);
    }
    setButtonLoading(false);
  }

  function handleSubmit(e) {
    e.preventDefault();
    sendMessage();
  }

  return (
    <div className="max-w-7xl mx-auto p-4 h-screen flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-gray-800">Chatbot</h1>
        <button
          onClick={() => router.push('/')}
          className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition font-medium"
        >
          Back
        </button>
      </div>

      {/* Messages container */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 border border-gray-200 rounded-lg p-4 mb-4 overflow-y-auto bg-gray-50"
      >
        {/* Loading state */}
        {loading && (
          <div className="flex justify-center items-center h-full">
            <svg fill="hsl(228,97%,42%)" viewBox="0 0 60 60" width="60" height="60">
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

        {/* Older messages loader */}
        {loadingMore && (
          <div className="flex items-center justify-center">
            <div className="bg-white text-gray-600 text-sm px-4 py-2 rounded-lg shadow">
              Loading older messages...
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} mb-4`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                msg.role === "user"
                  ? "bg-blue-500 text-white shadow-sm"
                  : "bg-white text-gray-800 border border-gray-200 shadow-sm"
              }`}
            >
              <p
                className={`text-md font-semibold mb-2 ${
                  msg.role === "user" ? "text-blue-100" : "text-gray-600"
                }`}
              >
                {msg.role === "user" ? "You" : "🤖 Bot"}
              </p>
              <MessageContent content={msg.content} />
            </div>
          </div>
        ))}

        {buttonLoading && (
          <div className="flex justify-start mb-4">
            <div className="max-w-[70%] rounded-lg p-3 bg-white text-gray-800 border border-gray-200 shadow-sm">
              <p className="text-md font-semibold mb-2 text-gray-600">🤖 Bot is thinking...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef}></div>
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder="Type your message..."
        />
        <button
          type="submit"
          disabled={buttonLoading}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
        >
          {buttonLoading ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}