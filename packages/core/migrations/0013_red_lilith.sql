CREATE TABLE `campaign` (
	`id` char(30) NOT NULL,
	`workspace_id` char(30) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`archived_at` timestamp(3),
	`slug` varchar(8) NOT NULL,
	`name` varchar(255) NOT NULL,
	`default_funnel_id` char(30),
	CONSTRAINT `campaign_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `slug` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `experiment` (
	`id` char(30) NOT NULL,
	`workspace_id` char(30) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`archived_at` timestamp(3),
	`campaign_id` char(30) NOT NULL,
	`name` varchar(255) NOT NULL,
	`started_at` timestamp(3),
	`ended_at` timestamp(3),
	`control_variant_id` char(30),
	`winner_variant_id` char(30),
	CONSTRAINT `experiment_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`)
);
--> statement-breakpoint
CREATE TABLE `experiment_variant` (
	`id` char(30) NOT NULL,
	`workspace_id` char(30) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`archived_at` timestamp(3),
	`experiment_id` char(30) NOT NULL,
	`funnel_id` char(30) NOT NULL,
	`weight` int NOT NULL DEFAULT 0,
	CONSTRAINT `experiment_variant_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`)
);
--> statement-breakpoint
CREATE INDEX `campaign` ON `experiment` (`workspace_id`,`campaign_id`);--> statement-breakpoint
CREATE INDEX `experiment` ON `experiment_variant` (`workspace_id`,`experiment_id`);--> statement-breakpoint
CREATE INDEX `experiment_funnel` ON `experiment_variant` (`workspace_id`,`experiment_id`,`funnel_id`);