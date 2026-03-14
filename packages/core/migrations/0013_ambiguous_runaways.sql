CREATE TABLE `funnel_experiment` (
	`id` char(30) NOT NULL,
	`workspace_id` char(30) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`archived_at` timestamp(3),
	`funnel_id` char(30) NOT NULL,
	`name` varchar(255) NOT NULL,
	`started_at` timestamp(3),
	`ended_at` timestamp(3),
	CONSTRAINT `funnel_experiment_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`)
);
--> statement-breakpoint
CREATE TABLE `funnel_experiment_variant` (
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`archived_at` timestamp(3),
	`workspace_id` char(30) NOT NULL,
	`funnel_experiment_id` char(30) NOT NULL,
	`funnel_variant_id` char(30) NOT NULL,
	`weight` int NOT NULL,
	CONSTRAINT `pk` PRIMARY KEY(`workspace_id`,`funnel_experiment_id`,`funnel_variant_id`)
);
--> statement-breakpoint
CREATE TABLE `funnel_variant_draft` (
	`id` char(30) NOT NULL,
	`workspace_id` char(30) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`archived_at` timestamp(3),
	`funnel_id` char(30) NOT NULL,
	`funnel_variant_id` char(30) NOT NULL,
	`pages` json NOT NULL,
	`rules` json NOT NULL,
	`variables` json NOT NULL,
	`theme` json NOT NULL,
	CONSTRAINT `funnel_variant_draft_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `funnel_variant` UNIQUE(`workspace_id`,`funnel_id`,`funnel_variant_id`)
);
--> statement-breakpoint
CREATE TABLE `funnel_variant` (
	`id` char(30) NOT NULL,
	`workspace_id` char(30) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`archived_at` timestamp(3),
	`funnel_id` char(30) NOT NULL,
	`title` varchar(255) NOT NULL,
	`has_draft` boolean NOT NULL DEFAULT false,
	`published_version` int,
	CONSTRAINT `funnel_variant_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`)
);
--> statement-breakpoint
CREATE TABLE `funnel_variant_version` (
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`archived_at` timestamp(3),
	`workspace_id` char(30) NOT NULL,
	`funnel_id` char(30) NOT NULL,
	`funnel_variant_id` char(30) NOT NULL,
	`number` int NOT NULL,
	`pages` json NOT NULL,
	`rules` json NOT NULL,
	`variables` json NOT NULL,
	`theme` json NOT NULL,
	CONSTRAINT `pk` PRIMARY KEY(`workspace_id`,`funnel_id`,`funnel_variant_id`,`number`)
);
--> statement-breakpoint
ALTER TABLE `question` DROP INDEX `funnel_block`;--> statement-breakpoint
ALTER TABLE `funnel` MODIFY COLUMN `current_version` int;--> statement-breakpoint
ALTER TABLE `funnel` ADD `main_variant_id` char(30);--> statement-breakpoint
ALTER TABLE `question` ADD `funnel_variant_id` char(30) NOT NULL;--> statement-breakpoint
ALTER TABLE `submission` ADD `funnel_variant_id` char(30);--> statement-breakpoint
ALTER TABLE `question` ADD CONSTRAINT `funnel_variant_block` UNIQUE(`workspace_id`,`funnel_id`,`funnel_variant_id`,`block_id`);--> statement-breakpoint
CREATE INDEX `funnel` ON `funnel_experiment` (`workspace_id`,`funnel_id`);--> statement-breakpoint
CREATE INDEX `experiment` ON `funnel_experiment_variant` (`workspace_id`,`funnel_experiment_id`);--> statement-breakpoint
CREATE INDEX `funnel` ON `funnel_variant` (`workspace_id`,`funnel_id`);