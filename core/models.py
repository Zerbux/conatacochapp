from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone

# 1. USUARIO (Pasajeros temporales, registrados y administradores)
class Usuario(AbstractUser):
    TIPO_USUARIO_CHOICES = (
        ('TEMPORAL', 'Temporal'),
        ('REGISTRADO', 'Registrado'),
        ('CONDUCTOR', 'Conductor'),
        ('ADMIN', 'Administrador'),
    )
    identificador = models.CharField(max_length=50, unique=True) # Ej: USR-TEMP-4821
    tipo_usuario = models.CharField(max_length=20, choices=TIPO_USUARIO_CHOICES, default='TEMPORAL')
    nombre_usuario = models.CharField(max_length=100, blank=True)
    apellido_usuario = models.CharField(max_length=100, blank=True)
    telefono = models.CharField(max_length=20, null=True, blank=True)
    installation_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    ultima_actividad = models.DateTimeField(default=timezone.now)
    # password, email, first_name (nombre), date_joined y is_active ya vienen en AbstractUser

    def __str__(self):
        return f"{self.identificador} ({self.tipo_usuario})"


# 2. CONDUCTOR (Datos personales estáticos)
class Conductor(models.Model):
    # La autenticación se maneja vinculando al conductor con un Usuario registrado
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='perfil_conductor')
    rut = models.CharField(max_length=12, unique=True)
    nombre_chofer = models.CharField(max_length=100)
    apellido_chofer = models.CharField(max_length=100, blank=True)
    direccion = models.CharField(max_length=150)
    comuna = models.CharField(max_length=50)
    fono_celular = models.CharField(max_length=20)
    fono_fijo = models.CharField(max_length=20, null=True, blank=True)
    fono_emergencia = models.CharField(max_length=20, null=True, blank=True)
    biometria_activa = models.BooleanField(default=False)
    estado = models.CharField(max_length=20, default='ACTIVO')

    def __str__(self):
        nombre_completo = f"{self.nombre_chofer} {self.apellido_chofer}".strip()
        return f"{nombre_completo} - RUT: {self.rut}"


# 3. LICENCIA (Permite historial de renovaciones)
class Licencia(models.Model):
    CLASE_CHOICES = (
        ('A2', 'A2'),
        ('A3', 'A3'),
    )
    conductor = models.ForeignKey(Conductor, on_delete=models.CASCADE, related_name='licencias')
    fecha_emision = models.DateField()
    comuna_emision = models.CharField(max_length=50)
    fecha_vencimiento = models.DateField()
    clase = models.CharField(max_length=5, choices=CLASE_CHOICES)
    estado = models.CharField(max_length=20, default='VIGENTE')

    def __str__(self):
        return f"Licencia {self.clase} - {self.conductor.nombre_chofer} ({self.estado})"


# 4. VEHICULO
class Vehiculo(models.Model):
    conductor = models.ForeignKey(Conductor, on_delete=models.SET_NULL, null=True, blank=True, related_name='vehiculos')
    patente = models.CharField(max_length=10, unique=True)
    marca = models.CharField(max_length=50)
    modelo = models.CharField(max_length=50)
    anio = models.IntegerField()
    capacidad = models.IntegerField(default=4, validators=[MinValueValidator(1), MaxValueValidator(4)])
    asientos_disponibles = models.IntegerField(default=4, validators=[MinValueValidator(0), MaxValueValidator(4)])
    maletero_ocupado = models.BooleanField(default=False)
    en_servicio = models.BooleanField(default=False)
    estado = models.CharField(max_length=20, default='ACTIVO')

    class Meta:
            constraints = [
                models.CheckConstraint(condition=models.Q(capacidad__gte=1) & models.Q(capacidad__lte=4), name='capacidad_valida'),
                models.CheckConstraint(condition=models.Q(asientos_disponibles__gte=0) & models.Q(asientos_disponibles__lte=4), name='asientos_disponibles_validos'),
            ]

    def __str__(self):
        return f"{self.patente} - {self.marca} {self.modelo}"


# 5. RUTA (Catálogo oficial de los 15 recorridos)
class Ruta(models.Model):
    folio = models.CharField(max_length=20, unique=True) # Ej: 233003
    nombre = models.CharField(max_length=100)
    origen = models.CharField(max_length=100)
    destino = models.CharField(max_length=100)
    descripcion = models.TextField(null=True, blank=True)
    estado = models.CharField(max_length=20, default='ACTIVA')

    def __str__(self):
        return f"Ruta {self.folio}: {self.nombre}"


