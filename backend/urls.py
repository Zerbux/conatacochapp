from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import (
    CalificacionViewSet, ConductorViewSet, EmergenciaViewSet,
    LicenciaViewSet, LoginUsuarioView, LogoutView, NotificacionViewSet,
    RegistroConductorView, RegistroUsuarioView, RutaViewSet,
    SolicitudViewSet, TrazadoRutaViewSet, UbicacionViewSet,
    UsuarioViewSet, VehiculoRutaViewSet, VehiculoViewSet, ViajeViewSet,
)

router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet, basename='usuario')
router.register(r'conductores', ConductorViewSet, basename='conductor')
router.register(r'vehiculos', VehiculoViewSet, basename='vehiculo')
router.register(r'rutas', RutaViewSet)
router.register(r'ubicaciones', UbicacionViewSet, basename='ubicacionvehiculo')
router.register(r'solicitudes', SolicitudViewSet, basename='solicitud')
router.register(r'viajes', ViajeViewSet, basename='viaje')
router.register(r'calificaciones', CalificacionViewSet, basename='calificacion')
router.register(r'licencias', LicenciaViewSet, basename='licencia')
router.register(r'trazados-ruta', TrazadoRutaViewSet)
router.register(r'vehiculo-ruta', VehiculoRutaViewSet, basename='vehiculoruta')
router.register(r'emergencias', EmergenciaViewSet, basename='emergencia')
router.register(r'notificaciones', NotificacionViewSet, basename='notificacion')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    
    path('api/registro-conductor/', RegistroConductorView.as_view(), name='registro_conductor'),
    path('api/registro-usuario/', RegistroUsuarioView.as_view(), name='registro_usuario'),
    path('api/login/', LoginUsuarioView.as_view(), name='login_usuario'),
    path('api/logout/', LogoutView.as_view(), name='logout_usuario'),
]