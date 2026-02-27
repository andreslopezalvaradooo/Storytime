import { useTexture } from "@react-three/drei";
import { useAtom } from "jotai";
import { leavesAtom, pageAtom } from "../../atoms/atoms";
import { useEffect, useRef, useState } from "react";
import { useSound } from "../../hooks/useSound";
import { TestPage } from "./TestPage";

const preloadBg = (leaves) =>
  leaves.flat().forEach((p) => {
    p?.background && useTexture.preload(`/textures/${p.background}.jpg`);
    p?.image && useTexture.preload(`/textures/${p.image}.jpg`);
  });

export const TestBook = (props) => {
  const [page] = useAtom(pageAtom);
  const [leaves] = useAtom(leavesAtom);
  const [current, setCurrent] = useState(page);
  const timeout = useRef();
  const { playSound } = useSound();

  useEffect(() => preloadBg(leaves), [leaves]);

  useEffect(() => {
    clearTimeout(timeout.current);
    if (current === page) return;
    if (current === 0 && page > 0) playSound("open");
    else if (page === leaves.length) playSound("close");
    else playSound("flip");

    timeout.current = setTimeout(
      () => setCurrent((p) => (page > p ? p + 1 : p - 1)),
      Math.abs(page - current) > 2 ? 50 : 150
    );

    return () => clearTimeout(timeout.current);
  }, [page, current, leaves.length, playSound]);

  return (
    <group {...props} rotation={[-Math.PI / 8, -Math.PI / 2, 0]}>
      {leaves.map(([left, right], i) => (
        <TestPage
          key={i}
          left={left}
          right={right}
          opened={current > i}
          closed={current === 0 || current === leaves.length}
          leaf={i}
          page={current}
        />
      ))}
    </group>
  );
};
