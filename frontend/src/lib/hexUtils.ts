export const HEX_SIZE = 22

export function hexToPixel(q: number, r: number, size = HEX_SIZE) {
  return {
    x: size * (Math.sqrt(3) * q + (Math.sqrt(3) / 2) * r),
    y: size * ((3 / 2) * r),
  }
}

export function hexCorners(cx: number, cy: number, size = HEX_SIZE): string {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 180) * (60 * i - 30)
    return `${cx + size * Math.cos(angle)},${cy + size * Math.sin(angle)}`
  }).join(" ")
}

export function gridBounds(gridSize = 15, size = HEX_SIZE) {
  const offset = gridSize / 2
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity

  for (let r = 0; r < gridSize; r++) {
    for (let q = 0; q < gridSize; q++) {
      const { x, y } = hexToPixel(q - offset, r - offset, size)
      minX = Math.min(minX, x - size)
      maxX = Math.max(maxX, x + size)
      minY = Math.min(minY, y - size)
      maxY = Math.max(maxY, y + size)
    }
  }

  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY }
}