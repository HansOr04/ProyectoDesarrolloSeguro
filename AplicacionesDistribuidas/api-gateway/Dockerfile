FROM nginx:alpine

# Copiar plantilla — envsubst la procesa al arrancar para inyectar INTERNAL_API_SECRET
COPY nginx.conf /etc/nginx/nginx.conf.template

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# envsubst reemplaza SOLO ${INTERNAL_API_SECRET}; el resto de variables nginx ($host, etc.) queda intacto
CMD ["/bin/sh", "-c", "envsubst '${INTERNAL_API_SECRET} ${CORS_ORIGIN_TRIAGE} ${CORS_ORIGIN_MONETIX}' < /etc/nginx/nginx.conf.template > /etc/nginx/nginx.conf && nginx -g 'daemon off;'"]
