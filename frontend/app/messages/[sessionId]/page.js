"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";


const MessageContent = ({ content }) => {
  const formatText = (text) => {
    // Split text into blocks (paragraphs, code blocks, lists)
    return text.split('\n').map((line, lineIndex) => {
      // Handle headers
      const headerMatch = line.match(/^(#{1,6})\s(.+)$/);
      if (headerMatch) {
        const level = headerMatch[1].length;
        const sizes = {
          1: 'text-2xl',
          2: 'text-xl',
          3: 'text-lg',
          4: 'text-base',
          5: 'text-sm',
          6: 'text-xs'
        };
        return (
          <div key={lineIndex} className={`${sizes[level]} font-bold my-2`}>
            {formatInline(headerMatch[2])}
          </div>
        );
      }

      // Handle code blocks
      if (line.startsWith('```')) {
        return (
          <pre key={lineIndex} className="bg-gray-800 text-gray-100 rounded p-2 my-2 overflow-x-auto">
            <code>{line.slice(3)}</code>
          </pre>
        );
      }

      // Handle lists
      if (line.match(/^[-*]\s/)) {
        return (
          <li key={lineIndex} className="ml-4 list-disc">
            {formatInline(line.slice(2))}
          </li>
        );
      }

      // Handle blockquotes
      if (line.startsWith('>')) {
        return (
          <blockquote key={lineIndex} className="border-l-4 border-gray-300 pl-4 my-2 italic">
            {formatInline(line.slice(1).trim())}
          </blockquote>
        );
      }

      // Handle regular text with inline formatting
      return <p key={lineIndex} className="my-1">{formatInline(line)}</p>;
    });
  };

  const formatInline = (text) => {
    return text
      .split(/(\*\*.*?\*\*|\*.*?\*|__.*?__|`.*?`|~~.*?~~)/g)
      .map((part, index) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={index}>{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith("*") && part.endsWith("*")) {
          return <em key={index}>{part.slice(1, -1)}</em>;
        }
        if (part.startsWith("__") && part.endsWith("__")) {
          return <u key={index}>{part.slice(2, -2)}</u>;
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={index} className="bg-gray-100 px-1 rounded">{part.slice(1, -1)}</code>;
        }
        if (part.startsWith("~~") && part.endsWith("~~")) {
          return <del key={index}>{part.slice(2, -2)}</del>;
        }
        return part;
      });
  };

  return (
    <div className="whitespace-pre-wrap">
      {formatText(content)}
    </div>
  );
};

export default function ChatPage() {
  const params = useParams(); // Get dynamic params
  const router = useRouter();

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]); // {role: "user" | "assistant", content: string}
  const { sessionId } = params;
  const [loading, setLoading] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Fetch existing messages when sessionId changes or on mount
  useEffect(() => {
    async function fetchMessages() {
      try {
        setLoading(true);
        const res = await fetch(`http://127.0.0.1:8000/messages/${sessionId}`);

        if (res.status === 404) {
          router.push(`/`);
          return;
        }

        if (!res.ok) {
          const err = await res.json();
          alert(`Error fetching messages: ${err.detail || "Unknown error"}`);
          setLoading(false);
          return;
        }
        const data = await res.json();
        setMessages(data);
      } catch (error) {
        alert("Failed to fetch messages: " + error.message);
      }
      setLoading(false);
    }

    if (sessionId) {
      fetchMessages();
    }
  }, [sessionId]);

  async function sendMessage() {
    if (!input.trim()) return;
    setButtonLoading(true);

    try {
      const body = sessionId ? { session_id: sessionId, content: input } : { content: input };

      setMessages((prev) => [
        ...prev,
        { role: "user", content: input },
      ]);

      const res = await fetch("http://127.0.0.1:8000/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(`Error: ${errorData.detail || "Unknown error"}`);
        setButtonLoading(false);
        return;
      }

      const data = await res.json();

      if (!sessionId && data.history.length > 0) {
        sessionId = data.history[0].session_id || sessionId;
      }

      // Append just sent user message and assistant reply to existing messages
      setMessages((prev) => [
        ...prev,
        // { role: "user", content: input },
        { role: "assistant", content: data.reply },
      ]);

      setInput("");
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
    <div className="max-w-4xl mx-auto p-4 h-screen flex flex-col">
      <h1 className="text-2xl font-bold mb-4 text-gray-800">Chatbot</h1>
      {loading && <p className="text-gray-500">Loading...</p>}
      <div className="flex-1 border border-gray-200 rounded-lg p-4 mb-4 overflow-y-auto bg-gray-50">
        {messages.length === 0 && !loading && (
          <p className="text-gray-500 text-center">No messages yet.</p>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"
              } mb-4`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${msg.role === "user"
                ? "bg-blue-500 text-white shadow-sm"
                : "bg-white text-gray-800 border border-gray-200 shadow-sm"
                }`}
            >
              <p className={`text-sm font-semibold mb-2 ${msg.role === "user" ? "text-blue-100" : "text-gray-600"
                }`}>
                {msg.role === "user" ? "You" : "Bot"}
              </p>
              <MessageContent content={msg.content} />
            </div>
          </div>
        ))}
        <div ref={messagesEndRef}></div>
      </div>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder="Type your message..."
        />
        {
          loading ? (<p
            disabled={loading}
            className="px-6 py-3 bg-blue-300 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
          >
            Send
          </p>) : (<button
            type="submit"
            disabled={buttonLoading}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
          >
            {buttonLoading ? "Sending..." : "Send"}
          </button>)
        }
      </form>
    </div>
  );
}
