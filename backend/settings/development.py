"""Local development settings."""

import os

from .base import *


SECRET_KEY = os.getenv(
    'DJANGO_SECRET_KEY',
    'django-insecure-local-development-key-do-not-use-in-production',
)
DEBUG = True
ALLOWED_HOSTS = ['localhost', '127.0.0.1', '[::1]', '192.168.1.185']
CORS_ALLOW_ALL_ORIGINS = True

