# Stockly

Sistema web de control de inventario para tiendas pequeñas. Permite registrar productos, categorías y proveedores, y llevar el control de cada entrada y salida de mercadería, con alertas de stock bajo y un resumen del negocio en tiempo real.

> Proyecto de **Isaí Antonio Gómez Morales** · Carné **2025-177** · 5to Perito en Informática · Centro Educativo Técnico Laboral Kinal

---

## ¿Qué hace?

- **Dashboard:** ventas del día y del mes, valor del inventario, productos por acabarse, los más vendidos y los últimos movimientos.
- **Productos:** nombre, categoría, proveedor, ubicación en bodega, precio de compra y de venta, con el cálculo de ganancia por unidad.
- **Movimientos:** entradas (compra, devolución, ajuste) y salidas (venta, pérdida, devolución, ajuste), con una vista previa de cómo quedará el stock antes de guardar.
- **Categorías y proveedores:** catálogos para organizar los productos.
- **Mi cuenta:** cambiar el nombre y cambiar o crear la contraseña.
- **Inicio de sesión** con correo y contraseña o con Google.
- **Cierre de sesión automático** después de 10 minutos sin actividad.

## Reglas del negocio

- El stock **solo cambia con movimientos**; nunca se edita a mano.
- El stock **nunca puede quedar negativo**.
- Los movimientos **no se editan ni se borran**. Los errores se corrigen con un ajuste.
- Las pérdidas y los ajustes **obligan a escribir una nota** explicando qué pasó.
- Cada movimiento guarda el **precio de ese momento**. Si una compra llega a otro precio, se actualiza el precio de compra del producto.
- Los productos, categorías y proveedores con historial **se desactivan en lugar de borrarse**, y se pueden reactivar.
- **Cada usuario tiene su propio inventario**, separado del de los demás.

---

## Tecnologías

| Parte | Tecnología |
|---|---|
| Frontend | Angular 22 · TypeScript · Signals · Reactive Forms |
| Backend | Node.js · Express 5 · TypeScript |
| Base de datos | PostgreSQL |
| ORM | Prisma 7 |
| Autenticación | JWT (15 horas) · bcrypt · Google Identity Services |
| Gestor de paquetes | pnpm |

---

## Requisitos

- **Node.js** 24 o superior
- **pnpm** 11 o superior
- **PostgreSQL** corriendo en `localhost:5432`, con usuario `postgres` y contraseña `admin`

> No hace falta crear la base de datos a mano: al arrancar, el backend crea la base `stockly` si no existe y aplica las migraciones.

---

## Instalación y uso

### 1. Clonar el repositorio

```bash
git clone https://github.com/igomez-2025177/STOCKLY.git
cd STOCKLY
```

### 2. Backend

```bash
cd backend
pnpm install
pnpm start
```

El servidor queda en **http://localhost:3000**. Para comprobar que responde, abre http://localhost:3000/api/health

### 3. Frontend

En otra terminal:

```bash
cd frontend
pnpm install
pnpm start
```

La aplicación queda en **http://localhost:4200**

### 4. Primer uso

1. Crea una cuenta o entra con Google.
2. Registra al menos una **categoría**.
3. Opcional: registra tus **proveedores**.
4. Registra tus **productos** con la cantidad que ya tienes.
5. Desde **Movimientos**, registra cada compra, venta o pérdida.

---

## Variables de entorno

El archivo `backend/.env` ya viene incluido en el repositorio:

| Variable | Para qué sirve |
|---|---|
| `PORT` | Puerto del backend (3000) |
| `DATABASE_URL` | Conexión a PostgreSQL |
| `JWT_SECRET` | Clave para firmar los tokens de sesión |
| `GOOGLE_CLIENT_ID` | ID de cliente para el inicio de sesión con Google |

---

## Scripts del backend

| Comando | Qué hace |
|---|---|
| `pnpm start` | Arranca el servidor en modo desarrollo (se reinicia solo al guardar) |
| `pnpm build` | Compila TypeScript a la carpeta `dist` |
| `pnpm prod` | Corre la versión compilada |
| `pnpm db:migrate` | Crea y aplica una nueva migración |
| `pnpm db:generate` | Regenera el cliente de Prisma |
| `pnpm db:studio` | Abre Prisma Studio para ver los datos |

---

## Estructura del proyecto

```
STOCKLY/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma        # modelos de la base de datos
│   │   └── migrations/
│   ├── src/
│   │   ├── config/              # conexión, creación de BD y migraciones
│   │   ├── controllers/         # lógica de cada módulo
│   │   ├── middlewares/         # verificación del token
│   │   ├── routes/              # rutas de la API
│   │   ├── utils/               # JWT, contraseñas, correos
│   │   └── index.ts             # arranque del servidor
│   └── .env
├── frontend/
│   ├── public/                  # logo e ícono
│   └── src/app/
│       ├── core/                # modelos, servicios, guards, interceptor
│       ├── shared/              # modal y layout
│       └── pages/               # dashboard, productos, movimientos, etc.
└── README.md
```

---

## API

Todas las rutas, excepto registro, login y Google, piden el encabezado `Authorization: Bearer <token>`.

| Módulo | Rutas |
|---|---|
| Autenticación | `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/google` · `GET /api/auth/me` · `PATCH /api/auth/perfil` · `PATCH /api/auth/password` |
| Categorías | `/api/categorias` |
| Proveedores | `/api/proveedores` |
| Productos | `/api/productos` |
| Movimientos | `GET /api/movimientos` · `GET /api/movimientos/:id` · `POST /api/movimientos` |
| Dashboard | `GET /api/dashboard` |

---

## Ramas

```
main
├── develop
│   └── igomez-2025177
└── test
```

- **main:** versión oficial
- **develop:** integración del trabajo
- **test:** pruebas
- **igomez-2025177:** rama de desarrollo personal