ALTER TABLE `campaign` RENAME COLUMN `slug` TO `short_id`;--> statement-breakpoint
ALTER TABLE `campaign` DROP INDEX `slug`;--> statement-breakpoint
ALTER TABLE `campaign` ADD `domain_id` char(30);--> statement-breakpoint
ALTER TABLE `campaign` ADD CONSTRAINT `short_id` UNIQUE(`short_id`);