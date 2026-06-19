# Monetix Frontend

## Descripción

Monetix es una aplicación web de gestión financiera personal diseñada para ayudar a los usuarios a administrar sus finanzas de manera eficiente. La aplicación proporciona herramientas para el seguimiento de gastos, predicciones financieras, comparativas y establecimiento de metas económicas.

## Características principales

- **Autenticación de usuarios**: Sistema completo de registro e inicio de sesión con roles (usuario/administrador)
- **Gestión de usuarios**: Panel administrativo para la administración de usuarios del sistema
- **Predicciones financieras**: Análisis predictivo de tendencias financieras (en desarrollo)
- **Comparativas**: Comparación de gastos e ingresos en diferentes periodos (en desarrollo)
- **Metas financieras**: Definición y seguimiento de objetivos económicos (en desarrollo)
- **Gestión de categorías**: Administración de categorías de gastos e ingresos (en desarrollo)
- **Interfaz responsive**: Diseño adaptable a diferentes dispositivos

## Tecnologías utilizadas

- **React 18**: Biblioteca principal para la construcción de la interfaz de usuario
- **TypeScript**: Superconjunto tipado de JavaScript para mayor robustez del código
- **Vite**: Herramienta de construcción rápida para el desarrollo frontend
- **React Router DOM**: Navegación y enrutamiento de la aplicación
- **Axios**: Cliente HTTP para comunicación con la API backend
- **CSS3**: Estilos personalizados con arquitectura modular

## Estructura del proyecto

```
src/
├── components/          # Componentes reutilizables
│   ├── common/         # Componentes comunes (Button, Input, Card, Modal, Loader)
│   └── layout/         # Componentes de layout (MainLayout, Header)
├── context/            # Contextos de React (AuthContext)
├── pages/              # Páginas de la aplicación
│   ├── Login.tsx
│   ├── Register.tsx
│   ├── Home.tsx
│   └── Users.tsx
├── routes/             # Configuración de rutas
│   ├── AppRoutes.tsx
│   └── PrivateRoute.tsx
├── services/           # Servicios de API
│   ├── api.ts
│   ├── auth.service.ts
│   └── users.service.ts
├── styles/             # Estilos globales
├── App.tsx             # Componente principal
└── main.tsx            # Punto de entrada de la aplicación
```

## Requisitos previos

- Node.js 16.x o superior
- npm o yarn
- Backend de Monetix ejecutándose (por defecto en http://localhost:5000)

## Instalación

1. Clonar el repositorio:
```bash
git clone <url-del-repositorio>
cd frontend/frontend
```

2. Instalar las dependencias:
```bash
npm install
```

3. Configurar las variables de entorno:

Crear un archivo `.env` en la raíz del proyecto con las siguientes variables:

```env
VITE_API_URL=http://localhost:5000/api
```

## Ejecución del proyecto

### Modo de desarrollo

Ejecutar el servidor de desarrollo con hot-reload:

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

### Compilación para producción

Compilar el proyecto para producción:

```bash
npm run build
```

Los archivos compilados se generarán en el directorio `dist/`

### Vista previa de producción

Previsualizar la compilación de producción localmente:

```bash
npm run preview
```

### Linting

Ejecutar el linter para verificar la calidad del código:

```bash
npm run lint
```

## Scripts disponibles

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo |
| `npm run build` | Compila la aplicación para producción |
| `npm run preview` | Previsualiza la compilación de producción |
| `npm run lint` | Ejecuta ESLint para verificar el código |

## Autenticación

La aplicación utiliza autenticación basada en JWT (JSON Web Tokens). Los tokens se almacenan en localStorage y se incluyen automáticamente en todas las peticiones HTTP mediante interceptores de Axios.

### Flujo de autenticación:

1. El usuario se registra o inicia sesión
2. El backend devuelve un token JWT
3. El token se almacena en localStorage
4. Todas las peticiones subsecuentes incluyen el token en el header `Authorization`
5. Si el token expira o es inválido (401), el usuario es redirigido al login

## Roles de usuario

La aplicación soporta dos roles principales:

- **Usuario estándar**: Acceso a funcionalidades básicas (home, predicciones, comparativas, metas)
- **Administrador**: Acceso completo incluyendo gestión de usuarios, categorías y configuración

## Desarrollo

### Convenciones de código

- Utilizar TypeScript para todos los archivos nuevos
- Seguir las reglas de ESLint configuradas
- Mantener componentes pequeños y reutilizables
- Utilizar tipos explícitos en lugar de `any`
- Documentar funciones complejas con comentarios

### Agregar nuevas rutas

1. Crear el componente de página en `src/pages/`
2. Agregar la ruta en `src/routes/AppRoutes.tsx`
3. Utilizar `<PrivateRoute>` para rutas protegidas
4. Utilizar `<PrivateRoute adminOnly>` para rutas administrativas

## Solución de problemas

### El servidor de desarrollo no inicia

- Verificar que todas las dependencias estén instaladas
- Eliminar `node_modules` y reinstalar: `rm -rf node_modules && npm install`
- Verificar que el puerto 5173 no esté en uso

### Error de conexión con el backend

- Verificar que el backend esté ejecutándose
- Revisar la variable de entorno `VITE_API_URL`
- Verificar la consola del navegador para errores de CORS

### Problemas de autenticación

- Limpiar localStorage: `localStorage.clear()`
- Verificar que el backend esté generando tokens válidos
- Revisar la fecha de expiración del token

## Contribución

Para contribuir al proyecto:

1. Crear una rama desde `main`
2. Realizar los cambios necesarios
3. Ejecutar `npm run lint` para verificar el código
4. Crear un commit con un mensaje descriptivo
5. Enviar un pull request

## Licencia

Este proyecto es privado y propietario.

## Contacto

Para más información o soporte, contactar al equipo de desarrollo.
