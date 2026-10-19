// frontend/src/pantallas/rutasConatacoch.js

export const COLORES_RUTAS = [
  '#149E2D', '#E67E22', '#8E44AD', '#2878D7', '#D81B60', 
  '#795548', '#3949AB', '#00897B', '#F4511E', '#6D4C41', 
  '#7CB342', '#5E35B1', '#00ACC1', '#C0CA33', '#8D6E63'
];

// Calcula la distancia exacta en metros entre dos puntos
const calcularDistanciaMetros = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

// Genera un punto cada 10 cm exactos para obligar al mapa a seguir el asfalto
const generarPuntosCada10cm = (esquinas) => {
  const rutaDensa = [];
  const DISTANCIA_METROS = 0.1; 

  for (let i = 0; i < esquinas.length - 1; i++) {
    const p1 = esquinas[i];
    const p2 = esquinas[i + 1];
    
    const dist = calcularDistanciaMetros(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
    const numPuntos = Math.max(2, Math.floor(dist / DISTANCIA_METROS));

    for (let j = 0; j <= numPuntos; j++) {
      if (i > 0 && j === 0) continue; // No duplicar la esquina
      const fraccion = j / numPuntos;
      rutaDensa.push({
        latitude: p1.latitude + (p2.latitude - p1.latitude) * fraccion,
        longitude: p1.longitude + (p2.longitude - p1.longitude) * fraccion,
      });
    }
  }
  return rutaDensa;
};

// COORDENADAS RECALIBRADAS (Cuadrícula perfecta en 90 grados)
const esquinasIda_233003 = [
  { latitude: -33.5385, longitude: -70.6335 }, // Inicio: Santa Rosa altura Alborada
  { latitude: -33.5510, longitude: -70.6335 }, // Baja recto por Santa Rosa hasta Canto General
  
  { latitude: -33.5510, longitude: -70.6225 }, // Gira 90° y va por Canto General hasta Sofía Eastman
  
  { latitude: -33.5410, longitude: -70.6225 }, // Sube recto 90° por Sofía Eastman hasta Diagonal
  
  { latitude: -33.5395, longitude: -70.6260 }, // Diagonal Sur Oriente
  { latitude: -33.5385, longitude: -70.6260 }, // Empalme con Alborada
  
  { latitude: -33.5385, longitude: -70.6335 }, // Gira 90° por Alborada y vuelve a Santa Rosa
  
  { latitude: -33.5345, longitude: -70.6335 }, // Sube recto por Santa Rosa hasta Tomé
  
  { latitude: -33.5345, longitude: -70.6190 }, // Gira 90° por Tomé hasta Punta Arenas
  
  { latitude: -33.5280, longitude: -70.6190 }, // Sube recto por Punta Arenas (Término Ida)
];

const esquinasRegreso_233003 = [
  { latitude: -33.5280, longitude: -70.6190 }, // Inicio Regreso en Punta Arenas
  { latitude: -33.5345, longitude: -70.6190 }, // Baja recto hasta Tomé
  
  { latitude: -33.5345, longitude: -70.6335 }, // Gira 90° por Tomé y vuelve a Santa Rosa
  
  { latitude: -33.5375, longitude: -70.6335 }, // Baja recto por Santa Rosa hasta Vespucio Sur
  
  { latitude: -33.5375, longitude: -70.6280 }, // Gira por Vespucio Sur hasta Manuel Rodríguez
  
  { latitude: -33.5415, longitude: -70.6265 }, // Baja en diagonal por Manuel Rodríguez hasta Tacora
  
  { latitude: -33.5450, longitude: -70.6265 }, // Baja por Tacora
  { latitude: -33.5450, longitude: -70.6225 }, // Gira 90° para conectar con Sofía Eastman
  
  { latitude: -33.5480, longitude: -70.6225 }, // Baja por Sofía Eastman hasta Benjamín Subercaseaux
  
  { latitude: -33.5480, longitude: -70.6335 }, // Gira 90° por Benjamín Subercaseaux hacia Santa Rosa
  
  { latitude: -33.5510, longitude: -70.6335 }, // Baja final por Santa Rosa hasta Canto General
];

export const rutasConatacoch = [
  {
    folio: '233003',
    color: COLORES_RUTAS[0],
    callesIda: [
      'AV. SANTA ROSA', 'CANTO GENERAL', 'SOFIA EASTMAN DE HUNNEUS',
      'DIAGONAL SUR ORIENTE', 'ALBORADA', 'AV. SANTA ROSA', 'TOME', 'PUNTA ARENAS'
    ],
    coordenadasIda: generarPuntosCada10cm(esquinasIda_233003),
    callesRegreso: [
      'PUNTA ARENAS', 'TOME', 'AV. SANTA ROSA', 'AV. CIRCUNVALACION AMERICO VESPUCIO(VIA LOCAL SUR)',
      'AV. MANUEL RODRIGUEZ', 'TACORA', 'SOFIA EASTMAN DE HUNNEUS', 'BENJAMIN SUBERCASEAUX', 'AV. SANTA ROSA'
    ],
    coordenadasRegreso: generarPuntosCada10cm(esquinasRegreso_233003),
  },

  { folio: '233005', color: COLORES_RUTAS[1], callesIda: [], coordenadasIda: [], callesRegreso: [], coordenadasRegreso: [] },
  { folio: '233012', color: COLORES_RUTAS[2], callesIda: [], coordenadasIda: [], callesRegreso: [], coordenadasRegreso: [] },
  { folio: '233016', color: COLORES_RUTAS[3], callesIda: [], coordenadasIda: [], callesRegreso: [], coordenadasRegreso: [] },
  { folio: '235003', color: COLORES_RUTAS[4], callesIda: [], coordenadasIda: [], callesRegreso: [], coordenadasRegreso: [] },
  { folio: '235011', color: COLORES_RUTAS[5], callesIda: [], coordenadasIda: [], callesRegreso: [], coordenadasRegreso: [] },
  { folio: '235026', color: COLORES_RUTAS[6], callesIda: [], coordenadasIda: [], callesRegreso: [], coordenadasRegreso: [] },
  { folio: '235036', color: COLORES_RUTAS[7], callesIda: [], coordenadasIda: [], callesRegreso: [], coordenadasRegreso: [] },
  { folio: '235054', color: COLORES_RUTAS[8], callesIda: [], coordenadasIda: [], callesRegreso: [], coordenadasRegreso: [] },
  { folio: '235061', color: COLORES_RUTAS[9], callesIda: [], coordenadasIda: [], callesRegreso: [], coordenadasRegreso: [] },
  { folio: '235066', color: COLORES_RUTAS[10], callesIda: [], coordenadasIda: [], callesRegreso: [], coordenadasRegreso: [] },
  { folio: '235071', color: COLORES_RUTAS[11], callesIda: [], coordenadasIda: [], callesRegreso: [], coordenadasRegreso: [] },
  { folio: '235098', color: COLORES_RUTAS[12], callesIda: [], coordenadasIda: [], callesRegreso: [], coordenadasRegreso: [] },
  { folio: '239001', color: COLORES_RUTAS[13], callesIda: [], coordenadasIda: [], callesRegreso: [], coordenadasRegreso: [] },
  { folio: '239009', color: COLORES_RUTAS[14], callesIda: [], coordenadasIda: [], callesRegreso: [], coordenadasRegreso: [] }
];
