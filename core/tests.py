from datetime import date
from unittest.mock import Mock, patch

from django.contrib.auth import authenticate
from django.test import SimpleTestCase
from django.urls import reverse
from rest_framework.test import APITestCase

from .models import Conductor, Licencia, Notificacion, Ruta, Usuario, Vehiculo
from .serializers import ConductorSerializer, UsuarioSerializer


class ConductorSerializerTests(SimpleTestCase):
    def test_serializes_user_email_and_latest_license_without_model_only_fields(self):
        usuario = Usuario(id=10, email='conductor@example.com')
        conductor = Conductor(
            id=20,
            usuario=usuario,
            rut='12.345.678-9',
            nombre_chofer='Nombre',
            apellido_chofer='Conductor',
            direccion='Calle 123',
            comuna='Santiago',
            fono_celular='912345678',
        )
        licencia = Licencia(
            clase='A2',
            fecha_emision=date(2025, 1, 1),
            comuna_emision='Santiago',
            fecha_vencimiento=date(2030, 1, 1),
        )
        licencias = Mock()
        licencias.order_by.return_value.first.return_value = licencia

        with patch.object(Conductor, 'licencias', licencias):
            data = ConductorSerializer(conductor).data

        self.assertEqual(data['usuario_email'], 'conductor@example.com')
        self.assertEqual(data['nombre_chofer'], 'Nombre')
        self.assertEqual(data['apellido_chofer'], 'Conductor')
        self.assertNotIn('usuario_info', data)
        self.assertEqual(data['licencia_clase'], 'A2')
        self.assertEqual(data['licencia_fecha_emision'], date(2025, 1, 1))
        self.assertEqual(data['licencia_comuna'], 'Santiago')
        self.assertEqual(data['licencia_fecha_vencimiento'], date(2030, 1, 1))
        self.assertNotIn('apellido', data)
        licencias.order_by.assert_called_once_with('-fecha_emision', '-pk')

    def test_api_views_are_registered(self):
        endpoints = {
            'usuario-list': '/api/usuarios/',
            'conductor-list': '/api/conductores/',
            'licencia-list': '/api/licencias/',
            'vehiculoruta-list': '/api/vehiculo-ruta/',
            'trazadoruta-list': '/api/trazados-ruta/',
            'emergencia-list': '/api/emergencias/',
            'notificacion-list': '/api/notificaciones/',
            'vehiculo-list': '/api/vehiculos/',
            'ruta-list': '/api/rutas/',
            'ubicacionvehiculo-list': '/api/ubicaciones/',
            'solicitud-list': '/api/solicitudes/',
            'viaje-list': '/api/viajes/',
            'calificacion-list': '/api/calificaciones/',
            'registro_conductor': '/api/registro-conductor/',
            'registro_usuario': '/api/registro-usuario/',
            'login_usuario': '/api/login/',
        }

        for route_name, expected_path in endpoints.items():
            with self.subTest(route_name=route_name):
                self.assertEqual(reverse(route_name), expected_path)

    def test_user_serializer_exposes_separate_passenger_names(self):
        usuario = Usuario(
            id=10,
            username='pasajero@example.com',
            identificador='USR-10',
            nombre_usuario='Ana',
            apellido_usuario='Pérez',
        )

        data = UsuarioSerializer(usuario).data

        self.assertEqual(data['nombre_usuario'], 'Ana')
        self.assertEqual(data['apellido_usuario'], 'Pérez')
        self.assertNotIn('first_name', data)


