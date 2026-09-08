# Tesorería — Aserradero San Cayetano

## Desarrollo seguro

Esta versión agrega selector de Línea 1 / Línea 2. La migración de base es aditiva: `payments.line` se agrega con valor por defecto `1`, por lo que los movimientos existentes quedan en Línea 1.

### Variables de entorno

Copiá `.env.example` a `.env.local` y completá `DATABASE_URL`. No subas `.env.local` ni credenciales reales a GitHub. En Vercel, configurá `DATABASE_URL` en Environment Variables.

### Importante sobre Línea 2

Línea 2 tiene movimientos en efectivo, dólares y cheques físicos. Depósitos bancarios son egresos y extracciones bancarias son ingresos. Los dólares se convierten automáticamente a ARS usando el promedio de compra y venta de dólar Blue publicado por InfoDolar.
