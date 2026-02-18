ALTER TABLE `integration` MODIFY COLUMN `provider` enum('shopify','meta_pixel') NOT NULL;--> statement-breakpoint
ALTER TABLE `domain` ADD `settings` json;--> statement-breakpoint
ALTER TABLE `funnel` ADD `domain_id` char(30);