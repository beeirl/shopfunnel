ALTER TABLE `billing` ADD `period_started_at` timestamp(3);--> statement-breakpoint
ALTER TABLE `billing` ADD `period_ends_at` timestamp(3);--> statement-breakpoint
ALTER TABLE `billing` ADD `pending_plan` enum('standard5K','standard25K','standard50K','standard100K','standard250K','standard500K','standard1M','standard5M');--> statement-breakpoint
ALTER TABLE `billing` DROP COLUMN `last_subscribed_at`;