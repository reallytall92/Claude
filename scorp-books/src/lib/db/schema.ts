import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { relations } from "drizzle-orm";

// ── Company ──────────────────────────────────────────────────────────

export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  ein: text("ein"),
  state: text("state").notNull().default("TX"),
  entityType: text("entity_type").notNull().default("S-Corp PLLC"),
  accountingMethod: text("accounting_method").notNull().default("cash"),
  fiscalYearStart: text("fiscal_year_start").notNull().default("01-01"),
  formationDate: text("formation_date"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ── Chart of Accounts (Categories) ──────────────────────────────────

export const chartOfAccounts = sqliteTable("chart_of_accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull(),
  name: text("name").notNull(),
  friendlyName: text("friendly_name").notNull(),
  description: text("description"),
  type: text("type", {
    enum: ["asset", "liability", "equity", "income", "expense"],
  }).notNull(),
  group: text("group"),
  parentId: integer("parent_id"),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(true),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ── Bank Accounts ───────────────────────────────────────────────────

export const bankAccounts = sqliteTable("bank_accounts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  type: text("type", {
    enum: ["checking", "savings", "credit_card"],
  }).notNull(),
  institution: text("institution"),
  last4: text("last4"),
  currentBalance: real("current_balance").notNull().default(0),
  linkedAccountId: integer("linked_account_id").references(
    () => chartOfAccounts.id
  ),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ── Statement Uploads ───────────────────────────────────────────────

export const statementUploads = sqliteTable("statement_uploads", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filename: text("filename").notNull(),
  accountId: integer("account_id")
    .notNull()
    .references(() => bankAccounts.id),
  periodStart: text("period_start"),
  periodEnd: text("period_end"),
  beginningBalance: real("beginning_balance"),
  endingBalance: real("ending_balance"),
  parsedCount: integer("parsed_count").notNull().default(0),
  status: text("status", {
    enum: ["pending", "parsed", "reviewed", "error"],
  })
    .notNull()
    .default("pending"),
  uploadedAt: text("uploaded_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ── Reconciliations ─────────────────────────────────────────────────

export const reconciliations = sqliteTable("reconciliations", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  accountId: integer("account_id")
    .notNull()
    .references(() => bankAccounts.id),
  periodStart: text("period_start").notNull(),
  periodEnd: text("period_end").notNull(),
  statementEndingBalance: real("statement_ending_balance").notNull(),
  bookEndingBalance: real("book_ending_balance"),
  difference: real("difference"),
  status: text("status", {
    enum: ["open", "balanced", "closed"],
  })
    .notNull()
    .default("open"),
  completedAt: text("completed_at"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ── Transactions ────────────────────────────────────────────────────

export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  amount: real("amount").notNull(),
  description: text("description").notNull(),
  rawDescription: text("raw_description"),
  accountId: integer("account_id")
    .notNull()
    .references(() => bankAccounts.id),
  categoryId: integer("category_id").references(() => chartOfAccounts.id),
  type: text("type", { enum: ["debit", "credit"] }).notNull(),
  source: text("source", { enum: ["upload", "manual"] })
    .notNull()
    .default("manual"),
  classificationSource: text("classification_source", {
    enum: ["manual", "rule", "verified"],
  }),
  statementUploadId: integer("statement_upload_id").references(
    () => statementUploads.id
  ),
  reconciliationId: integer("reconciliation_id").references(
    () => reconciliations.id
  ),
  fingerprint: text("fingerprint"),
  reconciled: integer("reconciled", { mode: "boolean" })
    .notNull()
    .default(false),
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ── Classification Rules ────────────────────────────────────────────

export const classificationRules = sqliteTable("classification_rules", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  pattern: text("pattern").notNull(),
  categoryId: integer("category_id")
    .notNull()
    .references(() => chartOfAccounts.id),
  priority: integer("priority").notNull().default(0),
  createdFromTransactionId: integer("created_from_transaction_id").references(
    () => transactions.id
  ),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ── Journal Entries (Manual Entries) ────────────────────────────────

export const journalEntries = sqliteTable("journal_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  date: text("date").notNull(),
  memo: text("memo"),
  type: text("type", {
    enum: [
      "payroll",
      "distribution",
      "depreciation",
      "opening_balance",
      "adjustment",
    ],
  }).notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const journalEntryLines = sqliteTable("journal_entry_lines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  journalEntryId: integer("journal_entry_id")
    .notNull()
    .references(() => journalEntries.id),
  accountId: integer("account_id")
    .notNull()
    .references(() => chartOfAccounts.id),
  debit: real("debit").notNull().default(0),
  credit: real("credit").notNull().default(0),
  memo: text("memo"),
});

// ── Bank Formats (for future multi-bank support) ────────────────────

export const bankFormats = sqliteTable("bank_formats", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  bankName: text("bank_name").notNull(),
  parserKey: text("parser_key").notNull().unique(),
  description: text("description"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// ── Settings ────────────────────────────────────────────────────────

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value"),
});

// ── Relations ───────────────────────────────────────────────────────

export const chartOfAccountsRelations = relations(
  chartOfAccounts,
  ({ many }) => ({
    transactions: many(transactions),
    classificationRules: many(classificationRules),
    journalEntryLines: many(journalEntryLines),
  })
);

export const bankAccountsRelations = relations(bankAccounts, ({ many }) => ({
  transactions: many(transactions),
  statementUploads: many(statementUploads),
  reconciliations: many(reconciliations),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  account: one(bankAccounts, {
    fields: [transactions.accountId],
    references: [bankAccounts.id],
  }),
  category: one(chartOfAccounts, {
    fields: [transactions.categoryId],
    references: [chartOfAccounts.id],
  }),
  statementUpload: one(statementUploads, {
    fields: [transactions.statementUploadId],
    references: [statementUploads.id],
  }),
  reconciliation: one(reconciliations, {
    fields: [transactions.reconciliationId],
    references: [reconciliations.id],
  }),
}));

export const statementUploadsRelations = relations(
  statementUploads,
  ({ one, many }) => ({
    account: one(bankAccounts, {
      fields: [statementUploads.accountId],
      references: [bankAccounts.id],
    }),
    transactions: many(transactions),
  })
);

export const reconciliationsRelations = relations(
  reconciliations,
  ({ one, many }) => ({
    account: one(bankAccounts, {
      fields: [reconciliations.accountId],
      references: [bankAccounts.id],
    }),
    transactions: many(transactions),
  })
);

export const classificationRulesRelations = relations(
  classificationRules,
  ({ one }) => ({
    category: one(chartOfAccounts, {
      fields: [classificationRules.categoryId],
      references: [chartOfAccounts.id],
    }),
    createdFromTransaction: one(transactions, {
      fields: [classificationRules.createdFromTransactionId],
      references: [transactions.id],
    }),
  })
);

export const journalEntriesRelations = relations(
  journalEntries,
  ({ many }) => ({
    lines: many(journalEntryLines),
  })
);

export const journalEntryLinesRelations = relations(
  journalEntryLines,
  ({ one }) => ({
    journalEntry: one(journalEntries, {
      fields: [journalEntryLines.journalEntryId],
      references: [journalEntries.id],
    }),
    account: one(chartOfAccounts, {
      fields: [journalEntryLines.accountId],
      references: [chartOfAccounts.id],
    }),
  })
);
