from datetime import date
import tempfile
from unittest.mock import Mock, patch

from django.contrib.auth import authenticate
from django.test import SimpleTestCase, override_settings
from django.urls import reverse
from rest_framework.test import APITestCase
from django.core.files.uploadedfile import SimpleUploadedFile

from .models import (
    Conductor,
    Licencia,
    Notificacion,
    Ruta,
    Solicitud,
    TrazadoRuta,
    UbicacionVehiculo,
    Usuario,
    Vehiculo,
    VehiculoRuta,
)
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

    def test_anyone_can_register_without_changing_the_temporary_session(self):
        temporary_user = Usuario.objects.create_user(
            username='temporary-registration-test', password='TemporaryTestPass!234',
            identificador='USR-TEMP-TEST', tipo_usuario='TEMPORAL',
        )
        registration = self.client.post('/api/registro-usuario/', {
            'nombre_usuario': 'Pasajera',
            'apellido_usuario': 'Prueba',
            'correo': 'nueva-pasajera@example.test',
            'telefono': '912345678',
            'password': 'PassengerPass!234',
        })
        self.assertEqual(registration.status_code, 201, registration.data)
        registered_user = Usuario.objects.get(email='nueva-pasajera@example.test')
        self.assertEqual(registered_user.username, 'nueva-pasajera@example.test')
        self.assertTrue(registered_user.check_password('PassengerPass!234'))
        self.assertTrue(registered_user.is_active)
        self.assertEqual(registered_user.tipo_usuario, 'REGISTRADO')
        temporary_user.refresh_from_db()
        self.assertEqual(temporary_user.tipo_usuario, 'TEMPORAL')
        self.assertEqual(temporary_user.email, '')
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

    def test_temporary_passenger_can_start_a_match_without_registering(self):
        temporary_user = Usuario.objects.create_user(
            username='temporary-match-test',
            password='TemporaryTestPass!234',
            identificador='USR-TEMP-MATCH-TEST',
            tipo_usuario='TEMPORAL',
        )
        self.vehicle.en_servicio = True
        self.vehicle.save(update_fields=['en_servicio'])
        VehiculoRuta.objects.create(vehiculo=self.vehicle, ruta=self.route)
        UbicacionVehiculo.objects.create(
            vehiculo=self.vehicle,
            latitud='-33.50000000',
            longitud='-70.60000000',
        )
        self.client.force_authenticate(user=temporary_user)

        response = self.client.post('/api/solicitudes/', {
            'vehiculo': self.vehicle.id,
            'ruta': self.route.id,
            'cantidad_asientos': 1,
            'latitud_recogida': '-33.50000000',
            'longitud_recogida': '-70.60000000',
        })

        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data['usuario_tipo'], 'TEMPORAL')

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

    def test_admin_can_set_route_color_but_passenger_cannot_edit_route(self):
        self.client.force_authenticate(user=self.admin)
        created = self.client.post('/api/rutas/', {
            'region_code': '13', 'folio': 'TEST-COLOR-1', 'nombre': 'Ruta color', 'origen': 'Inicio',
            'destino': 'Fin', 'estado': 'ACTIVA', 'color_hex': '#23AB45',
        })
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data['color_hex'], '#23AB45')

        same_folio_other_itinerary = self.client.post('/api/rutas/', {
            'region_code': '13', 'folio': 'TEST-COLOR-1', 'nombre': 'Itinerario 2',
            'origen': 'Inicio alternativo', 'destino': 'Fin alternativo', 'color_hex': '#C62828',
        })
        same_folio_other_region = self.client.post('/api/rutas/', {
            'region_code': '5', 'folio': 'TEST-COLOR-1', 'nombre': 'Ruta color',
            'origen': 'Inicio', 'destino': 'Fin', 'color_hex': '#EF6C00',
        })
        self.assertEqual(same_folio_other_itinerary.status_code, 201, same_folio_other_itinerary.data)
        self.assertEqual(same_folio_other_region.status_code, 201, same_folio_other_region.data)

        self.client.force_authenticate(user=self.passenger)
        update = self.client.patch(f"/api/rutas/{created.data['id']}/", {'nombre': 'No autorizado'})
        self.assertEqual(update.status_code, 403)

    def test_route_image_upload_replace_remove_and_read_permissions(self):
        with tempfile.TemporaryDirectory() as media_root, override_settings(MEDIA_ROOT=media_root):
            self.client.force_authenticate(user=self.admin)
            first_image = SimpleUploadedFile(
                'route.png', b'\x89PNG\r\n\x1a\nfirst-image', content_type='image/png',
            )
            created = self.client.post('/api/rutas/', {
                'region_code': '13',
                'folio': 'TEST-IMAGE-1',
                'nombre': 'Ruta con imagen',
                'origen': 'Centro',
                'destino': 'Terminal',
                'color_hex': '#1565C0',
                'imagen': first_image,
            }, format='multipart')
            self.assertEqual(created.status_code, 201, created.data)
            self.assertTrue(created.data['imagen'].endswith('.png'))
            listing = self.client.get('/api/rutas/')
            listed = next(item for item in listing.data if item['id'] == created.data['id'])
            self.assertEqual(listed['imagen'], created.data['imagen'])
            route = Ruta.objects.get(pk=created.data['id'])
            old_image_name = route.imagen.name
            self.assertTrue(route.imagen.storage.exists(old_image_name))

            replacement_image = SimpleUploadedFile(
                'replacement.jpg', bytes((255, 216, 255)) + b'replacement', content_type='image/jpeg',
            )
            updated = self.client.patch(
                f'/api/rutas/{route.id}/', {'imagen': replacement_image}, format='multipart',
            )
            self.assertEqual(updated.status_code, 200, updated.data)
            route.refresh_from_db()
            new_image_name = route.imagen.name
            self.assertNotEqual(new_image_name, old_image_name)
            self.assertFalse(route.imagen.storage.exists(old_image_name))

            self.client.force_authenticate(user=self.passenger)
            forbidden = self.client.patch(
                f'/api/rutas/{route.id}/', {'nombre': 'Cambio prohibido'}, format='multipart',
            )
            self.assertEqual(forbidden.status_code, 403)

            self.client.force_authenticate(user=self.admin)
            removed = self.client.patch(
                f'/api/rutas/{route.id}/', {'eliminar_imagen': 'true'}, format='multipart',
            )
            self.assertEqual(removed.status_code, 200, removed.data)
            route.refresh_from_db()
            self.assertFalse(route.imagen)
            self.assertFalse(route.imagen.storage.exists(new_image_name))
            self.assertIsNone(removed.data['imagen'])

    def test_route_image_rejects_non_image_content(self):
        self.client.force_authenticate(user=self.admin)
        upload = SimpleUploadedFile('not-an-image.jpg', b'text instead', content_type='image/jpeg')
        response = self.client.post('/api/rutas/', {
            'region_code': '13',
            'folio': 'TEST-IMAGE-BAD',
            'nombre': 'Ruta invalida',
            'origen': 'Centro',
            'destino': 'Terminal',
            'imagen': upload,
        }, format='multipart')
        self.assertEqual(response.status_code, 400, response.data)

    def test_route_delete_deactivates_without_cascading_history(self):
        historical_request = Solicitud.objects.create(
            usuario=self.passenger, vehiculo=self.vehicle, ruta=self.route,
            latitud_recogida='-33.50000000', longitud_recogida='-70.60000000',
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.delete(f'/api/rutas/{self.route.id}/')
        self.assertEqual(response.status_code, 204)
        self.route.refresh_from_db()
        self.assertEqual(self.route.estado, 'INACTIVA')
        self.assertTrue(Solicitud.objects.filter(pk=historical_request.pk).exists())

    def test_traces_can_be_imported_without_fabricated_coordinates(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post('/api/trazados-ruta/', {
            'ruta': self.route.id, 'sentido': 'IDA', 'orden': 1, 'calle': 'Calle sin GPS',
        })
        self.assertEqual(response.status_code, 201, response.data)
        self.assertIsNone(response.data['latitud'])
        self.assertIsNone(response.data['longitud'])

        incomplete = self.client.post('/api/trazados-ruta/', {
            'ruta': self.route.id, 'sentido': 'IDA', 'orden': 2,
            'calle': 'Coordenada parcial', 'latitud': -33.5,
        })
        self.assertEqual(incomplete.status_code, 400)

    def test_route_list_keeps_streets_but_only_returns_mapped_points(self):
        TrazadoRuta.objects.create(ruta=self.route, sentido='IDA', orden=1, calle='Calle sin GPS')
        TrazadoRuta.objects.create(
            ruta=self.route, sentido='IDA', orden=2, calle='Punto con GPS',
            latitud=-33.5, longitud=-70.6,
        )
        self.client.force_authenticate(user=self.passenger)
        listing = self.client.get('/api/rutas/')
        item = next(route for route in listing.data if route['id'] == self.route.id)
        self.assertEqual(item['calles_ida'], ['Calle sin GPS', 'Punto con GPS'])
        self.assertEqual(len(item['trazados']), 0)
        detail = self.client.get(f'/api/rutas/{self.route.id}/')
        self.assertEqual(len(detail.data['trazados']), 2)

    def test_trip_planner_uses_directional_geometry_and_returns_estimates(self):
        for order, latitude in enumerate((-33.50, -33.49, -33.48), start=1):
            TrazadoRuta.objects.create(
                ruta=self.route, sentido='IDA', orden=order, calle=f'Calle {order}',
                latitud=latitude, longitud=-70.60,
            )
            TrazadoRuta.objects.create(
                ruta=self.route, sentido='IDA', tipo_trazado='ALTERNATIVO', orden=order,
                calle=f'Alternativa {order}', latitud=latitude, longitud=-70.599,
            )
        self.client.force_authenticate(user=self.passenger)
        response = self.client.post('/api/rutas/planificar/', {
            'origen': {'latitud': -33.5005, 'longitud': -70.60},
            'destino': {'latitud': -33.4795, 'longitud': -70.60},
        }, format='json')
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data['ruta_recomendada']['ruta']['id'], self.route.id)
        self.assertEqual(response.data['ruta_recomendada']['sentido'], 'IDA')
        self.assertGreater(response.data['ruta_recomendada']['distancia_colectivo_metros'], 0)
        self.assertIn('línea recta', response.data['ruta_recomendada']['precision'])
        self.assertIn('ALTERNATIVO', {item['tipo_trazado'] for item in response.data['alternativas']})

    def test_trip_planner_and_match_ignore_incomplete_geometry(self):
        TrazadoRuta.objects.create(
            ruta=self.route, sentido='IDA', orden=1, calle='Punto con GPS',
            latitud=-33.50, longitud=-70.60,
        )
        TrazadoRuta.objects.create(
            ruta=self.route, sentido='IDA', orden=2, calle='Punto sin GPS',
        )
        self.client.force_authenticate(user=self.passenger)
        planned = self.client.post('/api/rutas/planificar/', {
            'origen': {'latitud': -33.5005, 'longitud': -70.60},
            'destino': {'latitud': -33.4995, 'longitud': -70.60},
        }, format='json')
        self.assertEqual(planned.status_code, 200, planned.data)
        self.assertEqual(planned.data['alternativas'], [])

        matched = self.client.get('/api/rutas/match/?latitude=-33.50&longitude=-70.60')
        self.assertEqual(matched.status_code, 200, matched.data)
        self.assertIsNone(matched.data['ruta'])

    def test_trip_planner_rejects_invalid_coordinates(self):
        self.client.force_authenticate(user=self.passenger)
        response = self.client.post('/api/rutas/planificar/', {
            'origen': {'latitud': 120, 'longitud': -70},
            'destino': {'latitud': -33, 'longitud': -70},
        }, format='json')
        self.assertEqual(response.status_code, 400)
