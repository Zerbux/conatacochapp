import math
import re
import time
import unicodedata
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from core.models import Ruta, TrazadoRuta, Vehiculo, VehiculoRuta


class Command(BaseCommand):
    help = 'Importa trazados y vehículos de La Granja desde el Excel CONATACOCH.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--archivo',
            default='Transporte Público - Julio 2026 (1).xlsx',
            help='Ruta al archivo Excel (por defecto, la raíz del proyecto).',
        )
        parser.add_argument(
            '--aplicar', action='store_true',
            help='Escribe los registros en PostgreSQL. Sin esta opción solo valida y muestra el resumen.',
        )
        parser.add_argument(
            '--reemplazar-trazados', action='store_true',
            help='Elimina puntos anteriores de los folios importados antes de cargarlos nuevamente.',
        )

    def handle(self, *args, **options):
        try:
            import pandas as pd
            from geopy.exc import GeocoderServiceError, GeocoderTimedOut
            from geopy.geocoders import Nominatim
        except ImportError as error:
            raise CommandError(
                'Faltan dependencias del importador. Instálalas en el entorno de Django con: '
                'pip install pandas openpyxl geopy'
            ) from error

        file_path = Path(options['archivo'])
        if not file_path.is_absolute():
            file_path = Path(settings.BASE_DIR) / file_path
        if not file_path.is_file():
            raise CommandError(f'No se encontró el Excel: {file_path}')

        try:
            traces = pd.read_excel(
                file_path,
                sheet_name='Trazados',
                usecols=['FOLIO', 'NOMBRE_RECORRIDO', 'ORDEN', 'SENTIDO', 'CALLE', 'COMUNA'],
                dtype={'FOLIO': 'string', 'SENTIDO': 'string', 'CALLE': 'string', 'COMUNA': 'string'},
            )
            vehicles = pd.read_excel(
                file_path,
                sheet_name='Vehículos',
                usecols=['FOLIO', 'PPU', 'MARCA', 'MODELO', 'ANO_FABRICACION', 'CAPACIDAD'],
                dtype={'FOLIO': 'string', 'PPU': 'string'},
            )
        except Exception as error:
            raise CommandError(f'No se pudieron leer las hojas o columnas requeridas: {error}') from error

        traces['COMUNA'] = traces['COMUNA'].fillna('').str.strip()
        traces = traces[traces['COMUNA'].str.contains('LA GRANJA', case=False, na=False)].copy()
        traces['FOLIO'] = traces['FOLIO'].map(self.clean_folio)
        traces['ORDEN_NUM'] = pd.to_numeric(traces['ORDEN'], errors='coerce')
        traces['SENTIDO'] = traces['SENTIDO'].fillna('').str.strip().str.upper()
        traces['CALLE'] = traces['CALLE'].fillna('').str.strip()
        traces = traces[
            traces['FOLIO'].notna()
            & traces['ORDEN_NUM'].notna()
            & (traces['ORDEN_NUM'] % 1 == 0)
            & traces['SENTIDO'].isin(['IDA', 'REGRESO'])
            & traces['CALLE'].ne('')
        ].copy()
        traces['ORDEN_NUM'] = traces['ORDEN_NUM'].astype(int)
        traces = traces.drop_duplicates(['FOLIO', 'SENTIDO', 'ORDEN_NUM'], keep='last')
        traces = traces.sort_values(['FOLIO', 'SENTIDO', 'ORDEN_NUM'], kind='stable')

        route_folios = set(traces['FOLIO'])
        vehicles['FOLIO'] = vehicles['FOLIO'].map(self.clean_folio)
        vehicles['PPU'] = vehicles['PPU'].fillna('').str.strip().str.upper()
        vehicles = vehicles[vehicles['FOLIO'].isin(route_folios) & vehicles['PPU'].ne('')].copy()
        vehicles = vehicles.drop_duplicates(['FOLIO', 'PPU'], keep='last')

        if traces.empty:
            raise CommandError('No hay trazados válidos de La Granja en la hoja Trazados.')
        self.stdout.write(self.style.SUCCESS(
            f"Validación lista: {len(route_folios)} rutas, {len(traces)} puntos de trazado "
            f"y {len(vehicles)} asociaciones vehículo/ruta."
        ))
        if not options['aplicar']:
            self.stdout.write(self.style.WARNING(
                'Modo revisión: no se modificó PostgreSQL. Agrega --aplicar para importar.'
            ))
            return

        geolocator = Nominatim(user_agent='conatacoch_app_route_import/1.0', timeout=15)
        geocoded = {}
        unique_streets = traces[['CALLE', 'COMUNA']].drop_duplicates().itertuples(index=False, name=None)
        for index, (street, commune) in enumerate(unique_streets, start=1):
            location = None
            for query in self.geocode_queries(street, commune):
                for attempt in range(3):
                    try:
                        location = geolocator.geocode(query, exactly_one=True, country_codes='cl')
                        break
                    except (GeocoderTimedOut, GeocoderServiceError):
                        if attempt == 2:
                            break
                        time.sleep(2 ** attempt)
                    finally:
                        time.sleep(1.1)  # Nominatim requiere espaciar cada consulta.
                if location is not None:
                    break
            if location is None:
                self.stdout.write(self.style.WARNING(f'Punto a ubicar entre calles vecinas: {street}'))
            else:
                geocoded[(street, commune)] = (location.latitude, location.longitude)
                self.stdout.write(f'Geocodificadas {index} de las calles distintas: {street}')

        route_rows = {}
        for folio, rows in traces.groupby('FOLIO', sort=True):
            ida = rows[rows['SENTIDO'] == 'IDA'].sort_values('ORDEN_NUM')
            first_row = rows.iloc[0]
            route_name = str(first_row['NOMBRE_RECORRIDO']).strip()
            if not route_name or route_name.lower() == 'nan':
                route_name = f'Ruta {folio}'
            route_rows[folio] = {
                'nombre': route_name[:100],
                'origen': str(ida.iloc[0]['CALLE'])[:100] if not ida.empty else str(first_row['CALLE'])[:100],
                'destino': str(ida.iloc[-1]['CALLE'])[:100] if not ida.empty else str(first_row['CALLE'])[:100],
                'rows': rows,
            }

        trace_coordinates = {}
        interpolated_by_route = {}
        for folio, data in route_rows.items():
            interpolated_count = 0
            for direction in ('IDA', 'REGRESO'):
                direction_rows = data['rows'][data['rows']['SENTIDO'] == direction].sort_values('ORDEN_NUM')
                points = list(direction_rows.itertuples(index=False))
                known = {
                    index: geocoded[(row.CALLE, row.COMUNA)]
                    for index, row in enumerate(points)
                    if (row.CALLE, row.COMUNA) in geocoded
                }
                if points and not known:
                    raise CommandError(f'No se pudo ubicar ningun punto de la ruta {folio} ({direction}).')
                known_indices = sorted(known)
                for index, row in enumerate(points):
                    if index in known:
                        coordinate = known[index]
                    else:
                        before = [candidate for candidate in known_indices if candidate < index]
                        after = [candidate for candidate in known_indices if candidate > index]
                        if before and after:
                            low, high = before[-1], after[0]
                            ratio = (index - low) / (high - low)
                            coordinate = (
                                known[low][0] + (known[high][0] - known[low][0]) * ratio,
                                known[low][1] + (known[high][1] - known[low][1]) * ratio,
                            )
                        else:
                            coordinate = known[before[-1] if before else after[0]]
                        interpolated_count += 1
                    trace_coordinates[(folio, direction, int(row.ORDEN_NUM))] = coordinate
            interpolated_by_route[folio] = interpolated_count

        with transaction.atomic():
            imported_routes = {}
            for folio, data in route_rows.items():
                route, _ = Ruta.objects.update_or_create(
                    folio=folio,
                    defaults={
                        'nombre': data['nombre'],
                        'origen': data['origen'],
                        'destino': data['destino'],
                        'descripcion': (
                            'Calles y orden importados del Excel oficial de La Granja. '
                            f'{interpolated_by_route[folio]} punto(s) tienen coordenada aproximada '
                            'interpolada entre calles cercanas.'
                        ),
                        'estado': 'ACTIVA',
                    },
                )
                imported_routes[folio] = route
                if options['reemplazar_trazados']:
                    TrazadoRuta.objects.filter(ruta=route).delete()
                for row in data['rows'].itertuples(index=False):
                    latitude, longitude = trace_coordinates[(folio, row.SENTIDO, int(row.ORDEN_NUM))]
                    TrazadoRuta.objects.update_or_create(
                        ruta=route,
                        sentido=row.SENTIDO,
                        orden=int(row.ORDEN_NUM),
                        defaults={
                            'calle': row.CALLE[:150],
                            'latitud': latitude,
                            'longitud': longitude,
                        },
                    )

            created_vehicles = 0
            for row in vehicles.itertuples(index=False):
                capacity = self.clean_capacity(row.CAPACIDAD)
                year = self.clean_year(row.ANO_FABRICACION)
                vehicle, created = Vehiculo.objects.get_or_create(
                    patente=row.PPU[:10],
                    defaults={
                        'marca': self.clean_text(row.MARCA, 'No informada', 50),
                        'modelo': self.clean_text(row.MODELO, 'No informado', 50),
                        'anio': year,
                        'capacidad': capacity,
                        'asientos_disponibles': capacity,
                        'en_servicio': False,
                    },
                )
                if created:
                    created_vehicles += 1
                VehiculoRuta.objects.get_or_create(
                    vehiculo=vehicle,
                    ruta=imported_routes[row.FOLIO],
                    defaults={'activo': True},
                )

        self.stdout.write(self.style.SUCCESS(
            f'Importación completa: {len(imported_routes)} rutas, {len(traces)} puntos y '
            f'{created_vehicles} vehículos nuevos; '
            f'{sum(interpolated_by_route.values())} puntos aproximados entre calles vecinas.'
        ))
        self.stdout.write(self.style.WARNING(
            'Los vehículos nuevos quedan fuera de servicio y sin conductor hasta que administración '
            'los asigne. Las coordenadas geocodificadas representan calles, no una geometría vial exacta.'
        ))

    @staticmethod
    def clean_folio(value):
        if value is None:
            return None
        text = str(value).strip()
        if not text or text.lower() in ('nan', '<na>', 'nat', 'none'):
            return None
        try:
            number = float(text)
            if math.isfinite(number) and number.is_integer():
                return str(int(number))
        except ValueError:
            pass
        return text

    @staticmethod
    def clean_text(value, fallback, limit):
        if value is None or str(value).strip().lower() in ('', 'nan', '<na>', 'none'):
            return fallback
        return str(value).strip()[:limit]

    @staticmethod
    def clean_capacity(value):
        try:
            if value is None or math.isnan(float(value)):
                return 4
            return max(1, min(4, int(float(value))))
        except (TypeError, ValueError):
            return 4

    @staticmethod
    def clean_year(value):
        try:
            if value is None or math.isnan(float(value)):
                return 2015
            return max(1900, min(2100, int(float(value))))
        except (TypeError, ValueError):
            return 2015

    @staticmethod
    def geocode_queries(street, commune):
        """Try the workbook label and common cleaned/expanded street forms."""
        clean = re.sub(r'\([^)]*\)', ' ', street)
        clean = re.sub(r'\s+', ' ', clean).strip(' ,-/')
        ascii_clean = unicodedata.normalize('NFKD', clean).encode('ascii', 'ignore').decode('ascii')
        variants = [street, clean, ascii_clean]
        for value in (clean, ascii_clean):
            prefixes = (
                'TRAZADO FERIA EJE ', 'TRAZADO REVERSIBILIDAD EJE ',
                'TRAZADO CIERRE ', 'ENLACE ALT. ', 'ENLACE ', 'INGRESO ',
                'SALIDA ', 'RETORNO ', 'CORREDOR ', 'AUTOPISTA ',
            )
            for prefix in prefixes:
                if value.upper().startswith(prefix):
                    variants.append(value[len(prefix):])
            for suffix in (' AL ORIENTE', ' AL PONIENTE', ' AL NORTE', ' AL SUR'):
                if value.upper().endswith(suffix):
                    variants.append(value[:-len(suffix)])
            for separator in ('/', ' - '):
                variants.extend(part.strip() for part in value.split(separator) if part.strip())
            variants.append(re.sub(r'^AV\.?\s+', 'AVENIDA ', value, flags=re.IGNORECASE))
            variants.append(re.sub(r'^PJE\.?\s+', 'PASAJE ', value, flags=re.IGNORECASE))
        queries = []
        for value in variants:
            value = value.strip()
            if value:
                query = f'{value}, {commune}, Santiago, Chile'
                if query not in queries:
                    queries.append(query)
        return queries
