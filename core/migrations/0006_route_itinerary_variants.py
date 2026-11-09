from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [('core', '0005_route_colors_nullable_coordinates')]

    operations = [
        migrations.RemoveConstraint(
            model_name='ruta', name='unique_route_region_folio',
        ),
        migrations.AlterUniqueTogether(
            name='trazadoruta', unique_together=set(),
        ),
        migrations.AddField(
            model_name='trazadoruta',
            name='tipo_trazado',
            field=models.CharField(
                choices=[('PRINCIPAL', 'Principal'), ('ALTERNATIVO', 'Alternativo')],
                default='PRINCIPAL', max_length=20,
            ),
        ),
        migrations.AddConstraint(
            model_name='ruta',
            constraint=models.UniqueConstraint(
                fields=('region_code', 'folio', 'nombre'), name='unique_route_region_folio_name',
            ),
        ),
        migrations.AddConstraint(
            model_name='trazadoruta',
            constraint=models.UniqueConstraint(
                fields=('ruta', 'sentido', 'tipo_trazado', 'orden'), name='unique_trace_path_order',
            ),
        ),
    ]
