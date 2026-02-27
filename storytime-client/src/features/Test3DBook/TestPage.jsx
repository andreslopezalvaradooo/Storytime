import { useEffect, useMemo, useRef, useState } from "react";
import { pageAtom } from "../../atoms/atoms";
import { useAtom } from "jotai";
import { usePageTexture } from "../../hooks/usePageTexture";
import {
  PAGE_DEPTH,
  PAGE_SEGMENTS,
  SEGMENT_WIDTH,
  pageGeometry,
  easingFactor,
  easingFactorFold,
  insideCurveStrength,
  outsideCurveStrength,
  turningCurveStrength,
  whiteColor,
  emissiveColor,
  darkColor,
} from "../../constants/pageConstants";
import {
  Bone,
  MathUtils,
  MeshStandardMaterial,
  Skeleton,
  SkinnedMesh,
} from "three";
import { useCursor } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { degToRad } from "three/src/math/MathUtils.js";
import { easing } from "maath";

export const TestPage = ({
  left,
  right,
  opened,
  closed,
  leaf,
  page,
  ...props
}) => {
  const groupRef = useRef();
  const meshRef = useRef();
  const lastOpened = useRef(opened);
  const turnedAt = useRef(0);
  const [hovered, setHovered] = useState(false);
  const [, setPage] = useAtom(pageAtom);
  const texLeft = usePageTexture(left);
  const texRight = usePageTexture(right);

  const mesh = useMemo(() => {
    const bones = Array.from({ length: PAGE_SEGMENTS + 1 }, () => new Bone());
    bones.forEach((b, i) => i && bones[i - 1].add(b));
    bones.forEach((b, i) => (b.position.x = i ? SEGMENT_WIDTH : 0));

    const materials = [
      new MeshStandardMaterial({ color: whiteColor }),
      new MeshStandardMaterial({ color: darkColor }),
      new MeshStandardMaterial({ color: whiteColor }),
      new MeshStandardMaterial({ color: whiteColor }),
      new MeshStandardMaterial({
        map: texLeft,
        emissive: emissiveColor,
      }),
      new MeshStandardMaterial({
        map: texRight,
        emissive: emissiveColor,
      }),
    ];

    const skel = new Skeleton(bones);
    const m = new SkinnedMesh(pageGeometry, materials);
    m.castShadow = true;
    m.add(skel.bones[0]);
    m.bind(skel);
    return m;
  }, [texLeft, texRight]);

  useEffect(() => {
    return () => {
      mesh.material.forEach((mat) => mat.dispose());
      texLeft?.dispose();
      texRight?.dispose();
    };
  }, [mesh, texLeft, texRight]);

  useCursor(hovered);

  useFrame((_, delta) => {
    const m = meshRef.current;
    if (!m) return;

    const target = hovered ? 0.22 : 0;
    const diff = Math.abs(m.material[4].emissiveIntensity - target);

    if (diff > 0.01) {
      m.material[4].emissiveIntensity = m.material[5].emissiveIntensity =
        MathUtils.lerp(m.material[4].emissiveIntensity, target, 0.12);
    }

    if (lastOpened.current !== opened) {
      turnedAt.current = performance.now();
      lastOpened.current = opened;
    }

    let t = Math.min(400, performance.now() - turnedAt.current) / 400;
    t = Math.sin(t * Math.PI);
    if (!hovered && t === 0) return;

    const { bones } = m.skeleton;
    let targetRot = opened ? -Math.PI / 2 : Math.PI / 2;
    if (!closed) targetRot += degToRad(leaf * 0.8);

    for (let i = 0; i < bones.length; i++) {
      const target = i === 0 ? groupRef.current : bones[i];
      const inside = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0;
      const outside = i >= 8 ? Math.cos(i * 0.3 + 0.09) : 0;
      const turning = Math.sin((i * Math.PI) / bones.length) * t;

      let rotY =
        insideCurveStrength * inside * targetRot -
        outsideCurveStrength * outside * targetRot +
        turningCurveStrength * turning * targetRot;

      let foldX = degToRad(Math.sign(targetRot) * 2);

      if (closed) {
        rotY = i === 0 ? targetRot : 0;
        foldX = 0;
      }

      easing.dampAngle(target.rotation, "y", rotY, easingFactor, delta);

      const foldIntensity =
        i > 8 ? Math.sin((i * Math.PI) / bones.length - 0.5) * t : 0;

      easing.dampAngle(
        target.rotation,
        "x",
        foldX * foldIntensity,
        easingFactorFold,
        delta
      );
    }
  });

  return (
    <group
      {...props}
      ref={groupRef}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      onClick={(e) => {
        e.stopPropagation();
        setPage(opened ? leaf : leaf + 1);
        setHovered(false);
      }}
    >
      <primitive
        object={mesh}
        ref={meshRef}
        position={[0, 0, -leaf * PAGE_DEPTH + page * PAGE_DEPTH]}
      />
    </group>
  );
};
