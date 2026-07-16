CREATE TABLE `risk_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`eventType` varchar(40) NOT NULL,
	`severity` enum('info','warning','critical') NOT NULL,
	`message` text NOT NULL,
	`portfolioValue` double NOT NULL,
	`dailyPnl` double NOT NULL,
	`drawdownPct` double NOT NULL,
	`triggeredAt` bigint NOT NULL,
	`acknowledgedAt` bigint,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `risk_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `risk_state` (
	`id` int AUTO_INCREMENT NOT NULL,
	`portfolioValue` double NOT NULL DEFAULT 100000,
	`dayStartValue` double NOT NULL DEFAULT 100000,
	`peakValue` double NOT NULL DEFAULT 100000,
	`realisedDailyPnl` double NOT NULL DEFAULT 0,
	`lastDailyResetAt` bigint NOT NULL DEFAULT 0,
	`killSwitchActive` boolean NOT NULL DEFAULT false,
	`killSwitchReason` varchar(40),
	`killSwitchActivatedAt` bigint,
	`configJson` text NOT NULL DEFAULT ('{}'),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `risk_state_id` PRIMARY KEY(`id`)
);
