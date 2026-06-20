# Inventory DSS Frontend

Frontend principal de la plataforma **Inventory Optimization DSS Platform**.

Este repositorio contiene la Interfaz de Usuario (UI) construida para soportar el módulo de decisiones de inventario basado en pronósticos FTGM. Ha sido diseñado con una estética moderna de producto SaaS, orientada a ofrecer la mejor experiencia de usuario para MYPEs retail.

## Estética y Diseño (UX/UI)

El diseño está fuertemente inspirado en interfaces SaaS limpias y premium:
- Fondo gris claro y superficies blancas (`#F5F7FB`, `#FFFFFF`).
- Bordes redondeados generosos (radius de 16px a 24px).
- Sombras muy suaves (soft shadows).
- Colores primarios en tonos azul y lavanda (`#2563EB`, `#7C3AED`).
- Diseño enfocado en el espacio en blanco y tipografía legible (`Inter`).

## Stack Tecnológico

- **Framework:** Next.js (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS
- **Iconos:** Lucide React
- **Gráficos:** Recharts
- **Utilidades UI:** `clsx`, `tailwind-merge`

## Módulos Incluidos

El frontend contiene páginas dedicadas para todos los módulos de la arquitectura hexagonal del backend:
- `/dashboard`: Panel de resumen (Dashboard principal SaaS).
- `/products`, `/sales`, `/inventory`: Gestión de datos operativos base.
- `/ingestion`: Carga de archivos (Datasets).
- `/data-preparation`: Historial de limpieza y detección de outliers.
- `/forecasting`: Corridas del motor predictivo FTGM.
- `/kpis`: Coberturas, stockout risk y rotación.
- `/recommendations`: Sugerencias accionables de reposición de inventario.
- `/reports`, `/notifications`, `/files`, `/validation`, `/settings`, `/admin`: Herramientas de soporte y gestión.

## Estado de la Implementación (Modo Mock)

Actualmente, el frontend opera en **Modo Mock**:
- Los datos visualizados son estáticos (hardcoded/simulados), pero realistas para el contexto de retail e inventarios.
- La página de login (`/login`) guarda una bandera (`mock-session`) en el `localStorage` para dejar pasar al usuario al dashboard.
- **No existe** integración directa con el backend real en esta etapa, pero la arquitectura base y los componentes UI están preparados para ser integrados usando llamadas asíncronas en el futuro.

## Estructura de Carpetas

```text
src/
├── app/                  # Rutas (App Router Next.js)
│   ├── dashboard/
│   ├── login/
│   ├── ...
├── components/           # Componentes UI reutilizables
│   ├── layout/           # AppShell, Sidebar, Topbar
│   ├── ui/               # Card, Badge, Table, StatCard
│   ├── charts/           # Gráficos con Recharts
├── lib/                  # Utilidades (cn)
├── mocks/                # Datos simulados (Dashboard, Mocks)
├── types/                # Interfaces TypeScript del dominio
```

## Ejecución Local

Para levantar este frontend de forma local, ejecuta los siguientes comandos en tu terminal de PowerShell:

```powershell
cd C:\Users\Usuario\Documents\2026-1\Thesis\inventory-dss-web
npm install
npm run dev
```

Una vez que el servidor esté en funcionamiento, puedes abrir tu navegador en:
- **Login Mock:** http://localhost:3000/login
- **Dashboard:** http://localhost:3000/dashboard
