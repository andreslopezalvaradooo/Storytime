import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectContent,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { motion } from "framer-motion";

const ages = ["3-5", "6-8", "9-12"];
const languages = ["Español", "Inglés", "Francés"];
const genres = ["Aventura", "Magia", "Amistad", "Animales", "Misterio"];
const tones = ["Divertido", "Educativo", "Relajante", "Motivacional"];
const characterTypes = [
  "Niño",
  "Niña",
  "Dragón",
  "Robot",
  "Animal",
  "Extraterrestre",
];

export const CreateStory = () => {
  const [form, setForm] = useState({
    age: "",
    language: "",
    genre: "",
    tone: "",
    characterName: "",
    characterType: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("http://localhost:3000/api/story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      console.log(data);
    } catch (err) {
      console.error("Error generando historia:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      className="max-w-xl mx-auto p-6 bg-white rounded-2xl shadow-md border"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h1 className="text-3xl font-display text-center mb-6">
        Crea tu cuento mágico
      </h1>

      <form className="space-y-4" onSubmit={handleSubmit}>
        {/* Edad */}
        <div>
          <Label>Edad del lector</Label>

          <Select onValueChange={(val) => handleChange("age", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona la edad" />
            </SelectTrigger>

            <SelectContent>
              {ages.map((a) => (
                <SelectItem key={a} value={a}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Idioma */}
        <div>
          <Label>Idioma</Label>

          <Select onValueChange={(val) => handleChange("language", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona el idioma" />
            </SelectTrigger>

            <SelectContent>
              {languages.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Género */}
        <div>
          <Label>Género del cuento</Label>

          <Select onValueChange={(val) => handleChange("genre", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un género" />
            </SelectTrigger>

            <SelectContent>
              {genres.map((g) => (
                <SelectItem key={g} value={g}>
                  {g}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Estilo/Tono */}
        <div>
          <Label>Estilo narrativo</Label>

          <Select onValueChange={(val) => handleChange("tone", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un estilo" />
            </SelectTrigger>

            <SelectContent>
              {tones.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Personaje */}
        <div>
          <Label>Nombre del personaje</Label>

          <Input
            placeholder="Ej: Lucas, Tina, Max..."
            value={form.characterName}
            onChange={(e) => handleChange("characterName", e.target.value)}
          />
        </div>

        <div>
          <Label>Tipo de personaje</Label>

          <Select onValueChange={(val) => handleChange("characterType", val)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona tipo de personaje" />
            </SelectTrigger>

            <SelectContent>
              {characterTypes.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Botón enviar */}
        <div className="text-center">
          <Button type="submit" disabled={loading}>
            {loading ? "Generando cuento..." : "Crear cuento"}
          </Button>
        </div>
      </form>
    </motion.div>
  );
};
