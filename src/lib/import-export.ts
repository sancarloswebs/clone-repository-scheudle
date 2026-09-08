import * as XLSX from "xlsx";
import { parseCategory, parseStatus, LINE1_CATEGORIES, type PaymentCategory, type PaymentStatus } from "@/lib/categories";
import { parseFlexibleDate } from "@/lib/dates";
import { parseAmount } from "@/lib/money";

export type ImportRow = {
  date: string;
  amount: string;
  category: PaymentCategory;
  beneficiary: string;
  description: string;
  notes: string;
  status: PaymentStatus;
  currency?: string;
  foreignAmount?: string | null;
  exchangeRate?: string | null;
  exchangeRateSource?: string | null;
};

const HEADER_MAP: Record<string, string> = {
  fecha: "date",
  date: "date",
  dia: "date",
  importe: "amount",
  monto: "amount",
  amount: "amount",
  total: "amount",
  rubro: "category",
  categoria: "category",
  category: "category",
  tipo: "category",
  beneficiario: "beneficiary",
  proveedor: "beneficiary",
  titular: "beneficiary",
  beneficiary: "beneficiary",
  concepto: "description",
  descripcion: "description",
  description: "description",
  detalle: "description",
  notas: "notes",
  notes: "notes",
  observaciones: "notes",
  estado: "status",
  status: "status",
};

function normalizeHeader(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function cellString(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(value).trim();
}

export function parseSpreadsheet(buffer: Buffer, filename: string): { rows: ImportRow[]; errors: string[] } {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true, raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { rows: [], errors: ["El archivo no contiene hojas."] };

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | Date | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: true,
  });

  if (matrix.length < 2) {
    return { rows: [], errors: ["No se encontraron filas para importar."] };
  }

  const headerRow = (matrix[0] ?? []).map((cell) => normalizeHeader(cellString(cell)));
  const mapped = headerRow.map((header) => HEADER_MAP[header] ?? "");

  if (!mapped.includes("date") || !mapped.includes("amount") || !mapped.includes("category")) {
    return {
      rows: [],
      errors: [
        "Faltan columnas obligatorias. Usá al menos: fecha, importe, rubro. Opcionales: beneficiario, descripcion, estado, notas.",
      ],
    };
  }

  const rows: ImportRow[] = [];
  const errors: string[] = [];

  matrix.slice(1).forEach((line, index) => {
    const lineNo = index + 2;
    const record: Record<string, string> = {};
    mapped.forEach((key, col) => {
      if (!key) return;
      record[key] = cellString(line[col]);
    });

    const empty = !record.date && !record.amount && !record.category;
    if (empty) return;

    const date = parseFlexibleDate(record.date ?? "");
    const amount = parseAmount(record.amount ?? "");
    const category = parseCategory(record.category ?? "");

    if (!date || amount == null || amount < 0 || !category) {
      errors.push(`Fila ${lineNo} de ${filename}: fecha, importe o rubro inválido.`);
      return;
    }

    rows.push({
      date,
      amount: amount.toFixed(2),
      category,
      beneficiary: record.beneficiary ?? "",
      description: record.description ?? "",
      notes: record.notes ?? "",
      status: parseStatus(record.status ?? "pendiente"),
    });
  });

  return { rows, errors };
}

export function buildCsv(rows: Array<{
  date: string;
  amount: string;
  category: string;
  beneficiary: string;
  description: string;
  notes: string;
  status: string;
  currency?: string;
  foreignAmount?: string | null;
  exchangeRate?: string | null;
  exchangeRateSource?: string | null;
}>): string {
  const header = ["fecha", "importe_ars", "moneda", "importe_moneda", "tipo_cambio", "fuente_tipo_cambio", "rubro", "beneficiario", "descripcion", "estado", "notas"];
  const lines = [header.join(";")];
  for (const row of rows) {
    const values = [
      row.date,
      row.amount.replace(".", ","),
      row.currency ?? "ARS",
      row.foreignAmount ? row.foreignAmount.replace(".", ",") : "",
      row.exchangeRate ? row.exchangeRate.replace(".", ",") : "",
      row.exchangeRateSource ?? "",
      row.category,
      row.beneficiary,
      row.description,
      row.status,
      row.notes,
    ].map(csvEscape);
    lines.push(values.join(";"));
  }
  return `\uFEFF${lines.join("\n")}`;
}

function csvEscape(value: string): string {
  const text = value.replace(/"/g, '""');
  if (/[;"\n]/.test(text)) return `"${text}"`;
  return text;
}

export function sampleCsv(): string {
  const rows = LINE1_CATEGORIES.map((category, index) => ({
    date: `2026-08-${String(7 + index).padStart(2, "0")}`,
    amount: String(500000 * (index + 1)),
    category,
    beneficiary: "Ejemplo SA",
    description: `Pago de muestra ${category}`,
    notes: "",
    status: index % 2 === 0 ? "pendiente" : "pagado",
  }));
  return buildCsv(rows);
}
