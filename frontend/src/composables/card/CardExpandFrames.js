const EDITOR_RADIUS = '2px 2px 10px 10px';

const CURVES = {
  linear: [0, 0, 1, 1],
  ease: [0.25, 0.1, 0.25, 1],
  'ease-in': [0.42, 0, 1, 1],
  'ease-out': [0, 0, 0.58, 1],
  'ease-in-out': [0.42, 0, 0.58, 1],
};

const createEasing = (name) => {
  const [x1, y1, x2, y2] = CURVES[name] ?? CURVES['ease-out'];
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  const sampleX = (t) => ((ax * t + bx) * t + cx) * t;
  const sampleY = (t) => ((ay * t + by) * t + cy) * t;
  const slopeX = (t) => (3 * ax * t + 2 * bx) * t + cx;

  const solve = (x) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const error = sampleX(t) - x;
      if (Math.abs(error) < 1e-5) return t;
      const slope = slopeX(t);
      if (Math.abs(slope) < 1e-6) break;
      t -= error / slope;
    }

    let low = 0;
    let high = 1;
    t = x;
    while (low < high) {
      const value = sampleX(t);
      if (Math.abs(value - x) < 1e-5) break;
      if (x > value) low = t;
      else high = t;
      t = (high - low) / 2 + low;
      if (high - low < 1e-6) break;
    }
    return t;
  };

  return (x) => (x <= 0 ? 0 : x >= 1 ? 1 : sampleY(solve(x)));
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const getInsets = (sectionRect, editorRect) => {
  const height = editorRect.height ?? editorRect.bottom - editorRect.top;
  const top = clamp(sectionRect.top - editorRect.top, 0, height);
  const left = Math.max(0, sectionRect.left - editorRect.left);
  const right = Math.max(0, editorRect.right - sectionRect.right);
  const bottom = clamp(editorRect.bottom - sectionRect.bottom, 0, Math.max(0, height - top));

  return { top, right, bottom, left };
};

const toClipPath = ({ top, right, bottom, left }) =>
  `inset(${top}px ${right}px ${bottom}px ${left}px round ${EDITOR_RADIUS})`;

export const buildClipFrames = ({
  sectionRect,
  editorRect,
  mode = 'expand',
  easing = 'ease-out',
  topCatchup = 0.35,
  samples = 16,
}) => {
  const insets = getInsets(sectionRect, editorRect);
  const ease = createEasing(easing);
  const topReach = Math.max(ease(clamp(topCatchup, 0.05, 1)), 1e-3);

  const at = (progress) => ({
    top: insets.top * (1 - Math.min(1, progress / topReach)),
    right: insets.right * (1 - progress),
    bottom: insets.bottom * (1 - progress),
    left: insets.left * (1 - progress),
  });

  return Array.from({ length: samples + 1 }, (_, index) => {
    const eased = ease(index / samples);
    const progress = mode === 'collapse' ? 1 - eased : eased;
    const frame = { clipPath: toClipPath(at(progress)) };
    if (mode === 'collapse') frame.opacity = progress;
    return frame;
  });
};