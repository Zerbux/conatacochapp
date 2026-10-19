from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from core.views import (
    UsuarioViewSet, ConductorViewSet, VehiculoViewSet, 
    RutaViewSet, UbicacionViewSet, SolicitudViewSet, 
    ViajeViewSet, CalificacionViewSet, 
    RegistroConductorView,
    RegistroConductorView,
    RegistroUsuarioView,
    LoginUsuarioView,
)

router = DefaultRouter()
router.register(r'usuarios', UsuarioViewSet)
router.register(r'conductores', ConductorViewSet)
router.register(r'vehiculos', VehiculoViewSet)
router.register(r'rutas', RutaViewSet)
router.register(r'ubicaciones', UbicacionViewSet)
router.register(r'solicitudes', SolicitudViewSet)
router.register(r'viajes', ViajeViewSet)
router.register(r'calificaciones', CalificacionViewSet)

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
    
    path('api/registro-conductor/', RegistroConductorView.as_view(), name='registro_conductor'),
    path('api/registro-usuario/', RegistroUsuarioView.as_view(), name='registro_usuario'),
    path('api/login/', LoginUsuarioView.as_view(), name='login_usuario'),
]