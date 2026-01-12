CREATE TABLE `article_distribution` (
	`id` int AUTO_INCREMENT NOT NULL,
	`articleId` int NOT NULL,
	`userId` int NOT NULL,
	`platform` enum('medium','devto','linkedin','hashnode','substack','reddit','hackernews','twitter','facebook','pinterest','press_release','article_directory','rss_syndication','other') NOT NULL,
	`platformName` varchar(100),
	`externalUrl` text,
	`externalId` varchar(255),
	`status` enum('pending','submitted','published','failed','removed') NOT NULL DEFAULT 'pending',
	`views` int NOT NULL DEFAULT 0,
	`clicks` int NOT NULL DEFAULT 0,
	`referralTraffic` int NOT NULL DEFAULT 0,
	`errorMessage` text,
	`retryCount` int NOT NULL DEFAULT 0,
	`submittedAt` timestamp,
	`publishedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `article_distribution_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bot_learning` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`sessionId` varchar(64) NOT NULL,
	`learningCategory` enum('topic_selection','headline_optimization','cta_placement','affiliate_selection','timing_optimization','content_structure','keyword_targeting','distribution_strategy') NOT NULL,
	`decision` text NOT NULL,
	`reasoning` text,
	`outcome` enum('success','failure','pending','neutral') NOT NULL DEFAULT 'pending',
	`outcomeMetrics` json,
	`confidenceScore` int NOT NULL DEFAULT 50,
	`wasCorrect` boolean,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bot_learning_id` PRIMARY KEY(`id`)
);
