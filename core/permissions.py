from rest_framework.permissions import SAFE_METHODS, BasePermission


def is_administrator(user):
    return bool(
        user and user.is_authenticated and user.is_staff
        and user.tipo_usuario == 'ADMIN'
    )


class AdminOrAuthenticatedRead(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and (is_administrator(request.user) or request.method in SAFE_METHODS)
        )


class VehicleAccess(BasePermission):
    DRIVER_FIELDS = {'asientos_disponibles', 'maletero_ocupado', 'en_servicio'}

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if is_administrator(user) or request.method in SAFE_METHODS:
            return True
        return request.method == 'PATCH' and user.tipo_usuario == 'CONDUCTOR'

    def has_object_permission(self, request, view, obj):
        if is_administrator(request.user):
            return True
        return (
            request.method == 'PATCH'
            and obj.conductor_id is not None
            and obj.conductor.usuario_id == request.user.id
            and set(request.data.keys()).issubset(self.DRIVER_FIELDS)
        )


class LocationAccess(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if is_administrator(user) or request.method in SAFE_METHODS:
            return True
        return request.method == 'POST' and user.tipo_usuario == 'CONDUCTOR'

    def has_object_permission(self, request, view, obj):
        if is_administrator(request.user):
            return True
        return (
            request.method in SAFE_METHODS
            and obj.vehiculo.conductor_id is not None
            and obj.vehiculo.conductor.usuario_id == request.user.id
        )


class RequestAccess(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if is_administrator(request.user) or request.method in SAFE_METHODS:
            return True
        return request.method == 'POST' and request.user.tipo_usuario == 'REGISTRADO'

    def has_object_permission(self, request, view, obj):
        user = request.user
        if is_administrator(user):
            return True
        owns_request = obj.usuario_id == user.id
        assigned_driver = obj.vehiculo.conductor_id and obj.vehiculo.conductor.usuario_id == user.id
        if request.method in SAFE_METHODS:
            return owns_request or assigned_driver
        if request.method in ('PUT', 'PATCH') and assigned_driver:
            return request.data.get('estado') in ('ACEPTADA', 'RECHAZADA')
        return (
            request.method in ('PUT', 'PATCH')
            and owns_request
            and obj.estado == 'PENDIENTE'
            and request.data.get('estado') == 'CANCELADA'
        )


class TripAccess(BasePermission):
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return is_administrator(request.user) or request.method in SAFE_METHODS

    def has_object_permission(self, request, view, obj):
        if is_administrator(request.user):
            return True
        request_record = obj.solicitud
        if request.method in SAFE_METHODS:
            conductor = request_record.vehiculo.conductor
            return (
                request_record.usuario_id == request.user.id
                or (conductor and conductor.usuario_id == request.user.id)
            )
        conductor = request_record.vehiculo.conductor
        return bool(conductor and conductor.usuario_id == request.user.id)


class RatingAccess(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and (is_administrator(request.user) or request.method in SAFE_METHODS
                 or request.method == 'POST')
        )

    def has_object_permission(self, request, view, obj):
        return is_administrator(request.user) or (
            request.method in SAFE_METHODS and obj.usuario_id == request.user.id
        )


class EmergencyAccess(BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if is_administrator(user) or request.method in SAFE_METHODS:
            return True
        return request.method == 'POST' and hasattr(user, 'perfil_conductor')

    def has_object_permission(self, request, view, obj):
        if is_administrator(request.user):
            return True
        return request.method in SAFE_METHODS and obj.conductor.usuario_id == request.user.id
