CREATE TABLE `external_order` (
	`id` char(30) NOT NULL,
	`workspace_id` char(30) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`archived_at` timestamp(3),
	`session_id` varchar(26) NOT NULL,
	`integration_id` varchar(26) NOT NULL,
	`external_id` varchar(255) NOT NULL,
	`amount` bigint NOT NULL,
	`currency` varchar(3) NOT NULL,
	CONSTRAINT `external_order_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `unique_external` UNIQUE(`workspace_id`,`integration_id`,`external_id`)
);
--> statement-breakpoint
CREATE TABLE `integration` (
	`id` char(30) NOT NULL,
	`workspace_id` char(30) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`archived_at` timestamp(3),
	`provider` enum('shopify') NOT NULL,
	`external_id` varchar(255) NOT NULL,
	`title` varchar(255),
	`credentials` json NOT NULL,
	`metadata` json,
	CONSTRAINT `integration_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `unique_external` UNIQUE(`workspace_id`,`provider`,`external_id`)
);
