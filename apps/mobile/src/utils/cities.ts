/**
 * Ciudades españolas con sus coordenadas, para elegir la ubicación del taller sin pedir
 * permiso de localización. La API guarda las coordenadas para calcular distancias, pero
 * solo muestra la ciudad (RN-6, RNF-06).
 */
export interface City {
  city: string;
  lat: number;
  lng: number;
  country: 'ES';
}

const c = (city: string, lat: number, lng: number): City => ({ city, lat, lng, country: 'ES' });

export const CITIES: City[] = [
  c('Madrid', 40.4168, -3.7038),
  c('Barcelona', 41.3874, 2.1686),
  c('Valencia', 39.4699, -0.3763),
  c('Sevilla', 37.3891, -5.9845),
  c('Málaga', 36.7213, -4.4214),
  c('Granada', 37.1773, -3.5986),
  c('Jaén', 37.7796, -3.7849),
  c('Úbeda', 38.0133, -3.3705),
  c('Córdoba', 37.8882, -4.7794),
  c('Cádiz', 36.5271, -6.2886),
  c('Almería', 36.834, -2.4637),
  c('Huelva', 37.2614, -6.9447),
  c('Murcia', 37.9922, -1.1307),
  c('Alicante', 38.3452, -0.481),
  c('Zaragoza', 41.6488, -0.8891),
  c('Bilbao', 43.263, -2.935),
  c('San Sebastián', 43.3183, -1.9812),
  c('Pamplona', 42.8125, -1.6458),
  c('Valladolid', 41.6523, -4.7245),
  c('Salamanca', 40.9701, -5.6635),
  c('Toledo', 39.8628, -4.0273),
  c('Cáceres', 39.4753, -6.3724),
  c('Oviedo', 43.3614, -5.8494),
  c('Santander', 43.4623, -3.81),
  c('A Coruña', 43.3623, -8.4115),
  c('Santiago de Compostela', 42.8782, -8.5448),
  c('Vigo', 42.2406, -8.7207),
  c('Palma', 39.5696, 2.6502),
  c('Las Palmas de Gran Canaria', 28.1235, -15.4363),
  c('Santa Cruz de Tenerife', 28.4636, -16.2518),
  c('Logroño', 42.4627, -2.445),
  c('Burgos', 42.3439, -3.6969),
];

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

export function searchCities(q: string, limit = 6): City[] {
  const n = norm(q.replace(/,.*$/, ''));
  if (!n) return CITIES.slice(0, limit);
  return CITIES.filter((x) => norm(x.city).includes(n)).slice(0, limit);
}
