CREATE TABLE `ohlcv_cache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`timeframe` varchar(10) NOT NULL,
	`openTime` bigint NOT NULL,
	`open` double NOT NULL,
	`high` double NOT NULL,
	`low` double NOT NULL,
	`close` double NOT NULL,
	`volume` double NOT NULL,
	`source` enum('alpaca','ccxt','mock') NOT NULL DEFAULT 'alpaca',
	`fetchedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ohlcv_cache_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ohlcv_fetch_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`symbol` varchar(20) NOT NULL,
	`timeframe` varchar(10) NOT NULL,
	`source` enum('alpaca','ccxt','mock') NOT NULL,
	`candlesFetched` int NOT NULL DEFAULT 0,
	`fromTime` bigint,
	`toTime` bigint,
	`durationMs` int,
	`error` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ohlcv_fetch_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `symbol_timeframe_idx` ON `ohlcv_cache` (`symbol`,`timeframe`,`openTime`);