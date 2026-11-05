CREATE TABLE `identities` (
	`provider` text NOT NULL,
	`subject` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`provider`, `subject`)
);
--> statement-breakpoint
CREATE INDEX `identities_user_idx` ON `identities` (`user_id`);--> statement-breakpoint
CREATE TABLE `upload_reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`bytes` integer NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `upload_reservations_owner_idx` ON `upload_reservations` (`owner_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text,
	`normalized_email` text,
	`display_name` text NOT NULL,
	`created_at` text NOT NULL,
	`last_seen` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_normalized_email_unique` ON `users` (`normalized_email`);--> statement-breakpoint
DROP INDEX `categories_normalized_unique`;--> statement-breakpoint
ALTER TABLE `categories` ADD `owner_id` text DEFAULT '__legacy__' NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `categories_owner_normalized_unique` ON `categories` (`owner_id`,`normalized`);--> statement-breakpoint
DROP INDEX `digital_files_hash_unique`;--> statement-breakpoint
ALTER TABLE `digital_files` ADD `owner_id` text DEFAULT '__legacy__' NOT NULL;--> statement-breakpoint
ALTER TABLE `digital_files` ADD `cover_size` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `digital_files_owner_hash_unique` ON `digital_files` (`owner_id`,`hash`);--> statement-breakpoint
CREATE TABLE `__new_books` (
	`id` text NOT NULL,
	`owner_id` text DEFAULT '__legacy__' NOT NULL,
	`data` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`owner_id`, `id`)
);
--> statement-breakpoint
INSERT INTO `__new_books`("id", "data", "created_at") SELECT "id", "data", "created_at" FROM `books`;--> statement-breakpoint
DROP TABLE `books`;--> statement-breakpoint
ALTER TABLE `__new_books` RENAME TO `books`;--> statement-breakpoint
