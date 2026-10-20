import secrets

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from core.models import Conductor, Licencia, Ruta, Usuario, Vehiculo, VehiculoRuta


class Command(BaseCommand):
    help = 'Crea un conjunto ficticio e idempotente para probar CONATACOCH localmente.'

    @transaction.atomic
    def handle(self, *args, **options):
        passenger, passenger_password = self._ensure_user(
            email='pasajero.demo@example.test',
            identifier='USR-DEMO-SEED',
            role='REGISTRADO',
            nombre='Pasajera',
            apellido='Demostración',
        )
        driver_user, driver_password = self._ensure_user(
            email='conductor.demo@example.test',
            identifier='COND-DEMO-SEED',
            role='CONDUCTOR',
        )
        self._ensure_user(
            email='admin.demo@example.test',
            identifier='ADMIN-DEMO-SEED',
            role='ADMIN',
            is_staff=True,
        )

        driver, created = Conductor.objects.get_or_create(
            usuario=driver_user,
            defaults={
                'rut': '00.000.000-0',
                'nombre_chofer': 'Conductor',
                'apellido_chofer': 'Demostración',
                'direccion': 'Dirección ficticia 123',
                'comuna': 'Comuna de prueba',
                'fono_celular': '900000000',
            },
        )
        if not created and driver.rut != '00.000.000-0':
            raise CommandError('La cuenta demo de conductor ya está vinculada a un perfil diferente.')
        if Conductor.objects.filter(rut='00.000.000-0').exclude(pk=driver.pk).exists():
            raise CommandError('El RUT reservado para la demostración ya pertenece a otro conductor.')

        if not Licencia.objects.filter(conductor=driver).exists():
            Licencia.objects.create(
                conductor=driver,
                clase='A2',
                fecha_emision=timezone.localdate().replace(year=timezone.localdate().year - 1),
                comuna_emision='Comuna de prueba',
                fecha_vencimiento=timezone.localdate().replace(year=timezone.localdate().year + 3),
            )

        vehicle, created = Vehiculo.objects.get_or_create(
            patente='DEMO-001',
            defaults={
                'conductor': driver,
                'marca': 'Marca de prueba',
                'modelo': 'Modelo de prueba',
                'anio': timezone.localdate().year,
                'capacidad': 4,
                'asientos_disponibles': 4,
            },
        )
        if not created and vehicle.conductor_id != driver.id:
            raise CommandError('La patente demo ya está asignada a otro conductor.')

        route, _ = Ruta.objects.get_or_create(
            folio='DEMO-1',
            defaults={
                'nombre': 'Ruta de demostración',
                'origen': 'Origen de prueba',
                'destino': 'Destino de prueba',
                'descripcion': 'Datos ficticios para pruebas locales; sin trazado geográfico.',
            },
        )
        VehiculoRuta.objects.get_or_create(vehiculo=vehicle, ruta=route)

        self.stdout.write(self.style.SUCCESS(
            f'Datos demo listos: usuario pasajero #{passenger.pk}, conductor #{driver.pk}, '
            f'vehículo #{vehicle.pk}, ruta #{route.pk}. No se crearon solicitudes ni coordenadas ficticias.'
        ))
        for label, email, password in (
            ('Pasajero', passenger.email, passenger_password),
            ('Conductor', driver_user.email, driver_password),
        ):
            if password:
                self.stdout.write(f'Contraseña inicial de {label} ({email}): {password}')

    def _ensure_user(
        self,
        *,
        email,
        identifier,
        role,
        nombre='',
        apellido='',
        is_staff=False,
    ):
        user = Usuario.objects.filter(email__iexact=email).first()
        if user:
            if user.identificador != identifier or user.tipo_usuario != role:
                raise CommandError(f'La cuenta reservada {email} ya existe con otros datos.')
            return user, None
        if Usuario.objects.filter(identificador=identifier).exists():
            raise CommandError(f'El identificador reservado {identifier} ya está en uso.')

        password = secrets.token_urlsafe(18)
        user = Usuario(
            username=email,
            email=email,
            identificador=identifier,
            tipo_usuario=role,
            nombre_usuario=nombre,
            apellido_usuario=apellido,
            is_staff=is_staff,
        )
        user.set_password(password)
        user.save()
        return user, password