# 6. TRAZADO_RUTA (Motor geoespacial para polylines)
class TrazadoRuta(models.Model):
    SENTIDO_CHOICES = (
        ('IDA', 'Ida'),
        ('REGRESO', 'Regreso'),
    )
    ruta = models.ForeignKey(Ruta, on_delete=models.CASCADE, related_name='trazados')
    sentido = models.CharField(max_length=10, choices=SENTIDO_CHOICES)
    orden = models.IntegerField()
    calle = models.CharField(max_length=150)
    latitud = models.DecimalField(max_digits=10, decimal_places=8)
    longitud = models.DecimalField(max_digits=11, decimal_places=8)

    class Meta:
        unique_together = ('ruta', 'sentido', 'orden')

    def __str__(self):
        return f"{self.ruta.folio} - {self.sentido} - Punto {self.orden} ({self.calle})"


# 7. VEHICULO_RUTA
class VehiculoRuta(models.Model):
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE)
    ruta = models.ForeignKey(Ruta, on_delete=models.CASCADE)
    activo = models.BooleanField(default=True)

    class Meta:
        unique_together = ('vehiculo', 'ruta')


# 8. UBICACION_VEHICULO (Posición en tiempo real)
class UbicacionVehiculo(models.Model):
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE, related_name='ubicaciones')
    latitud = models.DecimalField(max_digits=10, decimal_places=8)
    longitud = models.DecimalField(max_digits=11, decimal_places=8)
    fecha_hora = models.DateTimeField(auto_now_add=True)
    activo = models.BooleanField(default=True)


# 9. SOLICITUD (El Match)
class Solicitud(models.Model):
    ESTADO_CHOICES = (
        ('PENDIENTE', 'Pendiente'),
        ('ACEPTADA', 'Aceptada'),
        ('RECHAZADA', 'Rechazada'),
        ('CANCELADA', 'Cancelada'),
    )
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, related_name='solicitudes')
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.CASCADE, related_name='solicitudes')
    ruta = models.ForeignKey(Ruta, on_delete=models.CASCADE)
    cantidad_asientos = models.IntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(4)])
    latitud_recogida = models.DecimalField(max_digits=10, decimal_places=8)
    longitud_recogida = models.DecimalField(max_digits=11, decimal_places=8)
    fecha_solicitud = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='PENDIENTE')

    class Meta:
            constraints = [
                models.CheckConstraint(condition=models.Q(cantidad_asientos__gte=1) & models.Q(cantidad_asientos__lte=4), name='asientos_validos')
            ]


# 10. VIAJE
class Viaje(models.Model):
    ESTADO_CHOICES = (
        ('PROGRAMADO', 'Programado'),
        ('EN_CURSO', 'En Curso'),
        ('FINALIZADO', 'Finalizado'),
        ('CANCELADO', 'Cancelado'),
    )
    solicitud = models.OneToOneField(Solicitud, on_delete=models.CASCADE, related_name='viaje')
    hora_inicio = models.DateTimeField(auto_now_add=True)
    hora_fin = models.DateTimeField(null=True, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='PROGRAMADO')


# 11. CALIFICACION
class Calificacion(models.Model):
    viaje = models.OneToOneField(Viaje, on_delete=models.CASCADE, related_name='calificacion')
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE)
    conductor = models.ForeignKey(Conductor, on_delete=models.CASCADE)
    puntaje = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comentario = models.TextField(null=True, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
            constraints = [
                models.CheckConstraint(condition=models.Q(puntaje__gte=1) & models.Q(puntaje__lte=5), name='puntaje_valido')
            ]


class Emergencia(models.Model):
    ESTADO_CHOICES = (
        ('ACTIVA', 'Activa'),
        ('ATENDIDA', 'Atendida'),
        ('CERRADA', 'Cerrada'),
    )
    conductor = models.ForeignKey(Conductor, on_delete=models.CASCADE, related_name='emergencias')
    vehiculo = models.ForeignKey(Vehiculo, on_delete=models.SET_NULL, null=True, blank=True, related_name='emergencias')
    observacion = models.TextField(blank=True)
    latitud = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    longitud = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    fecha_hora = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='ACTIVA')


class Notificacion(models.Model):
    ESTADO_CHOICES = (
        ('NO_LEIDA', 'No leída'),
        ('LEIDA', 'Leída'),
    )
    usuario = models.ForeignKey(Usuario, on_delete=models.CASCADE, null=True, blank=True, related_name='notificaciones')
    tipo = models.CharField(max_length=30, default='SISTEMA')
    titulo = models.CharField(max_length=150)
    detalle = models.TextField()
    fecha_hora = models.DateTimeField(auto_now_add=True)
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default='NO_LEIDA')