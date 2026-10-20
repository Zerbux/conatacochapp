from rest_framework import serializers

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


class UsuarioSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, min_length=8)
    is_active = serializers.BooleanField(required=False, default=True)

    class Meta:
        model = Usuario
        fields = [
            'id', 'identificador', 'tipo_usuario', 'username', 'nombre_usuario',
            'apellido_usuario', 'email', 'telefono', 'installation_id',
            'date_joined', 'ultima_actividad', 'is_active', 'password',
        ]
        read_only_fields = ['id', 'date_joined', 'ultima_actividad']

    def create(self, validated_data):
        password = validated_data.pop('password', None)
        if not password:
            raise serializers.ValidationError({'password': 'La contraseña es obligatoria.'})
        validated_data.setdefault('username', validated_data.get('email') or validated_data.get('identificador'))
        user = Usuario(**validated_data)
        user.set_password(password)
        user.is_staff = user.tipo_usuario == 'ADMIN'
        user.save()
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for field, value in validated_data.items():
            setattr(instance, field, value)
        instance.is_staff = instance.tipo_usuario == 'ADMIN'
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class ConductorSerializer(serializers.ModelSerializer):
    usuario_email = serializers.EmailField(source='usuario.email', read_only=True)
    licencia_clase = serializers.SerializerMethodField()
    licencia_fecha_emision = serializers.SerializerMethodField()
    licencia_comuna = serializers.SerializerMethodField()
    licencia_fecha_vencimiento = serializers.SerializerMethodField()

    def to_representation(self, instance):
        prefetched = getattr(instance, 'licencias_ordenadas', None)
        self._current_license = (
            prefetched[0] if prefetched else
            instance.licencias.order_by('-fecha_emision', '-pk').first()
        )
        return super().to_representation(instance)

    def _get_license_value(self, field_name):
        return getattr(self._current_license, field_name, None)

    def get_licencia_clase(self, _conductor):
        return self._get_license_value('clase')

    def get_licencia_fecha_emision(self, _conductor):
        return self._get_license_value('fecha_emision')

    def get_licencia_comuna(self, _conductor):
        return self._get_license_value('comuna_emision')

    def get_licencia_fecha_vencimiento(self, _conductor):
        return self._get_license_value('fecha_vencimiento')

    class Meta:
        model = Conductor
        fields = [
            'id', 'usuario', 'usuario_email', 'rut', 'nombre_chofer',
            'apellido_chofer', 'direccion', 'comuna', 'fono_celular',
            'fono_fijo', 'fono_emergencia', 'biometria_activa',
            'licencia_clase', 'licencia_fecha_emision', 'licencia_comuna',
            'licencia_fecha_vencimiento', 'estado',
        ]

    def create(self, validated_data):
        conductor = super().create(validated_data)
        conductor.usuario.tipo_usuario = 'CONDUCTOR'
        conductor.usuario.save(update_fields=['tipo_usuario'])
        return conductor


class LicenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Licencia
        fields = ['id', 'conductor', 'fecha_emision', 'comuna_emision', 'fecha_vencimiento', 'clase', 'estado']


class VehiculoSerializer(serializers.ModelSerializer):
    conductor_nombre = serializers.SerializerMethodField()

    def get_conductor_nombre(self, vehiculo):
        if not vehiculo.conductor:
            return None
        return f"{vehiculo.conductor.nombre_chofer} {vehiculo.conductor.apellido_chofer}".strip()

    def validate(self, attrs):
        capacity = attrs.get('capacidad', getattr(self.instance, 'capacidad', 4))
        seats = attrs.get('asientos_disponibles', getattr(self.instance, 'asientos_disponibles', 0))
        if seats > capacity:
            raise serializers.ValidationError({
                'asientos_disponibles': 'No puede superar la capacidad total del vehículo.'
            })
        return attrs

    class Meta:
        model = Vehiculo
        fields = [
            'id', 'conductor', 'conductor_nombre', 'patente', 'marca', 'modelo',
            'anio', 'capacidad', 'asientos_disponibles', 'maletero_ocupado',
            'en_servicio', 'estado',
        ]


class TrazadoRutaSerializer(serializers.ModelSerializer):
    class Meta:
        model = TrazadoRuta
        fields = ['id', 'ruta', 'sentido', 'orden', 'calle', 'latitud', 'longitud']


class RutaSerializer(serializers.ModelSerializer):
    trazados = TrazadoRutaSerializer(many=True, read_only=True)

    class Meta:
        model = Ruta
        fields = ['id', 'folio', 'nombre', 'origen', 'destino', 'descripcion', 'estado', 'trazados']


class VehiculoRutaSerializer(serializers.ModelSerializer):
    patente = serializers.CharField(source='vehiculo.patente', read_only=True)
    folio = serializers.CharField(source='ruta.folio', read_only=True)
    conductor = serializers.IntegerField(source='vehiculo.conductor_id', read_only=True, allow_null=True)

    class Meta:
        model = VehiculoRuta
        fields = ['id', 'vehiculo', 'patente', 'ruta', 'folio', 'conductor', 'activo']


class UbicacionSerializer(serializers.ModelSerializer):
    conductor = serializers.IntegerField(source='vehiculo.conductor_id', read_only=True, allow_null=True)
    patente = serializers.CharField(source='vehiculo.patente', read_only=True)

    class Meta:
        model = UbicacionVehiculo
        fields = ['id', 'vehiculo', 'conductor', 'patente', 'latitud', 'longitud', 'fecha_hora', 'activo']
        read_only_fields = ['fecha_hora']


