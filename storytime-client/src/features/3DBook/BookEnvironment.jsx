import { Environment, OrbitControls } from "@react-three/drei";
import { Book } from "./Book";

export const BookEnvironment = () => (
  <>
    <Environment
      background
      blur={0.2}
      backgroundRotation={[0, Math.PI, 0]}
      files="/hdr/childrens_hospital_4k.hdr"
    />

    <ambientLight intensity={0.05} color="#0a0a0a" />
    <directionalLight castShadow intensity={1} position={[3, 3, 3]} />

    <Book />

    <mesh receiveShadow position={[0, 0, -1]} rotation={[-Math.PI / 8, 0, 0]}>
      <planeGeometry args={[10, 10]} />
      <shadowMaterial transparent opacity={0.3} />
    </mesh>

    <OrbitControls />
  </>
);
