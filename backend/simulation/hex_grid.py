"""
Hex grid using axial coordinates (q, r) with pointy-top orientation.

Axial coordinate system:
  - q increases going right
  - r increases going down-right
  - s = -q - r (derived, not stored)

Pointy-top hex means the flat sides face left/right.
"""
from dataclasses import dataclass
from typing import Iterator
import math


@dataclass(frozen=True)
class Hex:
    q: int
    r: int

    @property
    def s(self) -> int:
        return -self.q - self.r

    def __add__(self, other: "Hex") -> "Hex":
        return Hex(self.q + other.q, self.r + other.r)

    def __sub__(self, other: "Hex") -> "Hex":
        return Hex(self.q - other.q, self.r - other.r)

    def length(self) -> int:
        return (abs(self.q) + abs(self.r) + abs(self.s)) // 2

    def distance(self, other: "Hex") -> int:
        return (self - other).length()


# The 6 neighbor directions for a pointy-top hex grid
HEX_DIRECTIONS = [
    Hex(1, 0),   # E
    Hex(1, -1),  # NE
    Hex(0, -1),  # NW
    Hex(-1, 0),  # W
    Hex(-1, 1),  # SW
    Hex(0, 1),   # SE
]


def hex_neighbors(h: Hex) -> list[Hex]:
    """Return all 6 neighbors of a hex."""
    return [h + d for d in HEX_DIRECTIONS]


def hex_distance(a: Hex, b: Hex) -> int:
    """Manhattan distance between two hexes."""
    return a.distance(b)


def hex_ring(center: Hex, radius: int) -> list[Hex]:
    """Return all hexes exactly `radius` steps from center."""
    if radius == 0:
        return [center]

    results = []
    h = center + Hex(HEX_DIRECTIONS[4].q * radius, HEX_DIRECTIONS[4].r * radius)
    for i in range(6):
        for _ in range(radius):
            results.append(h)
            h = h + HEX_DIRECTIONS[i]
    return results


def hex_spiral(center: Hex, radius: int) -> list[Hex]:
    """Return center hex + all hexes within `radius` steps (filled circle)."""
    results = [center]
    for r in range(1, radius + 1):
        results.extend(hex_ring(center, r))
    return results


def hex_to_pixel(h: Hex, size: float) -> tuple[float, float]:
    """
    Convert axial hex coords to pixel center (pointy-top).
    `size` is the distance from center to corner.
    """
    x = size * (math.sqrt(3) * h.q + math.sqrt(3) / 2 * h.r)
    y = size * (3 / 2 * h.r)
    return x, y


def pixel_to_hex(x: float, y: float, size: float) -> Hex:
    """Convert pixel coords back to the nearest hex (pointy-top)."""
    q = (math.sqrt(3) / 3 * x - 1 / 3 * y) / size
    r = (2 / 3 * y) / size
    return hex_round(q, r)


def hex_round(fq: float, fr: float) -> Hex:
    """Round fractional axial coords to the nearest integer hex."""
    fs = -fq - fr
    q = round(fq)
    r = round(fr)
    s = round(fs)

    dq = abs(q - fq)
    dr = abs(r - fr)
    ds = abs(s - fs)

    if dq > dr and dq > ds:
        q = -r - s
    elif dr > ds:
        r = -q - s

    return Hex(q, r)


def generate_grid_coords(grid_size: int) -> list[Hex]:
    """
    Generate all hex coordinates for a rhombus-shaped grid.
    grid_size=15 gives a 15x15 = 225 tile grid.
    Offset so the grid is centred around (0,0).
    """
    offset = grid_size // 2
    coords = []
    for r in range(grid_size):
        for q in range(grid_size):
            coords.append(Hex(q - offset, r - offset))
    return coords


def get_corner_hexes(grid_size: int) -> dict[str, Hex]:
    """
    Return the four corner hexes for a given grid size.
    Used for spawning civilizations.
    """
    offset = grid_size // 2
    margin = 2  # how far in from the true corner

    return {
        "top_left":     Hex(-offset + margin, -offset + margin),
        "top_right":    Hex( offset - margin, -offset + margin),
        "bottom_left":  Hex(-offset + margin,  offset - margin),
        "bottom_right": Hex( offset - margin,  offset - margin),
    }