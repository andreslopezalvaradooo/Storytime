import { useMemo, useRef } from "react";
import { CanvasTexture, LinearFilter, SRGBColorSpace } from "three";

export const usePageTexture = ({ title, image, text, size = 1024 }) => {
  const canvasRef = useRef();
  const texRef = useRef();

  return useMemo(() => {
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
      canvasRef.current.width = canvasRef.current.height = size;
      texRef.current = new CanvasTexture(canvasRef.current);
      texRef.current.colorSpace = SRGBColorSpace;
      texRef.current.minFilter = texRef.current.magFilter = LinearFilter;
      texRef.current.generateMipmaps = false;
    }

    const ctx = canvasRef.current.getContext("2d");
    const bgMargin = size * 0.05;
    const spineMargin = size * 0.04;
    // const textML = size * 0.12;
    const textML = spineMargin + size * 0.08;
    const hasTitle = !!title;
    const hasImage = !!image;
    const hasText = !!text;

    const background =
      hasTitle && !hasImage && !hasText
        ? "book-cover"
        : hasImage || hasText
        ? "book-page"
        : "book-back";

    const drawBg = (next) => {
      ctx.clearRect(0, 0, size, size);
      const bg = new Image();
      bg.src = `/textures/${background}.jpg`;

      bg.onload = () => {
        ctx.drawImage(bg, 0, 0, size, size);
        next();
      };

      bg.onerror = () => {
        ctx.fillStyle = "#fdf9f0";
        ctx.fillRect(0, 0, size, size);
        next();
      };
    };

    const drawCover = () => {
      ctx.fillStyle = "#0a0a09";
      ctx.font = `bold ${size * 0.09}px 'Cinzel', serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const words = title.split(" ");
      const lines = [];
      let current = "";

      words.forEach((w) => {
        const test = current ? current + " " + w : w;

        if (ctx.measureText(test).width > size * 0.8 && current) {
          lines.push(current);
          current = w;
        } else current = test;
      });

      if (current) lines.push(current);

      while (lines.length < 2) {
        const last = lines.pop();
        const mid = Math.ceil(last.split(" ").length / 2);
        lines.push(last.split(" ").slice(0, mid).join(" "));
        lines.push(last.split(" ").slice(mid).join(" "));
      }

      if (lines.length > 3)
        lines.splice(2, lines.length - 3, lines.slice(2).join(" "));

      const totalH = lines.length * size * 0.11;
      let y = size / 2 - totalH / 2;

      lines.forEach((ln) => {
        ctx.fillText(ln.toUpperCase(), size / 2, y);
        y += size * 0.11;
      });

      texRef.current.needsUpdate = true;
    };

    const drawImagePage = () => {
      const img = new Image();
      img.src = `/textures/${image}.jpg`;

      img.onload = () => {
        const maxW = size - bgMargin * 2;
        const maxH = size - bgMargin * 2;
        const ratio = img.width / img.height;
        let w = maxW;
        let h = w / ratio;

        if (h > maxH) {
          h = maxH;
          w = h * ratio;
        }

        // const x = (size - w) / 2;
        const x = (size - w) / 2 - spineMargin / 2;
        const y = (size - h) / 2;
        ctx.drawImage(img, x, y, w, h);
        texRef.current.needsUpdate = true;
      };

      img.onerror = () => (texRef.current.needsUpdate = true);
    };

    const drawTextPage = () => {
      ctx.fillStyle = "#2d2a26";
      ctx.font = `${size * 0.048}px 'EB Garamond', serif`;
      ctx.textAlign = "left";
      ctx.textBaseline = "top";
      const maxW = size - textML - bgMargin;
      const wordsArr = text.split(" ");
      const lines = [];
      let line = "";

      wordsArr.forEach((w) => {
        const test = line ? line + " " + w : w;

        if (ctx.measureText(test).width > maxW) {
          lines.push(line);
          line = w;
        } else line = test;
      });

      if (line) lines.push(line);

      const lh = size * 0.07;
      const totalH = lines.length * lh;
      // let y = bgMargin;
      let y = Math.max(bgMargin, (size - totalH) / 2);

      lines.forEach((ln, idx) => {
        const parts = ln.trim().split(/\s+/);
        const isLast = idx === lines.length - 1;

        if (isLast || parts.length === 1) ctx.fillText(ln, textML, y);
        else {
          const wordsW = parts.reduce(
            (s, p) => s + ctx.measureText(p).width,
            0
          );

          const gap = (maxW - wordsW) / (parts.length - 1);
          let x = textML;

          parts.forEach((p) => {
            ctx.fillText(p, x, y);
            x += ctx.measureText(p).width + gap;
          });
        }

        y += lh;
      });

      texRef.current.needsUpdate = true;
    };

    drawBg(() => {
      if (hasTitle && !hasImage && !hasText) return drawCover();
      if (hasImage && !hasText) return drawImagePage();
      if (hasText) return drawTextPage();
      texRef.current.needsUpdate = true;
    });

    return texRef.current;
  }, [title, image, text, size]);
};
