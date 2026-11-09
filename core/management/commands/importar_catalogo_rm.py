from collections import defaultdict
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from core.models import Ruta, TrazadoRuta

PALETTE = ['#1565C0', '#C62828', '#EF6C00', '#6A1B9A', '#00838F', '#558B2F', '#AD1457', '#4527A0']


def text(value):
    return str(value).strip() if value is not None else ''


def folio_text(value):
    value = text(value)
    if not value:
        return ''
    try:
        number = float(value)
        if number.is_integer():
            return str(int(number))
    except ValueError:
        pass
    return value


class Command(BaseCommand):
    help = 'Importa el catálogo de recorridos de una región sin inventar coordenadas.'

    def add_arguments(self, parser):
        parser.add_argument('--archivo', default='Transporte Público - Julio 2026 (1).xlsx')
        parser.add_argument('--region', default='13')
        parser.add_argument('--comuna', default='')
        parser.add_argument('--aplicar', action='store_true', help='Guarda cambios en PostgreSQL.')
        parser.add_argument(
            '--clasificar-legadas', action='store_true',
            help='Asigna la región solo a rutas existentes cuya combinación folio/nombre aparece exclusivamente en esa región del Excel.',
        )
        parser.add_argument(
            '--actualizar-existentes', action='store_true',
            help='Actualiza metadatos y nombres de calles existentes; conserva las coordenadas guardadas.',
        )

    def handle(self, *args, **options):
        try:
            from openpyxl import load_workbook
        except ImportError as error:
            raise CommandError('Instala openpyxl para leer el archivo Excel.') from error

        path = Path(options['archivo'])
        if not path.is_absolute():
            path = Path(settings.BASE_DIR) / path
        if not path.is_file():
            raise CommandError(f'No se encontró el archivo: {path}')

        workbook = load_workbook(path, read_only=True, data_only=True)
        try:
            if 'Trazados' not in workbook.sheetnames:
                raise CommandError('El Excel no contiene la hoja Trazados.')
            iterator = workbook['Trazados'].iter_rows(values_only=True)
            header = next(iterator, None)
            columns = {text(name).upper(): index for index, name in enumerate(header or ()) if name is not None}
            required = {'REGION', 'FOLIO', 'NOMBRE_RECORRIDO', 'TIPO_TRAZADO', 'ORDEN', 'SENTIDO', 'CALLE'}
            if options['comuna']:
                required.add('COMUNA')
            missing = required - columns.keys()
            if missing:
                raise CommandError(f'Faltan columnas en Trazados: {", ".join(sorted(missing))}.')

            route_points = defaultdict(dict)
            pair_regions = defaultdict(set)
            invalid_routes = set()
            errors = []
            filtered_rows = 0
            region_code = folio_text(options['region'])
            for row_number, row in enumerate(iterator, start=2):
                row_region = folio_text(row[columns['REGION']])
                folio = folio_text(row[columns['FOLIO']])
                itinerary = text(row[columns['NOMBRE_RECORRIDO']])[:100]
                if folio and itinerary and row_region:
                    pair_regions[(folio, itinerary)].add(row_region)
                if row_region != region_code:
                    filtered_rows += 1
                    continue
                if options['comuna'] and options['comuna'].casefold() not in text(row[columns['COMUNA']]).casefold():
                    filtered_rows += 1
                    continue

                path_type = text(row[columns['TIPO_TRAZADO']]).upper()
                direction = text(row[columns['SENTIDO']]).upper()
                street = text(row[columns['CALLE']])
                try:
                    order = int(row[columns['ORDEN']])
                    if float(row[columns['ORDEN']]) != order or order < 1:
                        raise ValueError
                except (TypeError, ValueError):
                    errors.append(f'Fila {row_number}: orden inválido.')
                    continue

                route_key = (folio, itinerary)
                if (not folio or not itinerary or not street or direction not in ('IDA', 'REGRESO')
                        or path_type not in ('PRINCIPAL', 'ALTERNATIVO')):
                    errors.append(f'Fila {row_number}: folio, itinerario, sentido, tipo o calle inválidos.')
                    invalid_routes.add(route_key)
                    continue
                point_key = (path_type, direction, order)
                point = {
                    'tipo_trazado': path_type, 'sentido': direction,
                    'orden': order, 'calle': street[:150],
                }
                previous = route_points[route_key].get(point_key)
                if previous is not None and previous != point:
                    errors.append(f'{folio} / {itinerary}, {path_type} {direction} #{order}: calles duplicadas distintas.')
                    invalid_routes.add(route_key)
                else:
                    route_points[route_key][point_key] = point
        finally:
            workbook.close()

        route_payloads = {}
        incomplete = []
        for route_key, points in route_points.items():
            if route_key in invalid_routes or not points:
                continue
            path_points = {
                path_type: {
                    direction: sorted(
                        (point for point in points.values()
                         if point['tipo_trazado'] == path_type and point['sentido'] == direction),
                        key=lambda point: point['orden'],
                    )
                    for direction in ('IDA', 'REGRESO')
                }
                for path_type in ('PRINCIPAL', 'ALTERNATIVO')
            }
            complete_types = [
                path_type for path_type, directions in path_points.items()
                if directions['IDA'] and directions['REGRESO']
            ]
            if complete_types:
                selected_type = 'PRINCIPAL' if 'PRINCIPAL' in complete_types else complete_types[0]
            else:
                incomplete.append(route_key)
                available_types = [
                    path_type for path_type, directions in path_points.items()
                    if directions['IDA'] or directions['REGRESO']
                ]
                if not available_types:
                    continue
                selected_type = 'PRINCIPAL' if 'PRINCIPAL' in available_types else available_types[0]

            directions = path_points[selected_type]
            if directions['IDA']:
                route_direction = directions['IDA']
                origin, destination = route_direction[0]['calle'], route_direction[-1]['calle']
            else:
                route_direction = directions['REGRESO']
                origin, destination = route_direction[-1]['calle'], route_direction[0]['calle']
            folio, itinerary = route_key
            route_payloads[route_key] = {
                'region_code': region_code,
                'folio': folio,
                'nombre': itinerary,
                'origen': origin[:100],
                'destino': destination[:100],
                'points': points,
            }

        existing = list(Ruta.objects.filter(region_code=region_code).values(
            'id', 'region_code', 'folio', 'nombre', 'origen', 'destino',
        ))
        legacy = list(Ruta.objects.filter(region_code__isnull=True).values(
            'id', 'region_code', 'folio', 'nombre', 'origen', 'destino',
        ))
        existing_by_key = {(item['folio'], item['nombre']): item for item in existing}
        legacy_by_key = defaultdict(list)
        for item in legacy:
            legacy_by_key[(item['folio'], item['nombre'])].append(item)

        conflicts = []
        classifications = []
        for key, payload in list(route_payloads.items()):
            current = existing_by_key.get(key)
            old_records = legacy_by_key.get(key, [])
            if current is None and old_records:
                source_regions = pair_regions.get(key, set())
                can_classify = (
                    options['clasificar_legadas'] and len(old_records) == 1
                    and source_regions == {region_code}
                )
                if can_classify:
                    classifications.append(old_records[0]['id'])
                else:
                    reason = 'aparece en más de una región' if source_regions != {region_code} else 'requiere clasificación explícita o tiene duplicados'
                    conflicts.append(
                        f'{key[0]} / {key[1]}: ruta existente id {old_records[0]["id"]} sin región; {reason}.'
                    )
                    route_payloads.pop(key)
            elif current and (current['origen'] != payload['origen'] or current['destino'] != payload['destino']):
                conflicts.append(f'{key[0]} / {key[1]}: origen/destino de base de datos difieren del Excel.')

        self.stdout.write(
            f'Región {region_code}: {len(route_payloads)} folio+itinerario listos para catálogo; '
            f'{sum(len(item["points"]) for item in route_payloads.values())} puntos; '
            f'{filtered_rows} filas de otros filtros omitidas.'
        )
        self.stdout.write(
            f'Filas con errores: {len(errors)}; rutas con itinerario parcial incluidas: {len(incomplete)}; '
            f'rutas legadas a clasificar: {len(classifications)}; diferencias: {len(conflicts)}.'
        )
        for message in errors[:20]:
            self.stderr.write(self.style.WARNING(message))
        for folio, itinerary in incomplete[:20]:
            self.stderr.write(self.style.WARNING(f'{folio} / {itinerary}: se incluirá en catálogo; trazado parcial, sin geometría inventada.'))
        for message in conflicts[:20]:
            self.stderr.write(self.style.WARNING(f'Diferencia: {message}'))
        if not options['aplicar']:
            self.stdout.write(self.style.WARNING('Simulación: PostgreSQL no fue modificado; agrega --aplicar para importar.'))
            return

        created_routes = updated_routes = created_points = updated_points = 0
        with transaction.atomic():
            if classifications:
                Ruta.objects.filter(id__in=classifications, region_code__isnull=True).update(region_code=region_code)

            for (folio, itinerary), data in route_payloads.items():
                route, created = Ruta.objects.get_or_create(
                    region_code=region_code,
                    folio=folio,
                    nombre=itinerary,
                    defaults={
                        'origen': data['origen'],
                        'destino': data['destino'],
                        'color_hex': PALETTE[sum(f'{folio}|{itinerary}'.encode('utf-8')) % len(PALETTE)],
                    },
                )
                if created:
                    created_routes += 1
                elif options['actualizar_existentes']:
                    route.origen = data['origen']
                    route.destino = data['destino']
                    route.save(update_fields=['origen', 'destino'])
                    updated_routes += 1

                existing_points = {
                    (point.tipo_trazado, point.sentido, point.orden): point
                    for point in TrazadoRuta.objects.filter(ruta=route)
                }
                pending_points = []
                for point in data['points'].values():
                    key = (point['tipo_trazado'], point['sentido'], point['orden'])
                    current = existing_points.get(key)
                    if current is None:
                        pending_points.append(TrazadoRuta(
                            ruta=route,
                            tipo_trazado=point['tipo_trazado'],
                            sentido=point['sentido'],
                            orden=point['orden'],
                            calle=point['calle'],
                            latitud=None,
                            longitud=None,
                        ))
                    elif options['actualizar_existentes'] and current.calle != point['calle']:
                        current.calle = point['calle']
                        current.save(update_fields=['calle'])
                        updated_points += 1
                if pending_points:
                    TrazadoRuta.objects.bulk_create(pending_points, batch_size=1000, ignore_conflicts=True)
                    created_points += len(pending_points)

        self.stdout.write(self.style.SUCCESS(
            f'Importación: rutas creadas {created_routes}, actualizadas {updated_routes}; '
            f'rutas legadas clasificadas {len(classifications)}; puntos creados {created_points}, '
            f'actualizados {updated_points}; errores {len(errors)}.'
        ))
        self.stdout.write(self.style.WARNING(
            'El Excel aporta calles y orden, pero no coordenadas GPS. Las rutas quedan visibles en el catálogo; '
            'el trazado sobre el mapa requiere coordenadas verificadas por administración. '
            'Las coordenadas ya guardadas se conservaron.'
        ))
