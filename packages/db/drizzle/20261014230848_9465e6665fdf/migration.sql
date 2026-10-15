CREATE TABLE "receivers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "receivers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" integer NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_by" integer,
	"created_dt" timestamp with time zone DEFAULT now() NOT NULL,
	"update_by" integer,
	"update_dt" timestamp with time zone DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_transactions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "recurring_transactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" integer NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_by" integer,
	"created_dt" timestamp with time zone DEFAULT now() NOT NULL,
	"update_by" integer,
	"update_dt" timestamp with time zone DEFAULT now() NOT NULL,
	"receiver_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"linked_account_id" integer NOT NULL,
	"amount" numeric(16,2) NOT NULL,
	"frequency" text NOT NULL,
	"frequency_day" integer,
	"frequency_month" integer
);
--> statement-breakpoint
CREATE TABLE "transaction_history" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "transaction_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" integer NOT NULL,
	"transaction_id" integer NOT NULL,
	"action" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"created_by" integer,
	"created_dt" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_linkers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "transaction_linkers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" integer NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_by" integer,
	"created_dt" timestamp with time zone DEFAULT now() NOT NULL,
	"update_by" integer,
	"update_dt" timestamp with time zone DEFAULT now() NOT NULL,
	"description" text NOT NULL,
	"category_id" integer NOT NULL,
	"receiver_id" integer
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "transactions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" integer NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_by" integer,
	"created_dt" timestamp with time zone DEFAULT now() NOT NULL,
	"update_by" integer,
	"update_dt" timestamp with time zone DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"note" text,
	"invoice" varchar(255) NOT NULL,
	"amount" numeric(16,2) NOT NULL,
	"transaction_dt" date NOT NULL,
	"balance_on_dt" numeric(16,2) NOT NULL,
	"linked_account_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"receiver_id" integer,
	"recurring_id" integer,
	"type" text NOT NULL,
	"review_status" text DEFAULT 'Verify' NOT NULL,
	"status_note" varchar(500)
);
--> statement-breakpoint
CREATE INDEX "receivers_tenant_id_idx" ON "receivers" ("tenant_id");--> statement-breakpoint
CREATE INDEX "recurring_transactions_tenant_id_idx" ON "recurring_transactions" ("tenant_id");--> statement-breakpoint
CREATE INDEX "transaction_history_transaction_id_idx" ON "transaction_history" ("transaction_id");--> statement-breakpoint
CREATE INDEX "transaction_linkers_tenant_id_idx" ON "transaction_linkers" ("tenant_id");--> statement-breakpoint
CREATE INDEX "transactions_tenant_id_idx" ON "transactions" ("tenant_id");--> statement-breakpoint
CREATE INDEX "transactions_tenant_id_dt_idx" ON "transactions" ("tenant_id","transaction_dt");--> statement-breakpoint
ALTER TABLE "receivers" ADD CONSTRAINT "receivers_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_receiver_id_receivers_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "receivers"("id");--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id");--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_linked_account_id_accounts_id_fkey" FOREIGN KEY ("linked_account_id") REFERENCES "accounts"("id");--> statement-breakpoint
ALTER TABLE "transaction_history" ADD CONSTRAINT "transaction_history_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");--> statement-breakpoint
ALTER TABLE "transaction_history" ADD CONSTRAINT "transaction_history_transaction_id_transactions_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "transactions"("id");--> statement-breakpoint
ALTER TABLE "transaction_linkers" ADD CONSTRAINT "transaction_linkers_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");--> statement-breakpoint
ALTER TABLE "transaction_linkers" ADD CONSTRAINT "transaction_linkers_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id");--> statement-breakpoint
ALTER TABLE "transaction_linkers" ADD CONSTRAINT "transaction_linkers_receiver_id_receivers_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "receivers"("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_linked_account_id_accounts_id_fkey" FOREIGN KEY ("linked_account_id") REFERENCES "accounts"("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_receiver_id_receivers_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "receivers"("id");--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurring_id_recurring_transactions_id_fkey" FOREIGN KEY ("recurring_id") REFERENCES "recurring_transactions"("id");