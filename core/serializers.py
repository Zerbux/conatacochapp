from rest_framework import serializers
from .models import (
    Usuario, Conductor, Licencia, Vehiculo, Ruta, 
    TrazadoRuta, VehiculoRuta, UbicacionVehiculo, 
    Solicitud, Viaje, Calificacion
)

class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = [
            'id', 
            'identificador', 
            'tipo_usuario', 
            'username', 
            'first_name',  
            'email',       
            'telefono', 
            'installation_id', 
            'date_joined', 
            'ultima_actividad', 
            'is_active'    
        ]


class ConductorSerializer(serializers.ModelSerializer):
    usuario_info = UsuarioSerializer(source='usuario', read_only=True)

    class Meta:
        model = Conductor
        fields = [
            'id', 'usuario', 'usuario_info', 
            'rut', 'nombre', 'apellido', 'direccion', 'comuna', 
            'fono_celular', 'fono_fijo', 'fono_emergencia', 'correo', 'biometria_activa',
            'licencia_clase', 'licencia_fecha_emision', 'licencia_comuna', 'licencia_fecha_vencimiento',
            'estado'
        ]


class VehiculoSerializer(serializers.ModelSerializer):
    conductor_nombre = serializers.ReadOnlyField(source='conductor.nombre')

    class Meta:
        model = Vehiculo
        fields = ['id', 'conductor', 'conductor_nombre', 'patente', 'marca', 'modelo', 'anio', 'capacidad', 'estado']


class RutaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Ruta
        fields = ['id', 'nombre', 'origen', 'destino', 'descripcion', 'estado']


class UbicacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = UbicacionVehiculo
        fields = ['id', 'vehiculo', 'latitud', 'longitud', 'fecha_hora', 'activo']


class SolicitudSerializer(serializers.ModelSerializer):
    ruta_nombre = serializers.ReadOnlyField(source='ruta.nombre')
    usuario_identificador = serializers.ReadOnlyField(source='usuario.identificador')

    class Meta:
        model = Solicitud
        fields = ['id', 'usuario', 'usuario_identificador', 'vehiculo', 'ruta', 'ruta_nombre', 
                  'cantidad_asientos', 'latitud_recogida', 'longitud_recogida', 'fecha_solicitud', 'estado']


class ViajeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Viaje
        fields = ['id', 'solicitud', 'hora_inicio', 'hora_fin', 'estado']


class CalificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Calificacion
        fields = ['id', 'viaje', 'usuario', 'conductor', 'puntaje', 'comentario', 'fecha']