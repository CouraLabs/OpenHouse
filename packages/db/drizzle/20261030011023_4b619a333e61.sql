ALTER TABLE `users` ADD `email_verified_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `email_verification_hash` text;--> statement-breakpoint
ALTER TABLE `users` ADD `email_verification_expires_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `email_verification_sent_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `email_verification_window_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `email_verification_sends` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_verification_hash_key` ON `users` (`email_verification_hash`);--> statement-breakpoint
UPDATE `users` SET `email_verified_at` = `created_at` WHERE `email_verified_at` IS NULL;