import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";

export default function EditContentPage() {
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const initialContent = searchParams.get("content") || "";

  const [content, setContent] = useState(initialContent);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setContent(initialContent);
  }, [initialContent]);

  const handleSubmit = async () => {
    setLoading(true);

    await axios.post("https://your-n8n-webhook-url/webhook/hitl-resume", {
      id,
      title,
      content,
    });

    setLoading(false);
    alert("Updated successfully!");
  };

  return (
    <div style={{ maxWidth: 700, margin: "50px auto", fontFamily: "Arial" }}>
      <h2>Edit AI Generated Post</h2>

      <div style={{ marginBottom: 10 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Title"
          style={{ width: "100%", padding: 10 }}
        />
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={12}
        style={{ width: "100%", padding: 10 }}
      />

      <button
        onClick={handleSubmit}
        disabled={loading}
        style={{
          marginTop: 15,
          padding: "10px 20px",
          cursor: "pointer",
        }}
      >
        {loading ? "Submitting..." : "Approve & Continue"}
      </button>
    </div>
  );
}