ALTER TABLE `funnel_experiment_variant` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `funnel_variant_version` DROP PRIMARY KEY;--> statement-breakpoint
ALTER TABLE `funnel_experiment_variant` ADD PRIMARY KEY(`workspace_id`,`funnel_experiment_id`,`funnel_variant_id`);--> statement-breakpoint
ALTER TABLE `funnel_variant_version` ADD PRIMARY KEY(`workspace_id`,`funnel_id`,`funnel_variant_id`,`number`);--> statement-breakpoint
ALTER TABLE `funnel_experiment` ADD `winner_variant_id` char(30);