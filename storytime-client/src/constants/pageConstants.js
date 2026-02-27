import {
  BoxGeometry,
  Color,
  Float32BufferAttribute,
  Uint16BufferAttribute,
  Vector3,
} from "three";

export const PAGE_WIDTH = 1.28;
export const PAGE_HEIGHT = 1.71;
export const PAGE_DEPTH = 0.003;
export const PAGE_SEGMENTS = 30;
export const SEGMENT_WIDTH = PAGE_WIDTH / PAGE_SEGMENTS;

export const easingFactor = 0.5;
export const easingFactorFold = 0.3;
export const insideCurveStrength = 0.18;
export const outsideCurveStrength = 0.05;
export const turningCurveStrength = 0.09;

export const whiteColor = new Color("white");
export const emissiveColor = new Color("#FFDAB9");
export const darkColor = new Color("#111");

export const pageGeometry = (() => {
  const geometry = new BoxGeometry(
    PAGE_WIDTH,
    PAGE_HEIGHT,
    PAGE_DEPTH,
    PAGE_SEGMENTS,
    2
  );
  geometry.translate(PAGE_WIDTH / 2, 0, 0);

  const pos = geometry.attributes.position;
  const vertex = new Vector3();
  const skinIndices = [];
  const skinWeights = [];

  for (let i = 0; i < pos.count; i++) {
    vertex.fromBufferAttribute(pos, i);
    const x = vertex.x;
    const si = Math.floor(x / SEGMENT_WIDTH);
    const sw = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH;
    skinIndices.push(si, si + 1, 0, 0);
    skinWeights.push(1 - sw, sw, 0, 0);
  }

  geometry.setAttribute("skinIndex", new Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute(
    "skinWeight",
    new Float32BufferAttribute(skinWeights, 4)
  );

  return geometry;
})();
