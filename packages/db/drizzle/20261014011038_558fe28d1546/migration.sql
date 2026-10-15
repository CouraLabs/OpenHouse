CREATE TABLE "limits" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "limits_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"tenant_id" integer NOT NULL,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"created_by" integer,
	"created_dt" timestamp with time zone DEFAULT now() NOT NULL,
	"update_by" integer,
	"update_dt" timestamp with time zone DEFAULT now() NOT NULL,
	"category_id" integer NOT NULL,
	"amount" numeric(16,2) NOT NULL,
	"type" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX "limits_tenant_id_idx" ON "limits" ("tenant_id");--> statement-breakpoint
ALTER TABLE "limits" ADD CONSTRAINT "limits_tenant_id_tenants_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id");--> statement-breakpoint
ALTER TABLE "limits" ADD CONSTRAINT "limits_category_id_categories_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id");