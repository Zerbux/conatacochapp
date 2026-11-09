"""Coordinate-only route planning with a real-road geometry fallback via OSRM."""

import json
import math
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.core.cache import cache

from core.models import Ruta, TrazadoRuta

EARTH_RADIUS_METERS = 6_371_000


def _distance(a, b):
    lat1, lon1 = map(math.radians, a)
    lat2, lon2 = map(math.radians, b)
    d_lat, d_lon = lat2 - lat1, lon2 - lon1
    value = math.sin(d_lat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(d_lon / 2) ** 2
    return EARTH_RADIUS_METERS * 2 * math.atan2(math.sqrt(value), math.sqrt(max(0, 1 - value)))


def _nearest_projection(point, coordinates, cumulative):
    best = None
    latitude_scale = 111_320
    longitude_scale = latitude_scale * math.cos(math.radians(point[0]))
    for index, (left, right) in enumerate(zip(coordinates, coordinates[1:])):
        dx = (right[1] - left[1]) * longitude_scale
        dy = (right[0] - left[0]) * latitude_scale
        px = (point[1] - left[1]) * longitude_scale
        py = (point[0] - left[0]) * latitude_scale
        denominator = dx * dx + dy * dy
        fraction = 0 if denominator == 0 else max(0, min(1, (px * dx + py * dy) / denominator))
        projected = (left[0] + (right[0] - left[0]) * fraction,
                     left[1] + (right[1] - left[1]) * fraction)
        distance = _distance(point, projected)
        along = cumulative[index] + (cumulative[index + 1] - cumulative[index]) * fraction
        if best is None or distance < best['distance_meters']:
            best = {'coordinate': projected, 'distance_meters': distance, 'along_meters': along, 'segment': index}
    return best


def _segment(coordinates, cumulative, start, end):
    path = [start['coordinate']]
    path.extend(
        coordinate for index, coordinate in enumerate(coordinates)
        if start['along_meters'] < cumulative[index] < end['along_meters']
    )
    path.append(end['coordinate'])
    return path


def _nearby_route_ids(point, radius_meters):
    latitude_delta = radius_meters / 111_320
    longitude_delta = radius_meters / max(1, 111_320 * math.cos(math.radians(point[0])))
    return TrazadoRuta.objects.filter(
        ruta__estado='ACTIVA', latitud__isnull=False, longitud__isnull=False,
        latitud__gte=point[0] - latitude_delta, latitud__lte=point[0] + latitude_delta,
        longitud__gte=point[1] - longitude_delta, longitud__lte=point[1] + longitude_delta,
    ).values_list('ruta_id', flat=True).distinct()


def _deduplicate_points(points):
    deduplicated = []
    for point in points:
        if not deduplicated or abs(deduplicated[-1][0] - point[0]) > 1e-9 or abs(deduplicated[-1][1] - point[1]) > 1e-9:
            deduplicated.append(point)
    return deduplicated


def _route_geometry_from_osrm(origin, destination, waypoints=None):
    coordinates = [origin, * (waypoints or []), destination]
    coordinates = _deduplicate_points([(float(lat), float(lon)) for lat, lon in coordinates])
    if len(coordinates) < 2:
        return None

    cache_key = 'osrm-route-geometry:' + json.dumps(coordinates, separators=(',', ':'), sort_keys=True)
    cached = cache.get(cache_key)
    if cached is not None:
        return cached

    base_url = getattr(settings, 'OSRM_BASE_URL', 'https://router.project-osrm.org').rstrip('/')
    route_coords = ';'.join(f'{lon},{lat}' for lat, lon in coordinates)
    request_url = (
        f'{base_url}/route/v1/driving/{route_coords}?overview=full&geometries=geojson&alternatives=false'
    )
    try:
        request = Request(request_url, headers={'User-Agent': 'CONATACOCH/1.0'})
        with urlopen(request, timeout=getattr(settings, 'OSRM_TIMEOUT_SECONDS', 8)) as response:
            payload = json.loads(response.read().decode('utf-8'))
    except (HTTPError, URLError, ValueError, TimeoutError):
        return None

    routes = payload.get('routes') if isinstance(payload, dict) else []
    if not routes:
        return None
    geometry = routes[0].get('geometry')
    if not geometry:
        return None
    cache.set(cache_key, geometry, timeout=getattr(settings, 'ROUTE_GEOMETRY_CACHE_SECONDS', 86400))
    return geometry


def _geometry_to_coordinates(geometry):
    if not geometry:
        return []
    if isinstance(geometry, list):
        return [{'latitud': float(lat), 'longitud': float(lon)} for lat, lon in geometry]
    if not isinstance(geometry, dict):
        return []
    geometry_type = geometry.get('type')
    if geometry_type == 'LineString':
        return [{'latitud': float(lat), 'longitud': float(lon)} for lon, lat in geometry.get('coordinates', [])]
    if geometry_type == 'MultiLineString':
        flattened = []
        for segment in geometry.get('coordinates', []):
            flattened.extend({'latitud': float(lat), 'longitud': float(lon)} for lon, lat in segment)
        return flattened
    return []


def _waypoints_for_route(points):
    if len(points) <= 2:
        return []
    if len(points) <= 25:
        return [(float(point.latitud), float(point.longitud)) for point in points]
    step = max(1, len(points) // 24)
    return [(float(point.latitud), float(point.longitud)) for index, point in enumerate(points) if index % step == 0 or index == len(points) - 1]


def planificar_viaje(origen, destino):
    """Return direct, single-vehicle route alternatives using verified DB coordinates and real-road geometry when available."""
    origin = (float(origen['latitud']), float(origen['longitud']))
    target = (float(destino['latitud']), float(destino['longitud']))
    radius = max(100, int(getattr(settings, 'ROUTE_PLANNER_WALK_RADIUS_METERS', 2_000)))
    candidate_ids = set(_nearby_route_ids(origin, radius)) & set(_nearby_route_ids(target, radius))
    if not candidate_ids:
        return []

    routes = Ruta.objects.filter(pk__in=candidate_ids, estado='ACTIVA').prefetch_related('trazados')
    alternatives = []
    walking_speed = max(1, float(getattr(settings, 'ROUTE_PLANNER_WALKING_SPEED_KMH', 4.5)))
    transit_speed = max(1, float(getattr(settings, 'MATCH_AVERAGE_SPEED_KMH', 20)))
    for route in routes:
        for direction in ('IDA', 'REGRESO'):
            for path_type in ('PRINCIPAL', 'ALTERNATIVO'):
                points = sorted(
                    (p for p in route.trazados.all() if p.sentido == direction and p.tipo_trazado == path_type),
                    key=lambda p: (p.orden, p.pk),
                )
                if len(points) < 2 or any(p.latitud is None or p.longitud is None for p in points):
                    continue
                coordinates = [(float(p.latitud), float(p.longitud)) for p in points]
                if len(coordinates) < 2:
                    continue
                cumulative = [0.0]
                for left, right in zip(coordinates, coordinates[1:]):
                    cumulative.append(cumulative[-1] + _distance(left, right))
                board = _nearest_projection(origin, coordinates, cumulative)
                alight = _nearest_projection(target, coordinates, cumulative)
                if (not board or not alight or board['distance_meters'] > radius or
                        alight['distance_meters'] > radius or alight['along_meters'] <= board['along_meters']):
                    continue

                transit_distance = alight['along_meters'] - board['along_meters']
                walk_origin = _distance(origin, board['coordinate'])
                walk_destination = _distance(alight['coordinate'], target)
                walk_minutes = (walk_origin + walk_destination) / (walking_speed * 1000 / 60)
                transit_minutes = transit_distance / (transit_speed * 1000 / 60)
                first_point = points[board['segment']]
                last_point = points[min(alight['segment'] + 1, len(points) - 1)]

                geometry = route.geometry if getattr(route, 'geometry', None) else None
                if not geometry:
                    geometry = _route_geometry_from_osrm(origin, target, waypoints=_waypoints_for_route(points))
                    if geometry:
                        route.geometry = geometry
                        route.save(update_fields=['geometry'])

                tramo_colectivo = _geometry_to_coordinates(geometry)
                if not tramo_colectivo:
                    tramo_colectivo = [{'latitud': lat, 'longitud': lon} for lat, lon in _segment(coordinates, cumulative, board, alight)]

                alternatives.append({
                    'ruta': route,
                    'sentido': direction,
                    'tipo_trazado': path_type,
                    'subida': {'latitud': board['coordinate'][0], 'longitud': board['coordinate'][1], 'calle': first_point.calle},
                    'bajada': {'latitud': alight['coordinate'][0], 'longitud': alight['coordinate'][1], 'calle': last_point.calle},
                    'tramo_colectivo': tramo_colectivo,
                    'geometry': geometry,
                    'caminar_origen_metros': round(walk_origin),
                    'caminar_destino_metros': round(walk_destination),
                    'distancia_colectivo_metros': round(transit_distance),
                    'minutos_caminando_estimados': max(0, round(walk_minutes)),
                    'minutos_colectivo_estimados': max(1, round(transit_minutes)),
                    'minutos_totales_estimados': max(1, round(walk_minutes + transit_minutes)),
                    'precision': 'Ruta institucional calculada con geometría vial del motor de routing cuando está disponible; usa fallback por línea recta solo si no hay red vial.',
                })
    alternatives.sort(
        key=lambda item: (
            item['caminar_origen_metros'] + item['caminar_destino_metros'],
            item['minutos_totales_estimados'],
            item['distancia_colectivo_metros'],
        )
    )
    return alternatives[:5]
