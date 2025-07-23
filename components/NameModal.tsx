// components/NameModal.tsx
"use client";

import { useState } from "react";
import { setUserName } from "@/app/actions/setName";

export default function NameModal({ userId }: { userId: string }) {
  const [name, setName] = useState("");
  const [isVisible, setIsVisible] = useState(true); // Modal starts open

  const handleSubmit = async () => {
    if (!name.trim()) return;
    await setUserName(userId, name.trim());
    setIsVisible(false);
    window.location.reload(); // Refresh to reflect new name in session if needed
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded shadow w-80 text-center">
        <h2 className="text-lg font-semibold mb-4">What should we call you?</h2>
        <input
          className="border px-3 py-2 rounded w-full mb-3"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your name"
        />
        <button
          onClick={handleSubmit}
          className="bg-gray-600 text-white px-4 py-2 rounded w-full"
        >
          Submit
        </button>
      </div>
    </div>
  );
}
