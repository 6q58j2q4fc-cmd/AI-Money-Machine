CREATE TABLE `audit_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`eventType` enum('article_created','article_published','article_updated','article_deleted','distribution_queued','distribution_published','distribution_failed','affiliate_link_added','affiliate_link_clicked','affiliate_conversion','automation_cycle_started','automation_cycle_completed','automation_cycle_failed','topic_discovered','topic_saved','bot_decision','bot_learning','bot_optimization','seo_indexed','seo_ping_sent','user_action','system_event') NOT NULL,
	`articleId` int,
	`affiliateLinkId` int,
	`distributionId` int,
	`topicId` int,
	`action` varchar(255) NOT NULL,
	`description` text,
	`metadata` json,
	`wasSuccessful` boolean NOT NULL DEFAULT true,
	`errorMessage` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `audit_log_id` PRIMARY KEY(`id`)
);