class RoleTokenApiTests(APITestCase):
    def setUp(self):
        self.admin = Usuario.objects.create_user(
            username='admin-test@example.test',
            email='admin-test@example.test',
            password='AdminTestPass!234',
            identificador='ADMIN-TEST',
            tipo_usuario='ADMIN',
            is_staff=True,
        )
        self.passenger = Usuario.objects.create_user(
            username='passenger-test@example.test',
            email='passenger-test@example.test',
            password='PassengerTestPass!234',
            identificador='USR-TEST',
            tipo_usuario='REGISTRADO',
            nombre_usuario='Pasajero',
            apellido_usuario='Prueba',
        )
        self.driver_user = Usuario.objects.create_user(
            username='driver-test@example.test',
            email='driver-test@example.test',
            password='DriverTestPass!234',
            identificador='COND-TEST',
            tipo_usuario='CONDUCTOR',
        )
        self.driver = Conductor.objects.create(
            usuario=self.driver_user,
            rut='12.345.678-9',
            nombre_chofer='Conductor',
            apellido_chofer='Prueba',
            direccion='Dirección ficticia',
            comuna='Santiago',
            fono_celular='900000000',
        )
        self.vehicle = Vehiculo.objects.create(
            conductor=self.driver,
            patente='TEST-01',
            marca='Marca ficticia',
            modelo='Modelo ficticio',
            anio=2024,
            capacidad=4,
            asientos_disponibles=4,
        )
        self.route = Ruta.objects.create(
            folio='TEST-ROUTE-1',
            nombre='Ruta de prueba',
            origen='Origen ficticio',
            destino='Destino ficticio',
        )

    def test_unauthenticated_requests_are_rejected_and_role_mismatch_cannot_login(self):
        response = self.client.get('/api/usuarios/')
        self.assertEqual(response.status_code, 401)

        response = self.client.post('/api/login/', {
            'credencial': self.passenger.email,
            'password': 'PassengerTestPass!234',
            'role': 'ADMIN',
        })
        self.assertEqual(response.status_code, 403)

    def test_registered_passenger_can_register_and_login_with_email(self):
        registration = self.client.post('/api/registro-usuario/', {
            'nombre_usuario': 'Pasajera',
            'apellido_usuario': 'Prueba',
            'correo': 'nueva-pasajera@example.test',
            'telefono': '912345678',
            'password': 'PassengerPass!234',
        })
        self.assertEqual(registration.status_code, 201)
        registered_user = Usuario.objects.get(email='nueva-pasajera@example.test')
        self.assertEqual(registered_user.username, 'nueva-pasajera@example.test')
        self.assertTrue(registered_user.check_password('PassengerPass!234'))
        self.assertTrue(registered_user.is_active)
        self.assertIsNotNone(authenticate(
            username=registered_user.username,
            password='PassengerPass!234',
        ))

        login = self.client.post('/api/login/', {
            'credencial': 'NUEVA-PASAJERA@example.test',
            'password': 'PassengerPass!234',
        })
        self.assertEqual(login.status_code, 200, login.data)
        self.assertTrue(login.data['key'])
        self.assertEqual(login.data['tipo_usuario'], 'REGISTRADO')

    def test_admin_can_create_request_for_selected_passenger(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/solicitudes/', {
            'usuario': self.passenger.id,
            'vehiculo': self.vehicle.id,
            'ruta': self.route.id,
            'cantidad_asientos': 1,
            'latitud_recogida': '-33.50000000',
            'longitud_recogida': '-70.60000000',
        })
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['usuario'], self.passenger.id)

    def test_driver_only_sees_own_vehicle_and_can_send_sos_to_admin(self):
        self.client.force_authenticate(user=self.driver_user)
        vehicles = self.client.get('/api/vehiculos/')
        self.assertEqual(vehicles.status_code, 200)
        self.assertEqual([item['id'] for item in vehicles.data], [self.vehicle.id])

        response = self.client.post('/api/emergencias/', {
            'observacion': 'Alerta ficticia de prueba',
            'latitud': '-33.50000000',
            'longitud': '-70.60000000',
        })
        self.assertEqual(response.status_code, 201)
        self.assertEqual(Notificacion.objects.filter(usuario=self.admin, tipo='EMERGENCIA').count(), 1)

    def test_passengers_only_receive_their_own_user_record(self):
        self.client.force_authenticate(user=self.passenger)
        response = self.client.get('/api/usuarios/')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item['id'] for item in response.data], [self.passenger.id])
