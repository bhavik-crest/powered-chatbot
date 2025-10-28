"use client";

import React, { useState, useEffect } from "react";

export default function EditPromptModal({ isOpen, onClose, sessionId, initialPrompt, onUpdate }) {
  const [prompt, setPrompt] = useState(initialPrompt || "");
  const [loading, setLoading] = useState(false);

  // Update prompt if initialPrompt changes (if parent re-opens with different data)
  React.useEffect(() => {
    setPrompt(initialPrompt || "");
  }, [initialPrompt]);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/set_system_prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, system_prompt: prompt }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`Error updating prompt: ${err.detail || "Unknown error"}`);
        setLoading(false);
        return;
      }
      onUpdate(prompt); // Notify parent of successful update
      onClose();        // Close modal
    } catch (error) {
      alert("Failed to update prompt: " + error.message);
    }
    setLoading(false);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-7xl w-full p-8 shadow-lg max-h-[600px] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Edit System Prompt for Session {sessionId}</h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <textarea
            rows={10}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="border border-gray-300 rounded-md p-3 resize-none focus:outline-blue-500"
            placeholder="Enter system prompt..."
            required
          />
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-gray-300 hover:bg-gray-400"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
