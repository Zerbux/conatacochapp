from django.contrib.auth import authenticate
from django.db import transaction
from django.db.models import Prefetch, Q
from django.utils import timezone
from rest_framework import serializers, status, views, viewsets
from rest_framework.authentication import TokenAuthentication
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny
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
    SolicitudSerializer,
    TrazadoRutaSerializer,
    UbicacionSerializer,
    UsuarioSerializer,
    VehiculoRutaSerializer,
    VehiculoSerializer,
    ViajeSerializer,
)


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
    queryset = Ruta.objects.prefetch_related('trazados').all()
    serializer_class = RutaSerializer
    permission_classes = [AdminOrAuthenticatedRead]


class TrazadoRutaViewSet(viewsets.ModelViewSet):
    queryset = TrazadoRuta.objects.select_related('ruta').all()
    serializer_class = TrazadoRutaSerializer
    permission_classes = [AdminOrAuthenticatedRead]


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
        else:
            serializer.save(usuario=self.request.user)

    def perform_update(self, serializer):
        with transaction.atomic():
            old_state = serializer.instance.estado
            next_state = serializer.validated_data.get('estado', old_state)
            if next_state == 'ACEPTADA' and old_state != 'ACEPTADA':
                vehicle = Vehiculo.objects.select_for_update().get(pk=serializer.instance.vehiculo_id)
                seats = serializer.instance.cantidad_asientos
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
                serializer.save()


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


class RegistroUsuarioView(views.APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        data = request.data.copy()
        email = (data.get('email') or data.get('correo') or '').strip().lower()
        if email:
            data['email'] = email
            data.setdefault('username', email)
            base_identifier = f"USR-{email.split('@')[0]}"
            identifier = base_identifier
            suffix = 1
            while Usuario.objects.filter(identificador=identifier).exists():
                suffix += 1
                identifier = f"{base_identifier}-{suffix}"
            data.setdefault('identificador', identifier)
        serializer = UsuarioSerializer(data=data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save(tipo_usuario='REGISTRADO', is_active=True)
        return Response(
            {'mensaje': 'Usuario registrado exitosamente', 'usuario_id': user.id},
            status=status.HTTP_201_CREATED,
        )


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
