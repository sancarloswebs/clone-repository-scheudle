import {
  date,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("operador"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("users_email_idx").on(table.email)]);

export const sessions = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("sessions_token_idx").on(table.token)]);

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  companyName: text("company_name").notNull().default("Tesorería"),
  weeklyCap: numeric("weekly_cap", { precision: 18, scale: 2 }).notNull().default("20000000"),
  checksWeeklyCap: numeric("checks_weekly_cap", { precision: 18, scale: 2 }).notNull().default("10000000"),
  greenMax: numeric("green_max", { precision: 18, scale: 2 }).notNull().default("15000000"),
  yellowMax: numeric("yellow_max", { precision: 18, scale: 2 }).notNull().default("30000000"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  line: integer("line").notNull().default(1),
  currency: text("currency").notNull().default("ARS"),
  foreignAmount: numeric("foreign_amount", { precision: 18, scale: 4 }),
  exchangeRate: numeric("exchange_rate", { precision: 18, scale: 4 }),
  exchangeRateSource: text("exchange_rate_source"),
  date: date("date", { mode: "string" }).notNull(),
  amount: numeric("amount", { precision: 18, scale: 2 }).notNull(),
  category: text("category").notNull(),
  beneficiary: text("beneficiary").notNull().default(""),
  description: text("description").notNull().default(""),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("pendiente"),
  createdBy: integer("created_by")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  paidBy: integer("paid_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Session = typeof sessions.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
