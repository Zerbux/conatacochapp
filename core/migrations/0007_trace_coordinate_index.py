from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [('core', '0006_route_itinerary_variants')]

    operations = [
        migrations.AddIndex(
            model_name='trazadoruta',
            index=models.Index(fields=['latitud', 'longitud'], name='trace_lat_lon_idx'),
        ),
    ]
