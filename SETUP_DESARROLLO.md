# Entorno de desarrollo seguro

## Objetivo

Usar una base de datos de desarrollo independiente para probar cambios sin tocar la base de producción.

## 1. GitHub

Recomendado: crear un repositorio separado para desarrollo, por ejemplo `aserradero-san-cayetano-dev`. No subas `.env`, `.env.local` ni credenciales.

## 2. Supabase

Creá un proyecto Supabase de desarrollo. Usá su `DATABASE_URL` en `.env.local`.

```bash
cp .env.example .env.local
```

Luego completá `DATABASE_URL`.

## 3. Vercel

Recomendado: crear un proyecto Vercel separado para desarrollo y conectar el repositorio de desarrollo. En sus Environment Variables cargá la `DATABASE_URL` de Supabase DESARROLLO.

Producción debe conservar su proyecto Vercel y su `DATABASE_URL` de producción.

## 4. Producción

Esta versión incluye una migración aditiva:

```sql
ALTER TABLE payments ADD COLUMN IF NOT EXISTS line integer NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS payments_line_date_idx ON payments (line, date);
```

No hay `DROP TABLE`, `TRUNCATE` ni borrado de registros en esta migración. Los pagos existentes reciben `line = 1`.

La aplicación también ejecuta esa migración de forma idempotente durante su inicialización, para que una base existente pueda incorporar la columna sin recrearse.

**Antes de desplegar a producción, hacé un backup de Supabase.**

## 5. Variables

No copies las credenciales de producción al entorno de desarrollo. Si la credencial que estaba dentro del ZIP original fue compartida fuera de tu entorno privado, rotala en Supabase y actualizá Vercel.
