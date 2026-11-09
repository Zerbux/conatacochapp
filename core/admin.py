from django.contrib import admin

from .models import Conductor, Licencia


class LicenciaInline(admin.StackedInline):
    model = Licencia
    extra = 0
    min_num = 1
    validate_min = True


@admin.register(Conductor)
class ConductorAdmin(admin.ModelAdmin):
    inlines = [LicenciaInline]
