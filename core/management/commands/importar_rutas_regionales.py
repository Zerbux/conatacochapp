from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Importa el catálogo de recorridos de una región desde Trazados.'

    def add_arguments(self, parser):
        parser.add_argument('--archivo', default='Transporte Público - Julio 2026 (1).xlsx')
        parser.add_argument('--region', default='13', help='Código REGIÓN; 13 corresponde a la Región Metropolitana.')
        parser.add_argument('--comuna', default='', help='Filtro opcional por comuna.')
        parser.add_argument('--aplicar', action='store_true', help='Escribe cambios en PostgreSQL.')
        parser.add_argument(
            '--clasificar-legadas', action='store_true',
            help='Clasifica rutas sin región solo si el Excel confirma que pertenecen exclusivamente a esta región.',
        )
        parser.add_argument(
            '--actualizar-existentes', action='store_true',
            help='Actualiza metadatos y calles; conserva las coordenadas guardadas.',
        )

    def handle(self, *args, **options):
        call_command(
            'importar_catalogo_rm',
            archivo=options['archivo'],
            region=options['region'],
            comuna=options['comuna'],
            aplicar=options['aplicar'],
            clasificar_legadas=options['clasificar_legadas'],
            actualizar_existentes=options['actualizar_existentes'],
        )
