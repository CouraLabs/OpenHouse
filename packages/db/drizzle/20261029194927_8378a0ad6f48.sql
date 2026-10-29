CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`tenant_id` integer NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_by` integer,
	`created_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`update_by` integer,
	`update_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`name` text NOT NULL,
	`agency` text,
	`number` text,
	`type` text NOT NULL,
	`balance` integer NOT NULL,
	`opening_balance` integer NOT NULL,
	`opening_dt` text DEFAULT current_date NOT NULL,
	`reconciled_through` text,
	`currency` text NOT NULL,
	`spread_pct` integer DEFAULT 0.00 NOT NULL,
	`limit` integer,
	`close_day` integer,
	`due_day` integer,
	`close_day_inclusive` integer DEFAULT false NOT NULL,
	`is_default` integer DEFAULT false NOT NULL,
	`ownership` text DEFAULT 'personal' NOT NULL,
	CONSTRAINT `fk_accounts_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`),
	CONSTRAINT "accounts_spread_pct_range" CHECK("spread_pct" >= 0 and "spread_pct" <= 10000),
	CONSTRAINT "accounts_name_length" CHECK(length("name") <= 255),
	CONSTRAINT "accounts_agency_length" CHECK("agency" is null or length("agency") <= 255),
	CONSTRAINT "accounts_number_length" CHECK("number" is null or length("number") <= 34)
);
--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`tenant_id` integer NOT NULL,
	`actor_id` integer,
	`action` text NOT NULL,
	`details` text DEFAULT '{}' NOT NULL,
	`created_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `calendar_feeds` (
	`user_id` integer PRIMARY KEY,
	`tenant_id` integer NOT NULL,
	`token` text NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	CONSTRAINT `fk_calendar_feeds_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
	CONSTRAINT `fk_calendar_feeds_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`tenant_id` integer NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_by` integer,
	`created_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`update_by` integer,
	`update_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`name` text NOT NULL,
	`search_name` text NOT NULL,
	`color` text NOT NULL,
	`default_split` text,
	CONSTRAINT `fk_categories_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`),
	CONSTRAINT "categories_name_length" CHECK(length("name") <= 255),
	CONSTRAINT "categories_color_length" CHECK(length("color") <= 9)
);
--> statement-breakpoint
CREATE TABLE `credit_card_statements` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`tenant_id` integer NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_by` integer,
	`created_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`update_by` integer,
	`update_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`account_id` integer NOT NULL,
	`period_start` text NOT NULL,
	`close_date` text NOT NULL,
	`due_date` text NOT NULL,
	`closed_at` integer,
	`minimum_due` integer,
	`bank_total` integer,
	`reconciled_at` integer,
	CONSTRAINT `fk_credit_card_statements_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`),
	CONSTRAINT `fk_credit_card_statements_account_id_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`),
	CONSTRAINT "credit_card_statements_period_order" CHECK("close_date" > "period_start"),
	CONSTRAINT "credit_card_statements_due_after_close" CHECK("due_date" >= "close_date")
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`tenant_id` integer NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_by` integer,
	`created_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`update_by` integer,
	`update_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`name` text NOT NULL,
	`linked_account_id` integer NOT NULL,
	`balance` integer NOT NULL,
	`balance_dt` text NOT NULL,
	`target_balance` integer NOT NULL,
	`target_dt` text,
	CONSTRAINT `fk_goals_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`),
	CONSTRAINT `fk_goals_linked_account_id_accounts_id_fk` FOREIGN KEY (`linked_account_id`) REFERENCES `accounts`(`id`),
	CONSTRAINT "goals_name_length" CHECK(length("name") <= 255)
);
--> statement-breakpoint
CREATE TABLE `import_mappings` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`tenant_id` integer NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_by` integer,
	`created_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`update_by` integer,
	`update_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`account_id` integer NOT NULL,
	`mapping` text NOT NULL,
	CONSTRAINT `fk_import_mappings_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`),
	CONSTRAINT `fk_import_mappings_account_id_accounts_id_fk` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`)
);
--> statement-breakpoint
CREATE TABLE `limits` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`tenant_id` integer NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_by` integer,
	`created_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`update_by` integer,
	`update_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`category_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`type` text NOT NULL,
	CONSTRAINT `fk_limits_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`),
	CONSTRAINT `fk_limits_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`tenant_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`kind` text NOT NULL,
	`ref_id` integer NOT NULL,
	`due_date` text NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	CONSTRAINT `fk_notification_log_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`),
	CONSTRAINT `fk_notification_log_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `notification_preferences` (
	`user_id` integer PRIMARY KEY,
	`tenant_id` integer NOT NULL,
	`in_app_enabled` integer DEFAULT true NOT NULL,
	`push_enabled` integer DEFAULT true NOT NULL,
	`push_details` integer DEFAULT false NOT NULL,
	`bill_lead_days` integer DEFAULT 3 NOT NULL,
	`recurring_lead_days` integer DEFAULT 1 NOT NULL,
	`limit_alert_80` integer DEFAULT true NOT NULL,
	`limit_alert_100` integer DEFAULT true NOT NULL,
	`delivery` text DEFAULT 'individual' NOT NULL,
	`update_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	CONSTRAINT `fk_notification_preferences_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
	CONSTRAINT `fk_notification_preferences_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`tenant_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`body` text NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`read_at` integer,
	CONSTRAINT `fk_notifications_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`),
	CONSTRAINT `fk_notifications_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_codes` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`user_id` integer NOT NULL,
	`code_hash` text NOT NULL,
	`kind` text NOT NULL,
	`issued_by` integer,
	`expires_at` integer,
	`used_at` integer,
	`notice_seen_at` integer,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	CONSTRAINT `fk_password_reset_codes_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`tenant_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`user_agent` text,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	CONSTRAINT `fk_push_subscriptions_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`),
	CONSTRAINT `fk_push_subscriptions_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `receivers` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`tenant_id` integer NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_by` integer,
	`created_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`update_by` integer,
	`update_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`name` text NOT NULL,
	`search_name` text NOT NULL,
	`type` text NOT NULL,
	CONSTRAINT `fk_receivers_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`),
	CONSTRAINT "receivers_name_length" CHECK(length("name") <= 255)
);
--> statement-breakpoint
CREATE TABLE `recurring_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`tenant_id` integer NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_by` integer,
	`created_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`update_by` integer,
	`update_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`receiver_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`linked_account_id` integer NOT NULL,
	`amount` integer NOT NULL,
	`type` text DEFAULT 'Expense' NOT NULL,
	`frequency` text NOT NULL,
	`frequency_day` integer,
	`frequency_month` integer,
	`paid_by_user_id` integer,
	`default_split` text,
	CONSTRAINT `fk_recurring_transactions_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`),
	CONSTRAINT `fk_recurring_transactions_receiver_id_receivers_id_fk` FOREIGN KEY (`receiver_id`) REFERENCES `receivers`(`id`),
	CONSTRAINT `fk_recurring_transactions_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`),
	CONSTRAINT `fk_recurring_transactions_linked_account_id_accounts_id_fk` FOREIGN KEY (`linked_account_id`) REFERENCES `accounts`(`id`),
	CONSTRAINT `fk_recurring_transactions_paid_by_user_id_users_id_fk` FOREIGN KEY (`paid_by_user_id`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_codes` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`tenant_id` integer NOT NULL,
	`code` text NOT NULL UNIQUE,
	`used_at` integer,
	`expires_at` integer,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	CONSTRAINT `fk_tenant_codes_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenant_settings` (
	`tenant_id` integer PRIMARY KEY,
	`timezone` text NOT NULL,
	`main_currency` text NOT NULL,
	`timezone_confirmed` integer DEFAULT false NOT NULL,
	`unsplit_mode` text DEFAULT 'personal' NOT NULL,
	`update_by` integer,
	`update_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	CONSTRAINT `fk_tenant_settings_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`)
);
--> statement-breakpoint
CREATE TABLE `tenants` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`name` text NOT NULL UNIQUE,
	`expires_in` integer,
	`deletion_date` text,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`updated_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transaction_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`tenant_id` integer NOT NULL,
	`transaction_id` integer NOT NULL,
	`action` text NOT NULL,
	`before` text,
	`after` text,
	`created_by` integer,
	`created_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	CONSTRAINT `fk_transaction_history_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`),
	CONSTRAINT `fk_transaction_history_transaction_id_transactions_id_fk` FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`)
);
--> statement-breakpoint
CREATE TABLE `transaction_linkers` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`tenant_id` integer NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_by` integer,
	`created_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`update_by` integer,
	`update_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`description` text NOT NULL,
	`search_name` text NOT NULL,
	`category_id` integer NOT NULL,
	`receiver_id` integer,
	CONSTRAINT `fk_transaction_linkers_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`),
	CONSTRAINT `fk_transaction_linkers_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`),
	CONSTRAINT `fk_transaction_linkers_receiver_id_receivers_id_fk` FOREIGN KEY (`receiver_id`) REFERENCES `receivers`(`id`)
);
--> statement-breakpoint
CREATE TABLE `transaction_splits` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`tenant_id` integer NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_by` integer,
	`created_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`update_by` integer,
	`update_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`transaction_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`share` integer NOT NULL,
	CONSTRAINT `fk_transaction_splits_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`),
	CONSTRAINT `fk_transaction_splits_transaction_id_transactions_id_fk` FOREIGN KEY (`transaction_id`) REFERENCES `transactions`(`id`),
	CONSTRAINT `fk_transaction_splits_user_id_users_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
	CONSTRAINT "transaction_splits_share_positive" CHECK("share" > 0)
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`tenant_id` integer NOT NULL,
	`status` text DEFAULT 'ACTIVE' NOT NULL,
	`created_by` integer,
	`created_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`update_by` integer,
	`update_dt` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`name` text NOT NULL,
	`note` text,
	`invoice` text,
	`amount` integer NOT NULL,
	`transaction_dt` text NOT NULL,
	`balance_on_dt` integer NOT NULL,
	`linked_account_id` integer NOT NULL,
	`category_id` integer NOT NULL,
	`receiver_id` integer,
	`recurring_id` integer,
	`type` text NOT NULL,
	`review_status` text DEFAULT 'Verify' NOT NULL,
	`status_note` text,
	`transfer_group_id` text,
	`statement_id` integer,
	`statement_pinned` integer DEFAULT false NOT NULL,
	`payment_statement_id` integer,
	`installment_group_id` text,
	`installment_number` integer,
	`installment_count` integer,
	`is_adjustment` integer DEFAULT false NOT NULL,
	`external_id` text,
	`import_batch_id` text,
	`paid_by_user_id` integer,
	`is_settlement` integer DEFAULT false NOT NULL,
	CONSTRAINT `fk_transactions_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`),
	CONSTRAINT `fk_transactions_linked_account_id_accounts_id_fk` FOREIGN KEY (`linked_account_id`) REFERENCES `accounts`(`id`),
	CONSTRAINT `fk_transactions_category_id_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`),
	CONSTRAINT `fk_transactions_receiver_id_receivers_id_fk` FOREIGN KEY (`receiver_id`) REFERENCES `receivers`(`id`),
	CONSTRAINT `fk_transactions_recurring_id_recurring_transactions_id_fk` FOREIGN KEY (`recurring_id`) REFERENCES `recurring_transactions`(`id`),
	CONSTRAINT `fk_transactions_statement_id_credit_card_statements_id_fk` FOREIGN KEY (`statement_id`) REFERENCES `credit_card_statements`(`id`),
	CONSTRAINT `fk_transactions_payment_statement_id_credit_card_statements_id_fk` FOREIGN KEY (`payment_statement_id`) REFERENCES `credit_card_statements`(`id`),
	CONSTRAINT `fk_transactions_paid_by_user_id_users_id_fk` FOREIGN KEY (`paid_by_user_id`) REFERENCES `users`(`id`),
	CONSTRAINT "transactions_pinned_needs_statement" CHECK(not "statement_pinned" or "statement_id" is not null),
	CONSTRAINT "transactions_installment_shape" CHECK(("installment_group_id" is null and "installment_number" is null and "installment_count" is null) or ("installment_group_id" is not null and 1 <= "installment_number" and "installment_number" <= "installment_count" and "installment_count" <= 48)),
	CONSTRAINT "transactions_payment_is_transfer_in" CHECK("payment_statement_id" is null or ("type" = 'Income' and "transfer_group_id" is not null and "statement_id" is null)),
	CONSTRAINT "transactions_name_length" CHECK(length("name") <= 255),
	CONSTRAINT "transactions_invoice_length" CHECK("invoice" is null or length("invoice") <= 255),
	CONSTRAINT "transactions_status_note_length" CHECK("status_note" is null or length("status_note") <= 500),
	CONSTRAINT "transactions_external_id_length" CHECK("external_id" is null or length("external_id") <= 255)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT,
	`tenant_id` integer NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`password` text NOT NULL,
	`role` text DEFAULT 'user' NOT NULL,
	`refresh_token_hash` text,
	`is_active` integer DEFAULT true NOT NULL,
	`anonymized_at` integer,
	`start_page` text DEFAULT '/' NOT NULL,
	`created_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	`updated_at` integer DEFAULT (CAST(unixepoch('subsec') * 1000 AS INTEGER)) NOT NULL,
	CONSTRAINT `fk_users_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`)
);
--> statement-breakpoint
CREATE INDEX `accounts_tenant_id_idx` ON `accounts` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `accounts_one_default_per_tenant_key` ON `accounts` (`tenant_id`) WHERE is_default;--> statement-breakpoint
CREATE INDEX `audit_log_tenant_id_idx` ON `audit_log` (`tenant_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `calendar_feeds_token_key` ON `calendar_feeds` (`token`);--> statement-breakpoint
CREATE INDEX `categories_tenant_id_idx` ON `categories` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `categories_tenant_id_search_name_idx` ON `categories` (`tenant_id`,`search_name`);--> statement-breakpoint
CREATE UNIQUE INDEX `categories_tenant_id_name_active_key` ON `categories` (`tenant_id`,`search_name`) WHERE status = 'ACTIVE';--> statement-breakpoint
CREATE UNIQUE INDEX `credit_card_statements_account_close_key` ON `credit_card_statements` (`tenant_id`,`account_id`,`close_date`) WHERE status = 'ACTIVE';--> statement-breakpoint
CREATE INDEX `credit_card_statements_tenant_account_due_idx` ON `credit_card_statements` (`tenant_id`,`account_id`,`due_date`);--> statement-breakpoint
CREATE INDEX `goals_tenant_id_idx` ON `goals` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `import_mappings_account_key` ON `import_mappings` (`tenant_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `limits_tenant_id_idx` ON `limits` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `notification_log_claim_key` ON `notification_log` (`user_id`,`kind`,`ref_id`,`due_date`);--> statement-breakpoint
CREATE INDEX `notifications_user_id_idx` ON `notifications` (`user_id`,`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `password_reset_codes_code_hash_key` ON `password_reset_codes` (`code_hash`);--> statement-breakpoint
CREATE INDEX `password_reset_codes_user_id_idx` ON `password_reset_codes` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_key` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE INDEX `push_subscriptions_user_id_idx` ON `push_subscriptions` (`user_id`);--> statement-breakpoint
CREATE INDEX `receivers_tenant_id_idx` ON `receivers` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `receivers_tenant_id_search_name_idx` ON `receivers` (`tenant_id`,`search_name`);--> statement-breakpoint
CREATE INDEX `recurring_transactions_tenant_id_idx` ON `recurring_transactions` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `transaction_history_transaction_id_idx` ON `transaction_history` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `transaction_linkers_tenant_id_idx` ON `transaction_linkers` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `transaction_linkers_tenant_id_search_name_idx` ON `transaction_linkers` (`tenant_id`,`search_name`);--> statement-breakpoint
CREATE INDEX `transaction_splits_transaction_id_idx` ON `transaction_splits` (`transaction_id`);--> statement-breakpoint
CREATE INDEX `transaction_splits_tenant_id_idx` ON `transaction_splits` (`tenant_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `transaction_splits_member_key` ON `transaction_splits` (`transaction_id`,`user_id`) WHERE status = 'ACTIVE';--> statement-breakpoint
CREATE INDEX `transactions_account_dt_idx` ON `transactions` (`tenant_id`,`linked_account_id`,`transaction_dt`,`id`);--> statement-breakpoint
CREATE INDEX `transactions_tenant_id_idx` ON `transactions` (`tenant_id`);--> statement-breakpoint
CREATE INDEX `transactions_tenant_id_dt_idx` ON `transactions` (`tenant_id`,`transaction_dt`);--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_recurring_materialized_key` ON `transactions` (`tenant_id`,`recurring_id`,`transaction_dt`) WHERE status = 'ACTIVE' and recurring_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_external_id_key` ON `transactions` (`tenant_id`,`linked_account_id`,`external_id`) WHERE status = 'ACTIVE' and external_id is not null;--> statement-breakpoint
CREATE INDEX `transactions_import_batch_idx` ON `transactions` (`tenant_id`,`import_batch_id`) WHERE import_batch_id is not null;--> statement-breakpoint
CREATE INDEX `transactions_statement_id_idx` ON `transactions` (`tenant_id`,`statement_id`) WHERE status = 'ACTIVE' and statement_id is not null;--> statement-breakpoint
CREATE INDEX `transactions_payment_statement_id_idx` ON `transactions` (`tenant_id`,`payment_statement_id`) WHERE status = 'ACTIVE' and payment_statement_id is not null;--> statement-breakpoint
CREATE INDEX `transactions_installment_group_idx` ON `transactions` (`tenant_id`,`installment_group_id`) WHERE installment_group_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_key` ON `users` (lower("email"));--> statement-breakpoint
CREATE INDEX `users_tenant_id_idx` ON `users` (`tenant_id`);