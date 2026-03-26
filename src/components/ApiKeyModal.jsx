import { useState } from "react";

const PROVIDERS = [
  {
    id: "openai",
    name: "OpenAI",
    icon: "⚡",
    model: "GPT-4o Mini",
    placeholder: "sk-...",
    validate: (k) => k.startsWith("sk-") ? null : "OpenAI keys start with 'sk-'",
    note: "Key is stored in memory only and sent exclusively to OpenAI.",
  },
  {
    id: "gemini",
    name: "Google Gemini",
    icon: "✦",
    model: "gemini-1.5-flash",
    placeholder: "AIza...",
    validate: (k) => k.length > 10 ? null : "Enter a valid Gemini API key",
    note: "Key is stored in memory only and sent exclusively to Google.",
  },
];

export default function ApiKeyModal({ onSave, onClose }) {
  const [selectedProvider, setSelectedProvider] = useState("openai");
  const [key, setKey] = useState("");
  const [error, setError] = useState("");

  const provider = PROVIDERS.find((p) => p.id === selectedProvider);

  function handleSave() {
    const trimmed = key.trim();
    const validationError = provider.validate(trimmed);
    if (validationError) {
      setError(validationError);
      return;
    }
    onSave(selectedProvider, trimmed);
  }

  function handleProviderSwitch(id) {
    setSelectedProvider(id);
    setKey("");
    setError("");
  }

  return (
    <div className="modal-overlay">
      <div className="modal-box api-key-modal">
        <div className="modal-header">
          {onClose && (
            <button className="close-btn modal-close-top" onClick={onClose}>✕</button>
          )}
          <div className="modal-icon">🔑</div>
          <h2>Connect AI Provider</h2>
          <p>Choose your AI provider to enable Planora AI</p>
        </div>

        {/* Provider selector */}
        <div className="provider-tabs">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              className={`provider-tab ${selectedProvider === p.id ? "active" : ""}`}
              onClick={() => handleProviderSwitch(p.id)}
            >
              <span className="provider-tab-icon">{p.icon}</span>
              <div className="provider-tab-info">
                <div className="provider-tab-name">{p.name}</div>
                <div className="provider-tab-model">{p.model}</div>
              </div>
            </button>
          ))}
        </div>

        <div className="modal-body">
          <input
            type="password"
            className="api-key-input"
            placeholder={provider.placeholder}
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus
            key={selectedProvider}
          />
          {error && <p className="error-text">{error}</p>}
          <p className="api-key-note">{provider.note}</p>
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={handleSave} disabled={!key.trim()}>
            Connect {provider.name} →
          </button>
        </div>
      </div>
    </div>
  );
}