class SolicitudSerializer(serializers.ModelSerializer):
    usuario = serializers.PrimaryKeyRelatedField(
        queryset=Usuario.objects.all(),
        required=False,
    )
    ruta_nombre = serializers.ReadOnlyField(source='ruta.nombre')
    ruta_folio = serializers.ReadOnlyField(source='ruta.folio')
    usuario_identificador = serializers.ReadOnlyField(source='usuario.identificador')
    pasajero = serializers.SerializerMethodField()
    conductor = serializers.SerializerMethodField()
    asientos = serializers.IntegerField(source='cantidad_asientos', required=False)
    puntoRecogida = serializers.SerializerMethodField()
    fecha = serializers.DateTimeField(source='fecha_solicitud', read_only=True)

    def get_pasajero(self, solicitud):
        return f"{solicitud.usuario.nombre_usuario} {solicitud.usuario.apellido_usuario}".strip()

    def get_conductor(self, solicitud):
        conductor = solicitud.vehiculo.conductor
        return f"{conductor.nombre_chofer} {conductor.apellido_chofer}".strip() if conductor else None

    def get_puntoRecogida(self, solicitud):
        return f"{solicitud.latitud_recogida}, {solicitud.longitud_recogida}"

    class Meta:
        model = Solicitud
        fields = [
            'id', 'usuario', 'usuario_identificador', 'pasajero', 'vehiculo',
            'conductor', 'ruta', 'ruta_nombre', 'ruta_folio', 'cantidad_asientos',
            'asientos', 'latitud_recogida', 'longitud_recogida', 'puntoRecogida',
            'fecha_solicitud', 'fecha', 'estado',
        ]
        read_only_fields = ['fecha_solicitud']

    def validate(self, attrs):
        request = self.context.get('request')
        if (
            self.instance is None
            and request
            and request.user.is_staff
            and request.user.tipo_usuario == 'ADMIN'
            and not attrs.get('usuario')
        ):
            raise serializers.ValidationError({'usuario': 'Selecciona un pasajero para la solicitud.'})
        return attrs


class ViajeSerializer(serializers.ModelSerializer):
    pasajero = serializers.SerializerMethodField()
    conductor = serializers.SerializerMethodField()
    vehiculo = serializers.IntegerField(source='solicitud.vehiculo_id', read_only=True)
    ruta = serializers.CharField(source='solicitud.ruta.folio', read_only=True)
    asientos = serializers.IntegerField(source='solicitud.cantidad_asientos', read_only=True)
    inicio = serializers.DateTimeField(source='hora_inicio', read_only=True)
    fin = serializers.DateTimeField(source='hora_fin', read_only=True)

    def get_pasajero(self, viaje):
        usuario = viaje.solicitud.usuario
        return f"{usuario.nombre_usuario} {usuario.apellido_usuario}".strip()

    def get_conductor(self, viaje):
        conductor = viaje.solicitud.vehiculo.conductor
        return f"{conductor.nombre_chofer} {conductor.apellido_chofer}".strip() if conductor else None

    class Meta:
        model = Viaje
        fields = [
            'id', 'solicitud', 'pasajero', 'conductor', 'vehiculo', 'ruta',
            'asientos', 'hora_inicio', 'hora_fin', 'inicio', 'fin', 'estado',
        ]
        read_only_fields = ['hora_inicio', 'hora_fin']


class CalificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Calificacion
        fields = ['id', 'viaje', 'usuario', 'conductor', 'puntaje', 'comentario', 'fecha']
        read_only_fields = ['usuario', 'conductor', 'fecha']

    def validate_viaje(self, viaje):
        request = self.context['request']
        if request.user.tipo_usuario != 'ADMIN':
            if viaje.solicitud.usuario_id != request.user.id:
                raise serializers.ValidationError('Solo puedes calificar tus propios viajes.')
            if viaje.estado != 'FINALIZADO':
                raise serializers.ValidationError('Solo se pueden calificar viajes finalizados.')
        if not viaje.solicitud.vehiculo.conductor_id:
            raise serializers.ValidationError('El viaje no tiene un conductor asignado.')
        return viaje

    def create(self, validated_data):
        viaje = validated_data['viaje']
        validated_data['usuario'] = self.context['request'].user
        validated_data['conductor'] = viaje.solicitud.vehiculo.conductor
        return super().create(validated_data)


class EmergenciaSerializer(serializers.ModelSerializer):
    conductor = serializers.PrimaryKeyRelatedField(queryset=Conductor.objects.all(), required=False)
    conductor_nombre = serializers.SerializerMethodField()
    patente = serializers.CharField(source='vehiculo.patente', read_only=True, allow_null=True)

    def get_conductor_nombre(self, emergencia):
        return f"{emergencia.conductor.nombre_chofer} {emergencia.conductor.apellido_chofer}".strip()

    class Meta:
        model = Emergencia
        fields = [
            'id', 'conductor', 'conductor_nombre', 'vehiculo', 'patente',
            'observacion', 'latitud', 'longitud', 'fecha_hora', 'estado',
        ]
        read_only_fields = ['fecha_hora']


class NotificacionSerializer(serializers.ModelSerializer):
    fecha = serializers.DateTimeField(source='fecha_hora', read_only=True)
    detalle = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = Notificacion
        fields = ['id', 'usuario', 'tipo', 'titulo', 'detalle', 'fecha_hora', 'fecha', 'estado']
        read_only_fields = ['usuario', 'fecha_hora']
