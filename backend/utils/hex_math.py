"""
Utility functions built on top of hex_grid.py.
Used by world engine, agents, and battle resolution.
"""
from simulation.hex_grid import Hex, hex_neighbors, hex_distance, hex_spiral


def get_tiles_in_range(center: Hex, radius: int, all_tiles: set[Hex]) -> list[Hex]:
    """Return all valid grid tiles within `radius` steps of center."""
    candidates = hex_spiral(center, radius)
    return [h for h in candidates if h in all_tiles]


def get_border_tiles(
    owned_tiles: set[Hex],
    all_tiles: set[Hex],
) -> list[Hex]:
    """
    Return neutral/enemy tiles that are adjacent to at least one owned tile.
    Used by civ agents to find expansion targets.
    """
    border = set()
    for tile in owned_tiles:
        for neighbor in hex_neighbors(tile):
            if neighbor in all_tiles and neighbor not in owned_tiles:
                border.add(neighbor)
    return list(border)


def get_territory_size(owned_tiles: set[Hex]) -> int:
    return len(owned_tiles)


def is_connected(owned_tiles: set[Hex]) -> bool:
    """
    Check if a civ's territory is fully connected (no isolated tiles).
    Uses BFS flood fill.
    """
    if not owned_tiles:
        return True

    visited = set()
    queue = [next(iter(owned_tiles))]

    while queue:
        current = queue.pop()
        if current in visited:
            continue
        visited.add(current)
        for neighbor in hex_neighbors(current):
            if neighbor in owned_tiles and neighbor not in visited:
                queue.append(neighbor)

    return visited == owned_tiles


def find_path(
    start: Hex,
    end: Hex,
    passable_tiles: set[Hex],
) -> list[Hex] | None:
    """
    BFS pathfinding between two hexes through passable tiles.
    Returns the path as a list of hexes, or None if unreachable.
    """
    if start not in passable_tiles or end not in passable_tiles:
        return None

    from collections import deque
    queue = deque([[start]])
    visited = {start}

    while queue:
        path = queue.popleft()
        current = path[-1]

        if current == end:
            return path

        for neighbor in hex_neighbors(current):
            if neighbor in passable_tiles and neighbor not in visited:
                visited.add(neighbor)
                queue.append(path + [neighbor])

    return None


def tiles_owned_by(
    owner_id: str,
    tile_owners: dict[Hex, str | None],
) -> set[Hex]:
    """Return the set of tiles owned by a specific civ."""
    return {h for h, owner in tile_owners.items() if owner == owner_id}


def domination_percentage(
    owner_id: str,
    tile_owners: dict[Hex, str | None],
) -> float:
    """What fraction of the total grid does this civ own?"""
    total = len(tile_owners)
    if total == 0:
        return 0.0
    owned = sum(1 for owner in tile_owners.values() if owner == owner_id)
    return owned / total