CREATE TABLE "categories" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "categories_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" integer NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_by" integer,
	"created_dt" timestamp with time zone DEFAULT now() NOT NULL,
	"update_by" integer,
	"update_dt" timestamp with time zone DEFAULT now() NOT NULL,
	"name" varchar(255) NOT NULL,
	"color" varchar(9) NOT NULL
);
--> statement-breakpoint
CREATE INDEX "categories_tenant_id_idx" ON "categories" ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "categories_tenant_id_name_active_key" ON "categories" ("tenant_id","name") WHERE status = 'ACTIVE';--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");