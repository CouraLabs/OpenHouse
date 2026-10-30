CREATE TABLE `tenant_usage` (
	`tenant_id` integer NOT NULL,
	`kind` text NOT NULL,
	`period` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	CONSTRAINT `tenant_usage_pk` PRIMARY KEY(`tenant_id`, `kind`, `period`),
	CONSTRAINT `fk_tenant_usage_tenant_id_tenants_id_fk` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`)
);
--> statement-breakpoint
ALTER TABLE `tenants` ADD `tier` integer DEFAULT 0 NOT NULL;