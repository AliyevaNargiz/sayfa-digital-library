CREATE TABLE `categories` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`normalized` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `categories_normalized_unique` ON `categories` (`normalized`);