"""Build compact SVG paths from the Survey of India state GeoJSON derivative.

Input: https://bharatlas.com/api/dl/admin/states/SOI_States.geojson
Run: python scripts/generate-india-map.py INPUT.geojson src/domain/india-map.ts
The upstream has 36 LGD state/UT records plus four internal disputed slivers.
"""

import json
import math
import sys
from pathlib import Path


LGD_TO_CODE = {
    1: 'JK', 2: 'HP', 3: 'PB', 4: 'CH', 5: 'UK', 6: 'HR', 7: 'DL', 8: 'RJ',
    9: 'UP', 10: 'BR', 11: 'SK', 12: 'AR', 13: 'NL', 14: 'MN', 15: 'MZ',
    16: 'TR', 17: 'ML', 18: 'AS', 19: 'WB', 20: 'JH', 21: 'OD', 22: 'CG',
    23: 'MP', 24: 'GJ', 27: 'MH', 28: 'AP', 29: 'KA', 30: 'GA', 31: 'LD',
    32: 'KL', 33: 'TN', 34: 'PY', 35: 'AN', 36: 'TG', 37: 'LA', 38: 'DN',
}


def distance(point, start, end):
    dx, dy = end[0] - start[0], end[1] - start[1]
    if dx == dy == 0:
        return math.dist(point, start)
    t = max(0, min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / (dx * dx + dy * dy)))
    return math.dist(point, (start[0] + t * dx, start[1] + t * dy))


def simplify(points, tolerance=0.05):
    if len(points) <= 3:
        return points
    index = max(range(1, len(points) - 1), key=lambda i: distance(points[i], points[0], points[-1]))
    if distance(points[index], points[0], points[-1]) <= tolerance:
        return [points[0], points[-1]]
    return simplify(points[:index + 1], tolerance)[:-1] + simplify(points[index:], tolerance)


def main():
    source = json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
    paths = {}
    markers = {}
    for feature in source['features']:
        code = LGD_TO_CODE.get(feature['properties']['State_LGD'])
        if not code:
            continue  # Four source polygons are marked as internal disputes, not states.
        parts = []
        largest = 0
        polygons = feature['geometry']['coordinates']
        if feature['geometry']['type'] == 'Polygon':
            polygons = [polygons]
        for polygon in polygons:
            for ring_index, ring in enumerate(polygon):
                if len(ring) < 4:
                    continue
                # Tiny islands are aggregated into the nearby state's accessible filter.
                xs, ys = zip(*ring)
                if (max(xs) - min(xs)) * (max(ys) - min(ys)) < 0.001:
                    continue
                points = simplify(ring)
                if len(points) < 4:
                    continue
                coords = [((x - 67) * 9, (38 - y) * 9) for x, y in points]
                area = abs(sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(coords, coords[1:]))) / 2
                if ring_index == 0 and area > largest:
                    largest = area
                    markers[code] = (sum(x for x, _ in coords) / len(coords), sum(y for _, y in coords) / len(coords))
                parts.append('M' + 'L'.join(f'{x:.1f},{y:.1f}' for x, y in coords) + 'Z')
        paths[code] = ''.join(parts)
    if set(paths) != set(LGD_TO_CODE.values()):
        raise ValueError('Missing state geometries: ' + str(set(LGD_TO_CODE.values()) - set(paths)))
    output = [
        '// Simplified from Survey of India state boundaries (LGD codes), via bharatlas.',
        '// Source: https://bharatlas.com/api/dl/admin/states/SOI_States.geojson',
        '// 2026-10-11; geographic projection: x=(longitude-67)*9, y=(38-latitude)*9.',
        '// Four unassigned internal dispute polygons are intentionally not attributed to a state.',
        'export const INDIA_MAP_PATHS: Record<string, string> = {',
    ]
    for code, path in sorted(paths.items()):
        output.append(f'  {code}: {json.dumps(path)},')
    output.append('}')
    output.append('export const INDIA_MAP_MARKERS: Record<string, [number, number]> = {')
    for code, (x, y) in sorted(markers.items()):
        output.append(f'  {code}: [{x:.1f}, {y:.1f}],')
    output.append('}')
    Path(sys.argv[2]).write_text('\n'.join(output) + '\n', encoding='utf-8')
    print(f'{len(paths)} states, {sum(map(len, paths.values()))} SVG path characters')


if __name__ == '__main__':
    main()
