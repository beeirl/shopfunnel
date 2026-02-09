CREATE TABLE `billing` (
	`id` char(30) NOT NULL,
	`workspace_id` char(30) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`archived_at` timestamp(3),
	`stripe_customer_id` varchar(255),
	`stripe_subscription_id` varchar(255),
	`exempted` boolean,
	`plan` enum('standard5K','standard25K','standard50K','standard100K','standard250K','standard500K','standard1M','standard5M'),
	`managed` boolean,
	`interval` enum('month','year'),
	`trial_started_at` timestamp(3),
	`trial_ends_at` timestamp(3),
	CONSTRAINT `billing_workspace_id_id_pk` PRIMARY KEY(`workspace_id`,`id`),
	CONSTRAINT `stripe_customer_id` UNIQUE(`stripe_customer_id`),
	CONSTRAINT `stripe_subscription_id` UNIQUE(`stripe_subscription_id`)
);
--> statement-breakpoint
ALTER TABLE `auth` MODIFY COLUMN `provider` enum('email','google') NOT NULL;--> statement-breakpoint
ALTER TABLE `workspace` ADD `flags` json NOT NULL;