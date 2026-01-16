CREATE TABLE `stripe_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`buyerEmail` varchar(320) NOT NULL,
	`buyerName` varchar(200),
	`nftAssetId` int NOT NULL,
	`nftName` varchar(500),
	`amountUsd` decimal(10,2) NOT NULL,
	`amountEth` decimal(18,8),
	`stripeSessionId` varchar(200) NOT NULL,
	`stripePaymentIntentId` varchar(200),
	`stripeCustomerId` varchar(200),
	`status` enum('pending','completed','failed','refunded','cancelled') NOT NULL DEFAULT 'pending',
	`receiptUrl` text,
	`paidAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `stripe_payments_id` PRIMARY KEY(`id`)
);
