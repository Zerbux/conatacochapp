from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0008_ruta_imagen'),
    ]

    operations = [
        migrations.AddField(
            model_name='ruta',
            name='geometry',
            field=models.JSONField(blank=True, default=dict, null=True),
        ),
    ]
