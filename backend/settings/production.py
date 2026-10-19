"""Production settings. Required values must be provided through environment variables."""

import os

from .base import *


def required_env(name):
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f'{name} must be set in the production environment.')
    return value


SECRET_KEY = required_env('DJANGO_SECRET_KEY')
DEBUG = False
ALLOWED_HOSTS = [
    host.strip()
    for host in required_env('DJANGO_ALLOWED_HOSTS').split(',')
    if host.strip()
]
if not ALLOWED_HOSTS:
    raise RuntimeError('DJANGO_ALLOWED_HOSTS must contain at least one host.')

DATABASES['default'].update(
    {
        'NAME': required_env('DB_NAME'),
        'USER': required_env('DB_USER'),
        'PASSWORD': required_env('DB_PASSWORD'),
        'HOST': required_env('DB_HOST'),
        'PORT': os.getenv('DB_PORT', '5432'),
    }
)

CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv('CORS_ALLOWED_ORIGINS', '').split(',')
    if origin.strip()
]
CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.getenv('CSRF_TRUSTED_ORIGINS', '').split(',')
    if origin.strip()
]

SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
