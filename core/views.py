from rest_framework import viewsets, status, views
from rest_framework.response import Response
from django.db import transaction
from django.contrib.auth.hashers import make_password
from django.db.models import Q

# 1. Importaciones de Modelos
from .models import (
    Usuario, Conductor, Licencia, Vehiculo, Ruta, 
    TrazadoRuta, VehiculoRuta, UbicacionVehiculo, 
    Solicitud, Viaje, Calificacion
)

# 2. Importaciones de Serializadores
from .serializers import (
    UsuarioSerializer, ConductorSerializer, VehiculoSerializer, 
    RutaSerializer, UbicacionSerializer, SolicitudSerializer, 
    ViajeSerializer, CalificacionSerializer
)

# ==========================================
# VIEWSETS (Endpoints CRUD Automáticos)
# ==========================================
class UsuarioViewSet(viewsets.ModelViewSet):
    queryset = Usuario.objects.all()
    serializer_class = UsuarioSerializer

class ConductorViewSet(viewsets.ModelViewSet):
    queryset = Conductor.objects.all()
    serializer_class = ConductorSerializer

class VehiculoViewSet(viewsets.ModelViewSet):
    queryset = Vehiculo.objects.all()
    serializer_class = VehiculoSerializer

class RutaViewSet(viewsets.ModelViewSet):
    queryset = Ruta.objects.all()
    serializer_class = RutaSerializer

class UbicacionViewSet(viewsets.ModelViewSet):
    queryset = UbicacionVehiculo.objects.all()
    serializer_class = UbicacionSerializer

class SolicitudViewSet(viewsets.ModelViewSet):
    queryset = Solicitud.objects.all()
    serializer_class = SolicitudSerializer

class ViajeViewSet(viewsets.ModelViewSet):
    queryset = Viaje.objects.all()
    serializer_class = ViajeSerializer

class CalificacionViewSet(viewsets.ModelViewSet):
    queryset = Calificacion.objects.all()
    serializer_class = CalificacionSerializer


# ==========================================
# VISTAS PERSONALIZADAS
# ==========================================
class RegistroConductorView(views.APIView):
    @transaction.atomic
    def post(self, request):
        data = request.data
        try:
            # 1. Crear el Usuario (Autenticación)
            nuevo_usuario = Usuario.objects.create(
                username=data['rut'],
                identificador=f"COND-{data['rut']}",
                tipo_usuario='CONDUCTOR',
                email=data['correo'],
                password=make_password(data['password'])
            )

            # 2. Crear el Perfil del Conductor
            nuevo_conductor = Conductor.objects.create(
                usuario=nuevo_usuario,
                rut=data['rut'],
                nombre=data['nombre'],
                direccion=data['direccion'],
                comuna=data['comuna'],
                fono_celular=data['fono_celular'],
                fono_fijo=data.get('fono_fijo', None),
                fono_emergencia=data.get('fono_emergencia', None),
                biometria_activa=data.get('biometria_activa', False)
            )

            # 3. Crear la Licencia
            Licencia.objects.create(
                conductor=nuevo_conductor,
                clase=data['licencia_clase'],
                fecha_emision=data['licencia_fecha_emision'],
                comuna_emision=data['licencia_comuna'],
                fecha_vencimiento=data['licencia_fecha_vencimiento']
            )

            return Response({
                "mensaje": "Conductor y licencia registrados exitosamente",
                "conductor_id": nuevo_conductor.id
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": f"Error al registrar: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)

class RegistroUsuarioView(views.APIView):
    def post(self, request):
        data = request.data
        try:
            # Generamos un identificador único
            identificador_generado = f"USR-{data['correo'].split('@')[0]}"

            nuevo_usuario = Usuario.objects.create(
                username=data['correo'], 
                identificador=identificador_generado,
                tipo_usuario='REGISTRADO',
                first_name=data['nombre'],  # <-- EL CAMBIO ESTÁ AQUÍ
                email=data['correo'],
                telefono=data['telefono'],
                password=make_password(data['password']) 
            )

            return Response({
                "mensaje": "Usuario registrado exitosamente",
                "usuario_id": nuevo_usuario.id
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

# Asegúrate de agregar esta importación en la parte de arriba de tu archivo:
from django.db.models import Q

# Reemplaza tu vista de Login con esta:
class LoginUsuarioView(views.APIView):
    def post(self, request):
        # Ahora recibimos una "credencial" que puede ser cualquier cosa
        credencial = request.data.get('credencial') 
        password = request.data.get('password')
        
        if not credencial or not password:
            return Response({"error": "Faltan credenciales"}, status=status.HTTP_400_BAD_REQUEST)

        # Buscamos si la credencial coincide con el email, el username o el identificador
        usuario = Usuario.objects.filter(
            Q(email=credencial) | Q(username=credencial) | Q(identificador=credencial)
        ).first()
        
        # Si el usuario existe y la contraseña es correcta (check_password lo desencripta y valida)
        if usuario and usuario.check_password(password):
            return Response({
                "id": usuario.id,
                "nombre": usuario.first_name,
                "correo": usuario.email,
                "identificador": usuario.identificador,
                "tipo_usuario": usuario.tipo_usuario
            }, status=status.HTTP_200_OK)
        else:
            return Response({"error": "Credenciales incorrectas"}, status=status.HTTP_401_UNAUTHORIZED)