import { useEffect, useRef, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:8000";

const SUGGESTIONS = [
  "A cozy cabin in a snowy forest at sunset",
  "A futuristic city with flying cars, cyberpunk style",
  "A cute astronaut cat floating in space",
];

const STAGES = [
  "Understanding your prompt",
  "Generating image",
  "Refining details",
  "Almost there",
];

function App() {
  const [prompt, setPrompt] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const textareaRef = useRef(null);
  const endRef = useRef(null);

  useEffect(() => {
    if (!loading) return;
    setElapsed(0);
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [loading]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items, loading]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [prompt]);

  const generateImage = async (text = prompt) => {
    const value = text.trim();
    if (!value || loading) return;

    const id = Date.now();
    setItems((prev) => [...prev, { id, prompt: value, status: "pending" }]);
    setPrompt("");
    setLoading(true);

    const update = (patch) =>
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, ...patch } : it))
      );

    try {
      const response = await fetch(`${API}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: value,
          negative_prompt: "blurry, low quality, distorted",
          num_inference_steps: 20,
          guidance_scale: 7.5,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Image generation failed");
      }
      update({ status: "done", url: `${API}${data.image_url}` });
    } catch (err) {
      update({ status: "error", error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      generateImage();
    }
  };

  const stage = STAGES[Math.min(Math.floor(elapsed / 6), STAGES.length - 1)];

  return (
    <div className="app">
      <header className="header">
        <span>Text to Image</span>
        {items.length > 0 && (
          <button onClick={() => setItems([])} disabled={loading}>
            New chat
          </button>
        )}
      </header>

      <main className="feed">
        <div className="thread">
          {items.length === 0 && (
            <div className="empty">
              <h1>What do you want to create?</h1>
              <p>Describe an image and watch it come to life.</p>
              <div className="suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => generateImage(s)}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {items.map((it) => (
            <div key={it.id} className="thread" style={{ gap: 20 }}>
              <div className="user-msg">{it.prompt}</div>
              <div className="ai-row">
                <div className="avatar">✦</div>
                <div className="ai-body">
                  {it.status === "pending" && (
                    <>
                      <div className="status">
                        <span className="dots">
                          <span />
                          <span />
                          <span />
                        </span>
                        {stage}… {elapsed}s
                      </div>
                      <div className="skeleton" />
                    </>
                  )}
                  {it.status === "done" && (
                    <>
                      <img className="result-img" src={it.url} alt={it.prompt} />
                      <div className="actions">
                        <a href={it.url} download target="_blank" rel="noreferrer">
                          Download
                        </a>
                      </div>
                    </>
                  )}
                  {it.status === "error" && (
                    <p className="error">⚠ {it.error}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </main>

      <div className="composer-wrap">
        <div className="composer">
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Describe the image you want..."
            rows={1}
          />
          <button
            className="send"
            onClick={() => generateImage()}
            disabled={loading || !prompt.trim()}
            aria-label="Generate"
          >
            {loading ? "…" : "↑"}
          </button>
        </div>
        <p className="hint">Enter to generate · Shift+Enter for a new line</p>
      </div>
    </div>
  );
}

export default App;
