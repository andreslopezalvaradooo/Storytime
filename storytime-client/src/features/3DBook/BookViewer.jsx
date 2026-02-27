import { Suspense, useLayoutEffect, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html, Loader } from "@react-three/drei";
import { BookEnvironment } from "./BookEnvironment";
import { useErrorBoundary } from "use-error-boundary";
import { SoundControls } from "../../components/SoundControls";

const getZ = (w) =>
  w >= 1536
    ? 3
    : w >= 1280
    ? 3.5
    : w >= 1024
    ? 4
    : w >= 768
    ? 4.5
    : w >= 640
    ? 5.5
    : 9;

const ResponsiveCameraZ = () => {
  const { camera, size } = useThree();
  const prevZ = useRef(getZ(size.width));

  useLayoutEffect(() => {
    const z = getZ(size.width);

    if (z !== prevZ.current) {
      camera.position.set(0, 0, z);
      prevZ.current = z;
    }
  }, [size.width, camera]);

  return null;
};

const LoadingEnviroment = () => (
  <div className="w-full h-full bg-neutral-900 flex flex-col gap-1 items-center justify-center">
    <div className="relative w-24 h-1 bg-white/20 overflow-hidden">
      <div className="absolute inset-0 bg-white origin-left animate-fill-bar" />
    </div>

    <span className="text-[10px] text-white tracking-widest">
      Loading story...
    </span>
  </div>
);

const BookScene = () => {
  const initialZ = getZ(window.innerWidth);

  return (
    <Canvas shadows camera={{ position: [0, 0, initialZ], fov: 35 }}>
      <ResponsiveCameraZ />

      <Suspense
        fallback={
          <Html fullscreen pointerEvents="none">
            <LoadingEnviroment />
          </Html>
        }
      >
        <BookEnvironment />
      </Suspense>
    </Canvas>
  );
};

export const BookViewer = () => {
  const { didCatch, error, ErrorBoundary } = useErrorBoundary();

  return didCatch ? (
    <div className="w-full h-screen text-red-600 flex items-center justify-center">
      {error.message}
    </div>
  ) : (
    <div className="w-full h-screen">
      <ErrorBoundary>
        <Loader />
        <BookScene />
      </ErrorBoundary>

      <SoundControls />
    </div>
  );
};
