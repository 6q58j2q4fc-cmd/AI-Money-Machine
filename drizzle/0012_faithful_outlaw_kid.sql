CREATE TABLE `system_hot_wallet` (
	`id` int AUTO_INCREMENT NOT NULL,
	`address` varchar(42) NOT NULL,
	`encryptedPrivateKey` text NOT NULL,
	`encryptionIv` varchar(32) NOT NULL,
	`encryptionAuthTag` varchar(32) NOT NULL,
	`isActive` boolean NOT NULL DEFAULT true,
	`balanceEthereum` varchar(50) DEFAULT '0',
	`balancePolygon` varchar(50) DEFAULT '0',
	`balanceArbitrum` varchar(50) DEFAULT '0',
	`balanceOptimism` varchar(50) DEFAULT '0',
	`balanceBase` varchar(50) DEFAULT '0',
	`lastBalanceCheck` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `system_hot_wallet_id` PRIMARY KEY(`id`),
	CONSTRAINT `system_hot_wallet_address_unique` UNIQUE(`address`)
);
