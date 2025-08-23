"use client";

import { Button } from "@/components/ui/button";
import { Lightbulb, Atom, Calculator, Code, Brain, Globe } from "lucide-react";

interface ChatSuggestionsProps {
  onSuggestionClick: (suggestion: string) => void;
  disabled?: boolean;
}

const suggestions = [
  {
    text: "Pythagorean Theorem",
    icon: Calculator,
    description: "Visual proofs and applications",
  },
  {
    text: "Neural Networks",
    icon: Brain,
    description: "How AI learns step by step",
  },
  {
    text: "Quantum Computing",
    icon: Atom,
    description: "Qubits and superposition",
  },
  {
    text: "Machine Learning",
    icon: Code,
    description: "Algorithms and data science",
  },
  {
    text: "Physics Concepts",
    icon: Lightbulb,
    description: "Waves, forces, and energy",
  },
  {
    text: "Geography & Maps",
    icon: Globe,
    description: "Earth science and cartography",
  },
];

export function ChatSuggestions({ onSuggestionClick, disabled = false }: ChatSuggestionsProps) {
  return (
    <div className="p-4">
      <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
        Quick suggestions:
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {suggestions.map((suggestion) => {
          const Icon = suggestion.icon;
          return (
            <Button
              key={suggestion.text}
              variant="outline"
              size="sm"
              className="h-auto p-3 flex flex-col items-center gap-1 text-xs"
              onClick={() => onSuggestionClick(suggestion.text)}
              disabled={disabled}
            >
              <Icon className="h-4 w-4" />
              <span className="font-medium">{suggestion.text}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {suggestion.description}
              </span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
