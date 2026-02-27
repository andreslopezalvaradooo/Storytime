import { useSetAtom } from "jotai";
import { useState } from "react";
import { pagesAtom } from "../atoms/atoms";

const storyToPages = (story) => [
  { title: story.shortStory.title },

  { image: "DSC00983" },
  { text: story.shortStory.beginning },

  { image: "DSC01103" },
  { text: story.shortStory.middle },

  { image: "DSC02069" },
  { text: story.shortStory.end },

  {},
];

export const Form = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const setPages = useSetAtom(pagesAtom);

  const [form, setForm] = useState({
    age: "2 - 4",
    language: "English",
    genre: "Fairy Tale",
    tone: "Playful",
    characterName: "",
    characterType: "",
  });

  const pattern = /^[A-Za-z][A-Za-z0-9-]{2,19}$/;

  const handleGenerateStory = async () => {
    if (!form.characterName || !form.characterType || error) {
      alert("Por favor completa todos los campos correctamente.");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("http://localhost:3000/api/shortstory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const err = await response.json();
        console.error("Error del servidor:", err);
        return;
      }

      const data = await response.json();
      console.log("Story:", data);
      setPages(storyToPages(data));
    } catch (error) {
      console.error("Error generating story:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));

    if (field === "characterName") {
      if (/^[A-Za-z]/.test(value) && value.length >= 3) {
        setError(!pattern.test(value));
      } else {
        setError(false);
      }
    }
  };

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <h1 className="text-4xl font-bold text-center">STORYTIME</h1>

      <fieldset className="fieldset bg-base-200 border-base-300 rounded-box w-xs border p-4">
        <label className="label">Age (years)</label>
        <div className="join">
          {["2 - 4", "5 - 6", "7 - 8", "9 - 10"].map((a) => (
            <input
              key={a}
              className="join-item btn"
              type="radio"
              name="age"
              aria-label={a}
              checked={form.age === a}
              onChange={() => handleChange("age", a)}
            />
          ))}
        </div>

        <label className="label">Language</label>
        <select
          className="select select-ghost"
          value={form.language}
          onChange={(e) => handleChange("language", e.target.value)}
        >
          {[
            "English",
            "Spanish",
            "French",
            "German",
            "Italian",
            "Portuguese",
          ].map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>

        <label className="label">Genre</label>
        <select
          className="select select-ghost"
          value={form.genre}
          onChange={(e) => handleChange("genre", e.target.value)}
        >
          {[
            "Fairy Tale",
            "Fable",
            "Fantasy",
            "Adventure",
            "Science Fiction",
            "Realistic Fiction",
            "Mystery",
            "Moral Tale",
          ].map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>

        <label className="label">Tone</label>
        <select
          className="select select-ghost"
          value={form.tone}
          onChange={(e) => handleChange("tone", e.target.value)}
        >
          {[
            "Playful",
            "Warm",
            "Funny",
            "Mysterious",
            "Adventurous",
            "Magical",
            "Peaceful",
            "Emotional",
            "Inspiring",
            "Gentle",
          ].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>

        <label className="label">Character Name</label>
        <input
          type="text"
          className={`input ${error ? "validator" : ""}`}
          required
          placeholder="Type the name of the main character"
          minLength="3"
          maxLength="20"
          title="Only letters, numbers or dash"
          value={form.characterName}
          onChange={(e) => handleChange("characterName", e.target.value)}
        />
        {error && (
          <p className="validator-hint">
            Must begin with a letter
            <br />
            Must be 3 to 20 characters
            <br />
            Containing only letters, numbers or dash
          </p>
        )}

        <label className="label">Character Type</label>
        <input
          type="text"
          className="input"
          placeholder="e.g. Dragon, Robot, Child..."
          value={form.characterType}
          onChange={(e) => handleChange("characterType", e.target.value)}
        />

        <button
          className="btn"
          onClick={handleGenerateStory}
          disabled={loading || error}
        >
          {loading ? "Creating..." : "Create Story"}
        </button>
      </fieldset>
    </div>
  );
};
