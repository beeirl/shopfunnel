DROP INDEX `campaign` ON `experiment`;--> statement-breakpoint
DROP INDEX `experiment` ON `experiment_variant`;--> statement-breakpoint
DROP INDEX `experiment_funnel` ON `experiment_variant`;--> statement-breakpoint
ALTER TABLE `experiment` MODIFY COLUMN `control_variant_id` char(30) NOT NULL;--> statement-breakpoint
ALTER TABLE `experiment_variant` ADD CONSTRAINT `experiment_funnel` UNIQUE(`workspace_id`,`experiment_id`,`funnel_id`);--> statement-breakpoint
CREATE INDEX `workspace_archived_created` ON `experiment` (`workspace_id`,`archived_at`,`created_at`);--> statement-breakpoint
CREATE INDEX `active` ON `experiment` (`workspace_id`,`campaign_id`,`archived_at`,`ended_at`,`started_at`,`created_at`);