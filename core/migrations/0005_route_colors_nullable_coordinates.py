import django.core.validators
from django.db import migrations, models

PALETTE = ['#1565C0', '#C62828', '#EF6C00', '#6A1B9A', '#00838F', '#558B2F', '#AD1457', '#4527A0']


def assign_route_colors(apps, schema_editor):
    Ruta = apps.get_model('core', 'Ruta')
    batch = []
    for index, route in enumerate(Ruta.objects.order_by('pk').iterator()):
        route.color_hex = PALETTE[index % len(PALETTE)]
        batch.append(route)
        if len(batch) == 500:
            Ruta.objects.bulk_update(batch, ['color_hex'])
            batch.clear()
    if batch:
        Ruta.objects.bulk_update(batch, ['color_hex'])

class Migration(migrations.Migration):

    dependencies = [('core', '0004_vehiculo_asientos_disponibles_vehiculo_en_servicio_and_more')]

    operations = [
        migrations.AddField(
            model_name='ruta',
            name='color_hex',
            field=models.CharField(
                default='#1565C0', max_length=7,
                validators=[django.core.validators.RegexValidator('^#[0-9A-Fa-f]{6}$', 'Usa un color HEX con formato #RRGGBB.')],
            ),
        ),
        migrations.AddField(
            model_name='ruta', name='region_code',
            field=models.CharField(
                blank=True, max_length=2, null=True,
                validators=[django.core.validators.RegexValidator('^(?:[1-9]|1[0-6])$', 'Usa el código regional oficial entre 1 y 16.')],
            ),
        ),
        migrations.AlterField(
            model_name='ruta', name='folio',
            field=models.CharField(max_length=20),
        ),
        migrations.AddConstraint(
            model_name='ruta',
            constraint=models.UniqueConstraint(fields=('region_code', 'folio'), name='unique_route_region_folio'),
        ),
        migrations.AlterField(
            model_name='trazadoruta', name='latitud',
            field=models.DecimalField(blank=True, decimal_places=8, max_digits=10, null=True),
        ),
        migrations.AlterField(
            model_name='trazadoruta', name='longitud',
            field=models.DecimalField(blank=True, decimal_places=8, max_digits=11, null=True),
        ),
        migrations.RunPython(assign_route_colors, migrations.RunPython.noop),
    ]
