CREATE TABLE `bank_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`institution` text,
	`last4` text,
	`current_balance` real DEFAULT 0 NOT NULL,
	`linked_account_id` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`linked_account_id`) REFERENCES `chart_of_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `bank_formats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`bank_name` text NOT NULL,
	`parser_key` text NOT NULL,
	`description` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `bank_formats_parser_key_unique` ON `bank_formats` (`parser_key`);--> statement-breakpoint
CREATE TABLE `chart_of_accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`friendly_name` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`group` text,
	`parent_id` integer,
	`is_default` integer DEFAULT true NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `classification_rules` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`pattern` text NOT NULL,
	`category_id` integer NOT NULL,
	`priority` integer DEFAULT 0 NOT NULL,
	`created_from_transaction_id` integer,
	`created_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `chart_of_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_from_transaction_id`) REFERENCES `transactions`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `companies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`ein` text,
	`state` text DEFAULT 'TX' NOT NULL,
	`entity_type` text DEFAULT 'S-Corp PLLC' NOT NULL,
	`accounting_method` text DEFAULT 'cash' NOT NULL,
	`fiscal_year_start` text DEFAULT '01-01' NOT NULL,
	`formation_date` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`memo` text,
	`type` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `journal_entry_lines` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`journal_entry_id` integer NOT NULL,
	`account_id` integer NOT NULL,
	`debit` real DEFAULT 0 NOT NULL,
	`credit` real DEFAULT 0 NOT NULL,
	`memo` text,
	FOREIGN KEY (`journal_entry_id`) REFERENCES `journal_entries`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`account_id`) REFERENCES `chart_of_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `reconciliations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` integer NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`statement_ending_balance` real NOT NULL,
	`book_ending_balance` real,
	`difference` real,
	`status` text DEFAULT 'open' NOT NULL,
	`completed_at` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `bank_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text
);
--> statement-breakpoint
CREATE TABLE `statement_uploads` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`filename` text NOT NULL,
	`account_id` integer NOT NULL,
	`period_start` text,
	`period_end` text,
	`beginning_balance` real,
	`ending_balance` real,
	`parsed_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`uploaded_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `bank_accounts`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`date` text NOT NULL,
	`amount` real NOT NULL,
	`description` text NOT NULL,
	`raw_description` text,
	`account_id` integer NOT NULL,
	`category_id` integer,
	`type` text NOT NULL,
	`source` text DEFAULT 'manual' NOT NULL,
	`classification_source` text,
	`statement_upload_id` integer,
	`reconciliation_id` integer,
	`reconciled` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`account_id`) REFERENCES `bank_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`category_id`) REFERENCES `chart_of_accounts`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`statement_upload_id`) REFERENCES `statement_uploads`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reconciliation_id`) REFERENCES `reconciliations`(`id`) ON UPDATE no action ON DELETE no action
);
