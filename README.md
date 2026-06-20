# Inventory DSS Web

Frontend web de la plataforma **Inventory Optimization DSS Platform**, una solución de soporte de decisiones para la optimización de inventarios en MYPEs retail de Lima Metropolitana.

Este repositorio contiene únicamente la aplicación web orientada al usuario final. Su objetivo es permitir que administradores o responsables de inventario puedan cargar datos, visualizar pronósticos, revisar KPIs y consultar recomendaciones accionables de reposición.

## Rol dentro del sistema

Este proyecto forma parte de una arquitectura multi-repositorio:

| Repositorio                 | Responsabilidad                                 |
| --------------------------- | ----------------------------------------------- |
| `inventory-dss-web`         | Frontend Next.js                                |
| `inventory-dss-api`         | Backend FastAPI como monolito modular hexagonal |
| `inventory-dss-ftgm-engine` | Motor analítico FTGM desacoplado                |
| `inventory-dss-infra`       | Infraestructura y despliegue                    |
| `inventory-dss-docs`        | Documentación académica y arquitectónica        |

## Responsabilidades del frontend

El frontend será responsable de:

* Autenticación visual de usuarios.
* Navegación principal de la plataforma.
* Carga de archivos CSV o Excel.
* Visualización del catálogo de productos.
* Visualización de ventas históricas.
* Visualización de inventario.
* Visualización de ejecuciones de pronóstico.
* Visualización de KPIs.
* Visualización de recomendaciones.
* Visualización de reportes.
* Consumo de la API del backend.

## Lo que este repositorio no debe hacer

Este repositorio no debe contener:

* Lógica matemática del modelo FTGM.
* Reglas fuertes de negocio.
* Acceso directo a PostgreSQL o Supabase.
* Procesamiento pesado de datos.
* Cálculo oficial de KPIs.
* Generación oficial de recomendaciones.
* Lógica de autenticación del lado servidor.
* Código de infraestructura global.

## Tecnología objetivo

* Next.js.
* React.
* TypeScript.
* Consumo HTTP/REST/JSON.
* Gráficos futuros con librerías de visualización.
* Componentes reutilizables por dominio funcional.

## Estructura principal

```text
src/
├── app/
├── components/
├── features/
├── hooks/
├── lib/
└── types/
```

## Relación con el backend

El frontend consume el backend a través de:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

La aplicación web no debe comunicarse directamente con el FTGM Engine. Toda predicción debe solicitarse mediante el backend `inventory-dss-api`.

## Estado actual

Este repositorio se encuentra en fase inicial. Contiene únicamente estructura base, configuración mínima y documentación inicial.
