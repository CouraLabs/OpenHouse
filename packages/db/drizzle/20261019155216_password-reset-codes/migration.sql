CREATE TABLE "password_reset_codes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "password_reset_codes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"code_hash" text NOT NULL,
	"kind" text NOT NULL,
	"issued_by" integer,
	"expires_at" timestamp with time zone,
	"used_at" timestamp with time zone,
	"notice_seen_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "password_reset_codes_code_hash_key" ON "password_reset_codes" ("code_hash");--> statement-breakpoint
CREATE INDEX "password_reset_codes_user_id_idx" ON "password_reset_codes" ("user_id");--> statement-breakpoint
ALTER TABLE "password_reset_codes" ADD CONSTRAINT "password_reset_codes_user_id_users_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id");