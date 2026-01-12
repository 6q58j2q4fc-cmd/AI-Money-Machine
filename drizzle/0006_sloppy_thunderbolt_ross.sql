CREATE TABLE `affiliate_cookie_tracking` (
	`id` int AUTO_INCREMENT NOT NULL,
	`visitorId` varchar(64) NOT NULL,
	`ipHash` varchar(64),
	`userAgent` text,
	`articleId` int,
	`affiliateLinkId` int NOT NULL,
	`clickedAt` timestamp NOT NULL DEFAULT (now()),
	`cookieExpiry` timestamp,
	`cookieDurationDays` int DEFAULT 30,
	`hasConverted` boolean NOT NULL DEFAULT false,
	`convertedAt` timestamp,
	`conversionValue` decimal(10,2),
	`retargetingAttempts` int NOT NULL DEFAULT 0,
	`lastRetargetedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `affiliate_cookie_tracking_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bot_training_data` (
	`id` int AUTO_INCREMENT NOT NULL,
	`category` enum('ad_copy','headline_formulas','cta_strategies','affiliate_tactics','seo_techniques','viral_triggers','conversion_optimization','email_marketing') NOT NULL,
	`title` varchar(500) NOT NULL,
	`content` text NOT NULL,
	`source` varchar(255),
	`sourceUrl` text,
	`effectivenessScore` int NOT NULL DEFAULT 50,
	`timesApplied` int NOT NULL DEFAULT 0,
	`successRate` decimal(5,2) DEFAULT '0.00',
	`isVerified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bot_training_data_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `shortened_urls` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`articleId` int,
	`affiliateLinkId` int,
	`originalUrl` text NOT NULL,
	`shortUrl` text NOT NULL,
	`provider` varchar(50) NOT NULL,
	`clicks` int NOT NULL DEFAULT 0,
	`earnings` decimal(10,4) DEFAULT '0.0000',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `shortened_urls_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tracking_pixels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pixelType` enum('facebook','google','tiktok','custom') NOT NULL,
	`pixelId` varchar(255) NOT NULL,
	`pixelCode` text,
	`isEnabled` boolean NOT NULL DEFAULT true,
	`totalFires` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `tracking_pixels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `url_shortener_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`provider` enum('shorte_st','adfly','linkvertise','shrinkme','ouo_io','none') NOT NULL DEFAULT 'none',
	`apiKey` varchar(255),
	`isEnabled` boolean NOT NULL DEFAULT false,
	`totalClicks` int NOT NULL DEFAULT 0,
	`totalEarnings` decimal(10,4) DEFAULT '0.0000',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `url_shortener_settings_id` PRIMARY KEY(`id`),
	CONSTRAINT `url_shortener_settings_userId_unique` UNIQUE(`userId`)
);
