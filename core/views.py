import secrets
import math
from datetime import timedelta

from django.contrib.auth import authenticate
from django.conf import settings
from django.db import transaction
from django.db.models import Avg, Prefetch, Q
from django.utils import timezone
from rest_framework import serializers, status, views, viewsets
from rest_framework.decorators import action
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied

from .models import (
    Calificacion,
    Conductor,
    Emergencia,
    Licencia,
    Notificacion,
    Ruta,
    Solicitud,
    TrazadoRuta,
    UbicacionVehiculo,
    Usuario,
    Vehiculo,
    VehiculoRuta,
    Viaje,
)
from .permissions import (
    AdminOrAuthenticatedRead,
    EmergencyAccess,
    LocationAccess,
    RatingAccess,
    RequestAccess,
    TripAccess,
    VehicleAccess,
    is_administrator,
)
from .serializers import (
    CalificacionSerializer,
    ConductorSerializer,
    EmergenciaSerializer,
    LicenciaSerializer,
    NotificacionSerializer,
    RutaSerializer,
    RutaListaSerializer,
    SolicitudSerializer,
    TrazadoRutaSerializer,
    TripPlanningSerializer,
    UbicacionSerializer,
    UsuarioSerializer,
    VehiculoRutaSerializer,
    VehiculoSerializer,
    ViajeSerializer,
)
from .services.route_planner import planificar_viaje


def is_admin_user(user):
    return is_administrator(user)


class UsuarioViewSet(viewsets.ModelViewSet):
    serializer_class = UsuarioSerializer
    permission_classes = [AdminOrAuthenticatedRead]

    def get_queryset(self):
        queryset = Usuario.objects.all()
        if not is_admin_user(self.request.user):
            queryset = queryset.filter(pk=self.request.user.pk)
        return queryset


class ConductorViewSet(viewsets.ModelViewSet):
    serializer_class = ConductorSerializer
    permission_classes = [AdminOrAuthenticatedRead]

    def get_queryset(self):
        queryset = Conductor.objects.select_related('usuario').prefetch_related(
            Prefetch(
                'licencias',
                queryset=Licencia.objects.order_by('-fecha_emision', '-pk'),
                to_attr='licencias_ordenadas',
            )
        )
        if not is_admin_user(self.request.user):
            queryset = queryset.filter(usuario=self.request.user)
        return queryset


class LicenciaViewSet(viewsets.ModelViewSet):
    serializer_class = LicenciaSerializer
    permission_classes = [AdminOrAuthenticatedRead]

    def get_queryset(self):
        queryset = Licencia.objects.select_related('conductor', 'conductor__usuario')
        if not is_admin_user(self.request.user):
            queryset = queryset.filter(conductor__usuario=self.request.user)
        return queryset


class VehiculoViewSet(viewsets.ModelViewSet):
    serializer_class = VehiculoSerializer
    permission_classes = [VehicleAccess]

    def get_queryset(self):
        queryset = Vehiculo.objects.select_related('conductor', 'conductor__usuario')
        if not is_admin_user(self.request.user):
            queryset = queryset.filter(conductor__usuario=self.request.user)
        return queryset


