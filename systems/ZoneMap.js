// systems/ZoneMap.js
// Draws a faint 3x3 grid and provides helpers to position things by cell.


// Convert grid cell (1..3, 1..3) to pixel center
export function cellCenter(scene, cx, cy) {
  const w = scene.scale.width;
  const h = scene.scale.height;
  const cellW = w / 3;
  const cellH = h / 3;
  return {
    x: (cx - 1) * cellW + cellW / 2,
    y: (cy - 1) * cellH + cellH / 2
  };
}
