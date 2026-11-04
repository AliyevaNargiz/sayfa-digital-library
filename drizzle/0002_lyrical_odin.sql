CREATE TABLE `digital_files` (
	`id` text PRIMARY KEY NOT NULL,
	`book_id` text NOT NULL,
	`object_key` text NOT NULL,
	`file_name` text NOT NULL,
	`mime` text NOT NULL,
	`size` integer NOT NULL,
	`hash` text NOT NULL,
	`uploaded_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `digital_files_hash_unique` ON `digital_files` (`hash`);