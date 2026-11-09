// Route data comes from PostgreSQL. This module only normalizes the API schema.
const mapTrace = (points, direction, type = 'PRINCIPAL') => (points || [])
  .filter((point) => point.sentido === direction && (point.tipo_trazado || 'PRINCIPAL') === type)
  .sort((left, right) => Number(left.orden) - Number(right.orden));

export function normalizarRuta(route) {
  const directionOrder = { IDA: 0, REGRESO: 1 };
  const trazados = (Array.isArray(route?.trazados) ? route.trazados : []).slice().sort((left, right) =>
    (directionOrder[left.sentido] ?? 2) - (directionOrder[right.sentido] ?? 2)
      || Number(left.orden) - Number(right.orden),
  );
  const ida = mapTrace(trazados, 'IDA');
  const regreso = mapTrace(trazados, 'REGRESO');
  const idaAlternativa = mapTrace(trazados, 'IDA', 'ALTERNATIVO');
  const regresoAlternativa = mapTrace(trazados, 'REGRESO', 'ALTERNATIVO');
  const toCoordinates = (points) => points
    .filter((point) => point.latitud != null && point.longitud != null)
    .map((point) => ({ latitude: Number(point.latitud), longitude: Number(point.longitud) }))
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));

  return {
    ...route,
    color: route?.color_hex,
    trazados,
    callesIda: route?.calles_ida || ida.map((point) => point.calle).filter(Boolean),
    callesRegreso: route?.calles_regreso || regreso.map((point) => point.calle).filter(Boolean),
    coordenadasIda: toCoordinates(ida),
    coordenadasRegreso: toCoordinates(regreso),
    callesIdaAlternativa: route?.calles_ida_alternativa || idaAlternativa.map((point) => point.calle).filter(Boolean),
    callesRegresoAlternativa: route?.calles_regreso_alternativa || regresoAlternativa.map((point) => point.calle).filter(Boolean),
    coordenadasIdaAlternativa: toCoordinates(idaAlternativa),
    coordenadasRegresoAlternativa: toCoordinates(regresoAlternativa),
    geometriaVerificada: Boolean(route?.geometriaVerificada),
  };
}

// Intentionally empty: production routes are never simulated in frontend code.
export const rutasConatacoch = [];
