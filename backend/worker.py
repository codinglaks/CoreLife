"""Cloudflare entry point: hands the existing Flask app (app.py) to the Workers runtime."""

from workers import wsgi

from app import app

Default = wsgi.entrypoint(app)