class RutaViewSet(viewsets.ModelViewSet):
    queryset = Ruta.objects.all()
    serializer_class = RutaSerializer
    permission_classes = [AdminOrAuthenticatedRead]

    def get_queryset(self):
        queryset = Ruta.objects.all()
        if getattr(self, 'action', None) == 'list':
            points = TrazadoRuta.objects.order_by('tipo_trazado', 'sentido', 'orden').only(
                'ruta_id', 'tipo_trazado', 'sentido', 'orden', 'calle', 'latitud', 'longitud',
            )
            return queryset.prefetch_related(Prefetch('trazados', queryset=points, to_attr='puntos_lista'))
        return queryset.prefetch_related('trazados')

    def get_serializer_class(self):
        if getattr(self, 'action', None) == 'list':
            return RutaListaSerializer
        return RutaSerializer

    def get_permissions(self):
        if getattr(self, 'action', None) == 'planificar':
            return [IsAuthenticated()]
        return super().get_permissions()

    def destroy(self, request, *args, **kwargs):
        # Las solicitudes y viajes históricos referencian la ruta. Desactivarla
        # conserva esas relaciones y evita un borrado en cascada accidental.
        route = self.get_object()
        route.estado = 'INACTIVA'
        route.save(update_fields=['estado'])
        return Response(status=status.HTTP_204_NO_CONTENT)

    @action(detail=False, methods=['post'], url_path='planificar')
    def planificar(self, request):
        input_serializer = TripPlanningSerializer(data=request.data)
        if not input_serializer.is_valid():
            return Response(input_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        alternatives = planificar_viaje(
            input_serializer.validated_data['origen'],
            input_serializer.validated_data['destino'],
        )
        formatted = []
        for alternative in alternatives:
            item = dict(alternative)
            item['ruta'] = RutaSerializer(alternative['ruta']).data
            item['ruta'].pop('trazados', None)
            formatted.append(item)
        return Response({
            'ruta_recomendada': formatted[0] if formatted else None,
            'alternativas': formatted,
            'detalle': None if formatted else 'No se encontró una ruta con coordenadas completas y puntos de subida y bajada dentro del radio permitido.',
            'radio_caminata_maximo_metros': getattr(settings, 'ROUTE_PLANNER_WALK_RADIUS_METERS', 2_000),
        })

    @action(detail=False, methods=['get'], url_path='match')
    def match(self, request):
        try:
            latitude = float(request.query_params['latitude'])
            longitude = float(request.query_params['longitude'])
        except (KeyError, TypeError, ValueError):
            return Response({'detail': 'Debes enviar latitude y longitude válidas.'}, status=status.HTTP_400_BAD_REQUEST)
        if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
            return Response({'detail': 'Las coordenadas están fuera de rango.'}, status=status.HTTP_400_BAD_REQUEST)

        max_route_distance = getattr(settings, 'MATCH_MAX_ROUTE_DISTANCE_METERS', 1000)
        max_location_age = getattr(settings, 'MATCH_LOCATION_MAX_AGE_SECONDS', 60)
        average_speed_kmh = max(1, getattr(settings, 'MATCH_AVERAGE_SPEED_KMH', 20))

        def distance_m(lat1, lon1, lat2, lon2):
            radius = 6371000
            d_lat = math.radians(lat2 - lat1)
            d_lon = math.radians(lon2 - lon1)
            value = (math.sin(d_lat / 2) ** 2 + math.cos(math.radians(lat1)) *
                     math.cos(math.radians(lat2)) * math.sin(d_lon / 2) ** 2)
            return radius * 2 * math.atan2(math.sqrt(value), math.sqrt(1 - value))

        routes = Ruta.objects.filter(estado='ACTIVA').prefetch_related('trazados').all()
        best_route, best_distance = None, float('inf')
        for route in routes:
            paths = {}
            for point in route.trazados.all():
                paths.setdefault((point.tipo_trazado, point.sentido), []).append(point)
            complete_paths = [
                point for path in paths.values()
                if len(path) > 1 and all(p.latitud is not None and p.longitud is not None for p in path)
                for point in path
            ]
            if not complete_paths:
                continue
            route_distance = min(
                distance_m(latitude, longitude, float(point.latitud), float(point.longitud))
                for point in complete_paths
            )
            if route_distance < best_distance:
                best_route, best_distance = route, route_distance
        if best_route is None or best_distance > max_route_distance:
            return Response({'ruta': None, 'distancia_metros': None, 'vehiculos': [], 'radio_maximo_metros': max_route_distance})

        assignments = VehiculoRuta.objects.filter(ruta=best_route, activo=True).select_related(
            'vehiculo', 'vehiculo__conductor'
        ).filter(
            vehiculo__en_servicio=True,
            vehiculo__estado='ACTIVO',
            vehiculo__asientos_disponibles__gt=0,
            vehiculo__conductor__isnull=False,
        )
        cutoff = timezone.now() - timedelta(seconds=max_location_age)
        candidates = []
        for assignment in assignments:
            vehicle = assignment.vehiculo
            latest = vehicle.ubicaciones.order_by('-fecha_hora', '-pk').first()
            if not latest or not latest.activo or latest.fecha_hora < cutoff:
                continue
            vehicle_distance = distance_m(latitude, longitude, float(latest.latitud), float(latest.longitud))
            conductor = vehicle.conductor
            rating = Calificacion.objects.filter(conductor=conductor).aggregate(promedio=Avg('puntaje'))['promedio']
            candidates.append({
                'id': vehicle.pk,
                'patente': vehicle.patente,
                'marca': vehicle.marca,
                'modelo': vehicle.modelo,
                'capacidad': vehicle.capacidad,
                'asientos_disponibles': vehicle.asientos_disponibles,
                'conductor_id': conductor.pk,
                'conductor_nombre': f'{conductor.nombre_chofer} {conductor.apellido_chofer}'.strip() or None,
                'latitud': float(latest.latitud),
                'longitud': float(latest.longitud),
                'fecha_hora': latest.fecha_hora,
                'distancia_metros': round(vehicle_distance),
                'eta_minutos': max(1, round(vehicle_distance / (average_speed_kmh * 1000 / 60))),
                'calificacion_promedio': round(rating, 1) if rating is not None else None,
                'cantidad_viajes': Viaje.objects.filter(solicitud__vehiculo=vehicle, estado='FINALIZADO').count(),
            })
        candidates.sort(key=lambda item: item['distancia_metros'])
        return Response({
            'ruta': RutaSerializer(best_route).data,
            'distancia_metros': round(best_distance),
            'vehiculos': candidates,
            'radio_maximo_metros': max_route_distance,
            'ubicacion_maxima_antiguedad_segundos': max_location_age,
            'tarifa_referencial_clp': getattr(settings, 'MATCH_REFERENCE_FARE_CLP', None),
        })


class TrazadoRutaViewSet(viewsets.ModelViewSet):
    queryset = TrazadoRuta.objects.select_related('ruta').all()
    serializer_class = TrazadoRutaSerializer
    permission_classes = [AdminOrAuthenticatedRead]

    def get_queryset(self):
        queryset = TrazadoRuta.objects.select_related('ruta').all()
        route_id = self.request.query_params.get('ruta')
        if route_id:
            queryset = queryset.filter(ruta_id=int(route_id)) if route_id.isdigit() else queryset.none()
        return queryset


class VehiculoRutaViewSet(viewsets.ModelViewSet):
    serializer_class = VehiculoRutaSerializer
    permission_classes = [AdminOrAuthenticatedRead]

    def get_queryset(self):
        queryset = VehiculoRuta.objects.select_related('vehiculo', 'ruta', 'vehiculo__conductor')
        if not is_admin_user(self.request.user):
            queryset = queryset.filter(vehiculo__conductor__usuario=self.request.user)
        return queryset


class UbicacionViewSet(viewsets.ModelViewSet):
    serializer_class = UbicacionSerializer
    permission_classes = [LocationAccess]

    def get_queryset(self):
        queryset = UbicacionVehiculo.objects.select_related('vehiculo', 'vehiculo__conductor')
        if not is_admin_user(self.request.user):
            queryset = queryset.filter(vehiculo__conductor__usuario=self.request.user)
        return queryset

    def perform_create(self, serializer):
        if not is_admin_user(self.request.user):
            vehicle = serializer.validated_data['vehiculo']
            if vehicle.conductor_id is None or vehicle.conductor.usuario_id != self.request.user.id:
                raise PermissionDenied('Solo puedes registrar ubicaciones para un vehículo asignado a tu cuenta.')
            serializer.save()
        else:
            serializer.save()


class SolicitudViewSet(viewsets.ModelViewSet):
    serializer_class = SolicitudSerializer
    permission_classes = [RequestAccess]

    def get_queryset(self):
        queryset = Solicitud.objects.select_related(
            'usuario', 'vehiculo', 'vehiculo__conductor', 'ruta'
        )
        if not is_admin_user(self.request.user):
            queryset = queryset.filter(
                Q(usuario=self.request.user) |
                Q(vehiculo__conductor__usuario=self.request.user)
            )
        return queryset

    def perform_create(self, serializer):
        if is_admin_user(self.request.user):
            serializer.save()
            return
        user = self.request.user
        if user.tipo_usuario not in ('TEMPORAL', 'REGISTRADO'):
            raise PermissionDenied('Solo pasajeros pueden crear solicitudes.')
        data = serializer.validated_data
        vehicle = data['vehiculo']
        route = data['ruta']
        seats = data.get('cantidad_asientos', 1)
        if not VehiculoRuta.objects.filter(vehiculo=vehicle, ruta=route, activo=True).exists():
            raise serializers.ValidationError({'vehiculo': 'El vehículo no está asociado a esta ruta.'})
        if not vehicle.en_servicio or vehicle.estado != 'ACTIVO':
            raise serializers.ValidationError({'vehiculo': 'El vehículo ya no está disponible.'})
        max_age = getattr(settings, 'MATCH_LOCATION_MAX_AGE_SECONDS', 60)
        newest_location = vehicle.ubicaciones.order_by('-fecha_hora', '-pk').first()
        if (not newest_location or not newest_location.activo or
                newest_location.fecha_hora < timezone.now() - timedelta(seconds=max_age)):
            raise serializers.ValidationError({'vehiculo': 'La ubicación del vehículo ya no está actualizada.'})
        with transaction.atomic():
            locked_vehicle = Vehiculo.objects.select_for_update().get(pk=vehicle.pk)
            if seats < 1 or seats > 4 or locked_vehicle.asientos_disponibles < seats:
                raise serializers.ValidationError({'vehiculo': 'El vehículo no tiene suficientes cupos disponibles.'})
            solicitud = serializer.save(usuario=user, estado='PENDIENTE')
            if locked_vehicle.conductor_id:
                Notificacion.objects.create(
                    usuario=locked_vehicle.conductor.usuario,
                    tipo='SOLICITUD',
                    titulo='Nueva solicitud de viaje',
                    detalle=f'Solicitud #{solicitud.pk}: {seats} asiento(s), ruta {route.folio}.',
                )

    def perform_update(self, serializer):
        with transaction.atomic():
            locked_request = Solicitud.objects.select_for_update().get(pk=serializer.instance.pk)
            serializer.instance = locked_request
            old_state = locked_request.estado
            next_state = serializer.validated_data.get('estado', old_state)
            if old_state != 'PENDIENTE' or next_state not in ('ACEPTADA', 'RECHAZADA', 'CANCELADA'):
                raise serializers.ValidationError({'estado': 'Solo una solicitud pendiente puede cambiar de estado.'})
            if next_state == 'ACEPTADA' and old_state != 'ACEPTADA':
                vehicle = Vehiculo.objects.select_for_update().get(pk=locked_request.vehiculo_id)
                seats = locked_request.cantidad_asientos
                if not vehicle.en_servicio or vehicle.asientos_disponibles < seats:
                    raise serializers.ValidationError({
                        'estado': 'El vehículo ya no tiene servicio activo o suficientes asientos disponibles.'
                    })
                if Viaje.objects.filter(
                    solicitud__vehiculo=vehicle,
                    estado__in=['PROGRAMADO', 'EN_CURSO'],
                ).exists():
                    raise serializers.ValidationError({'estado': 'El conductor ya tiene un viaje activo.'})
                solicitud = serializer.save()
                vehicle.asientos_disponibles -= seats
                vehicle.save(update_fields=['asientos_disponibles'])
                Viaje.objects.get_or_create(solicitud=solicitud)
                Notificacion.objects.create(
                    usuario=solicitud.usuario,
                    tipo='SOLICITUD',
                    titulo='Solicitud aceptada',
                    detalle=f'El conductor aceptó la solicitud #{solicitud.pk}.',
                )
            else:
                solicitud = serializer.save()
                if next_state in ('RECHAZADA', 'CANCELADA'):
                    Notificacion.objects.create(
                        usuario=solicitud.usuario,
                        tipo='SOLICITUD',
                        titulo='Solicitud actualizada',
                        detalle=f'La solicitud #{solicitud.pk} fue {next_state.lower()}.',
                    )


class ViajeViewSet(viewsets.ModelViewSet):
    serializer_class = ViajeSerializer
    permission_classes = [TripAccess]

    def get_queryset(self):
        queryset = Viaje.objects.select_related(
            'solicitud__usuario',
            'solicitud__vehiculo__conductor__usuario',
            'solicitud__ruta',
        )
        if not is_admin_user(self.request.user):
            queryset = queryset.filter(
                Q(solicitud__usuario=self.request.user) |
                Q(solicitud__vehiculo__conductor__usuario=self.request.user)
            )
        return queryset

    @transaction.atomic
    def perform_update(self, serializer):
        viaje = serializer.instance
        previous_state = viaje.estado
        next_state = serializer.validated_data.get('estado', previous_state)
        changes = {}
        if next_state in ('FINALIZADO', 'CANCELADO') and previous_state not in ('FINALIZADO', 'CANCELADO'):
            changes['hora_fin'] = timezone.now()
        updated = serializer.save(**changes)
        if next_state in ('FINALIZADO', 'CANCELADO') and previous_state not in ('FINALIZADO', 'CANCELADO'):
            vehicle = Vehiculo.objects.select_for_update().get(pk=updated.solicitud.vehiculo_id)
            vehicle.asientos_disponibles = min(
                vehicle.capacidad,
                vehicle.asientos_disponibles + updated.solicitud.cantidad_asientos,
            )
            vehicle.save(update_fields=['asientos_disponibles'])


class CalificacionViewSet(viewsets.ModelViewSet):
    serializer_class = CalificacionSerializer
    permission_classes = [RatingAccess]

    def get_queryset(self):
        queryset = Calificacion.objects.select_related('usuario', 'conductor', 'viaje')
        if not is_admin_user(self.request.user):
            if self.request.user.tipo_usuario == 'CONDUCTOR':
                queryset = queryset.filter(conductor__usuario=self.request.user)
            else:
                queryset = queryset.filter(usuario=self.request.user)
        return queryset


class EmergenciaViewSet(viewsets.ModelViewSet):
    serializer_class = EmergenciaSerializer
    permission_classes = [EmergencyAccess]

    def get_queryset(self):
        queryset = Emergencia.objects.select_related('conductor', 'conductor__usuario', 'vehiculo')
        if not is_admin_user(self.request.user):
            queryset = queryset.filter(conductor__usuario=self.request.user)
        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        if is_admin_user(self.request.user):
            serializer.save()
            return
        conductor = self.request.user.perfil_conductor
        vehiculo = conductor.vehiculos.filter(estado__iexact='ACTIVO').first()
        emergencia = serializer.save(conductor=conductor, vehiculo=vehiculo, estado='ACTIVA')
        for administrador in Usuario.objects.filter(is_staff=True, tipo_usuario='ADMIN', is_active=True):
            Notificacion.objects.create(
                usuario=administrador,
                tipo='EMERGENCIA',
                titulo='Alerta SOS de conductor',
                detalle=f'Alerta SOS recibida del conductor {conductor.rut} (emergencia #{emergencia.pk}).',
            )


class NotificacionViewSet(viewsets.ModelViewSet):
    serializer_class = NotificacionSerializer
    permission_classes = [AdminOrAuthenticatedRead]

    def get_queryset(self):
        queryset = Notificacion.objects.select_related('usuario')
        if not is_admin_user(self.request.user):
            queryset = queryset.filter(Q(usuario=self.request.user) | Q(usuario__isnull=True))
        return queryset


class RegistroConductorView(views.APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    @transaction.atomic
    def post(self, request):
        data = request.data
        nombre = (data.get('nombre_chofer') or data.get('nombre') or '').strip()
        apellido = (data.get('apellido_chofer') or '').strip()
        required = ('rut', 'correo', 'password', 'direccion', 'comuna', 'fono_celular',
                    'licencia_clase', 'licencia_fecha_emision', 'licencia_comuna',
                    'licencia_fecha_vencimiento')
        missing = [field for field in required if not data.get(field)]
        if not nombre or missing:
            details = {'nombre_chofer': 'El nombre del conductor es obligatorio.'} if not nombre else {}
            if missing:
                details['campos'] = missing
            return Response(details, status=status.HTTP_400_BAD_REQUEST)

        username = data['correo'].strip().lower()
        user = Usuario(
            username=username,
            identificador=f"COND-{data['rut']}",
            tipo_usuario='CONDUCTOR',
            nombre_usuario=nombre,
            apellido_usuario=apellido,
            email=username,
            is_active=True,
        )
        user.set_password(data['password'])
        user.save()
        conductor = Conductor.objects.create(
            usuario=user,
            rut=data['rut'],
            nombre_chofer=nombre,
            apellido_chofer=apellido,
            direccion=data['direccion'],
            comuna=data['comuna'],
            fono_celular=data['fono_celular'],
            fono_fijo=data.get('fono_fijo') or None,
            fono_emergencia=data.get('fono_emergencia') or None,
            biometria_activa=False,
        )
        Licencia.objects.create(
            conductor=conductor,
            clase=data['licencia_clase'],
            fecha_emision=data['licencia_fecha_emision'],
            comuna_emision=data['licencia_comuna'],
            fecha_vencimiento=data['licencia_fecha_vencimiento'],
        )
        return Response(
            {'mensaje': 'Conductor y licencia registrados exitosamente', 'conductor_id': conductor.id},
            status=status.HTTP_201_CREATED,
        )


class UsuarioTemporalView(views.APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        installation_id = (request.data.get('installation_id') or '').strip()
        if installation_id:
            user = Usuario.objects.filter(
                installation_id=installation_id,
                tipo_usuario='TEMPORAL',
                is_active=True,
            ).first()
            if user:
                token, _ = Token.objects.get_or_create(user=user)
                return Response({
                    'key': token.key,
                    'installation_id': installation_id,
                    'id': user.id,
                    'identificador': user.identificador,
                    'tipo_usuario': user.tipo_usuario,
                })
        if not installation_id or Usuario.objects.filter(installation_id=installation_id).exists():
            installation_id = secrets.token_urlsafe(32)
        identifier = f'USR-TEMP-{secrets.token_hex(10).upper()}'
        while Usuario.objects.filter(identificador=identifier).exists():
            identifier = f'USR-TEMP-{secrets.token_hex(10).upper()}'
        user = Usuario.objects.create_user(
            username=f'temporal-{secrets.token_hex(16)}',
            password=secrets.token_urlsafe(32),
            identificador=identifier,
            tipo_usuario='TEMPORAL',
            installation_id=installation_id,
            is_active=True,
        )
        token = Token.objects.create(user=user)
        return Response({
            'key': token.key,
            'installation_id': installation_id,
            'id': user.id,
            'identificador': user.identificador,
            'tipo_usuario': user.tipo_usuario,
        }, status=status.HTTP_201_CREATED)


class RegistroUsuarioView(views.APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        data = request.data
        nombre = str(data.get('nombre_usuario') or '').strip()
        apellido = str(data.get('apellido_usuario') or '').strip()
        correo = str(data.get('correo') or data.get('email') or '').strip().lower()
        telefono = str(data.get('telefono') or '').strip()
        password = data.get('password') or ''
        if not all((nombre, apellido, correo, telefono, password)):
            return Response({'error': 'Todos los campos son obligatorios.'}, status=status.HTTP_400_BAD_REQUEST)
        if len(password) < 8:
            return Response({'error': 'La contraseña debe tener al menos 8 caracteres.'}, status=status.HTTP_400_BAD_REQUEST)
        if Usuario.objects.filter(email__iexact=correo).exists():
            return Response({'error': 'Ya existe una cuenta con ese correo.'}, status=status.HTTP_400_BAD_REQUEST)
        if Usuario.objects.filter(username__iexact=correo).exists():
            return Response({'error': 'Ese correo ya está asociado a otra cuenta.'}, status=status.HTTP_400_BAD_REQUEST)
        identificador = f'USR-{secrets.token_hex(10).upper()}'
        while Usuario.objects.filter(identificador=identificador).exists():
            identificador = f'USR-{secrets.token_hex(10).upper()}'
        user = Usuario.objects.create_user(
            username=correo,
            email=correo,
            password=password,
            identificador=identificador,
            tipo_usuario='REGISTRADO',
            nombre_usuario=nombre,
            apellido_usuario=apellido,
            telefono=telefono,
            is_active=True,
        )
        return Response({
            'mensaje': 'Usuario registrado exitosamente.',
            'usuario_id': user.id,
            'identificador': user.identificador,
            'tipo_usuario': user.tipo_usuario,
        }, status=status.HTTP_201_CREATED)


class LoginUsuarioView(views.APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        credential = (request.data.get('credencial') or request.data.get('credential') or '').strip()
        password = request.data.get('password') or ''
        requested_role = request.data.get('role')
        if not credential or not password:
            return Response({'error': 'Faltan credenciales'}, status=status.HTTP_400_BAD_REQUEST)

        user_record = Usuario.objects.filter(
            Q(email__iexact=credential) |
            Q(username__iexact=credential) |
            Q(identificador=credential)
        ).first()
        user = authenticate(request, username=user_record.username, password=password) if user_record else None
        if not user or not user.is_active:
            return Response({'error': 'Credenciales incorrectas'}, status=status.HTTP_401_UNAUTHORIZED)

        if requested_role and user.tipo_usuario != requested_role:
            return Response({'error': 'La cuenta no tiene el rol solicitado.'}, status=status.HTTP_403_FORBIDDEN)
        if user.tipo_usuario == 'ADMIN' and not is_admin_user(user):
            return Response({'error': 'La cuenta administrativa no tiene permisos habilitados.'}, status=status.HTTP_403_FORBIDDEN)
        if user.tipo_usuario == 'CONDUCTOR' and not Conductor.objects.filter(usuario=user).exists():
            return Response({'error': 'La cuenta no tiene un perfil de conductor activo.'}, status=status.HTTP_403_FORBIDDEN)

        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            'key': token.key,
            'id': user.id,
            'nombre_usuario': user.nombre_usuario,
            'apellido_usuario': user.apellido_usuario,
            'nombre': f"{user.nombre_usuario} {user.apellido_usuario}".strip(),
            'correo': user.email,
            'identificador': user.identificador,
            'tipo_usuario': user.tipo_usuario,
        }, status=status.HTTP_200_OK)


class LogoutView(views.APIView):
    authentication_classes = [TokenAuthentication]

    def post(self, request):
        request.auth.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
