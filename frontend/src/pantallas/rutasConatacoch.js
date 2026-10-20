// Route data comes from PostgreSQL. This module only normalizes the API schema.
export const COLORES_RUTAS = ['#149E2D'];

const mapTrace = (points, direction) => (points || [])
  .filter((point) => point.sentido === direction)
  .sort((left, right) => Number(left.orden) - Number(right.orden));

export function normalizarRuta(route) {
  const directionOrder = { IDA: 0, REGRESO: 1 };
  const trazados = (Array.isArray(route?.trazados) ? route.trazados : []).slice().sort((left, right) =>
    (directionOrder[left.sentido] ?? 2) - (directionOrder[right.sentido] ?? 2)
      || Number(left.orden) - Number(right.orden),
  );
  const ida = mapTrace(trazados, 'IDA');
  const regreso = mapTrace(trazados, 'REGRESO');
  const toCoordinates = (points) => points
    .map((point) => ({ latitude: Number(point.latitud), longitude: Number(point.longitud) }))
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));

  return {
    ...route,
    color: route?.color || COLORES_RUTAS[0],
    trazados,
    callesIda: ida.map((point) => point.calle).filter(Boolean),
    callesRegreso: regreso.map((point) => point.calle).filter(Boolean),
    coordenadasIda: toCoordinates(ida),
    coordenadasRegreso: toCoordinates(regreso),
    geometriaVerificada: Boolean(route?.geometriaVerificada),
  };
}

// Intentionally empty: production routes are never simulated in frontend code.
export const rutasConatacoch = [];
