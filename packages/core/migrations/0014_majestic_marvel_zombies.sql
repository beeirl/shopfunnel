CREATE TABLE `campaign_funnel` (
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
	`archived_at` timestamp(3),
	`workspace_id` char(30) NOT NULL,
	`campaign_id` char(30) NOT NULL,
	`funnel_id` char(30) NOT NULL,
	CONSTRAINT `campaign_funnel_workspace_id_campaign_id_funnel_id_pk` PRIMARY KEY(`workspace_id`,`campaign_id`,`funnel_id`)
);
--> statement-breakpoint
CREATE INDEX `funnel` ON `campaign_funnel` (`workspace_id`,`funnel_id`);