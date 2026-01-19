const hre = require("hardhat");

async function main() {
  console.log("Deploying MoneyMachineNFT contract...");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Check balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "MATIC");

  if (balance === 0n) {
    console.error("ERROR: Account has no MATIC. Get testnet MATIC from https://faucet.polygon.technology/");
    process.exit(1);
  }

  // Deploy the contract
  const MoneyMachineNFT = await hre.ethers.getContractFactory("MoneyMachineNFT");
  const nft = await MoneyMachineNFT.deploy();

  await nft.waitForDeployment();

  const contractAddress = await nft.getAddress();
  console.log("MoneyMachineNFT deployed to:", contractAddress);

  // Log deployment info
  console.log("\n=== Deployment Summary ===");
  console.log("Network:", hre.network.name);
  console.log("Contract Address:", contractAddress);
  console.log("Deployer:", deployer.address);
  console.log("Block Explorer:", `https://amoy.polygonscan.com/address/${contractAddress}`);

  // Wait for confirmations before verification
  console.log("\nWaiting for block confirmations...");
  await new Promise(resolve => setTimeout(resolve, 30000)); // Wait 30 seconds

  // Verify on PolygonScan (if API key is set)
  if (process.env.POLYGONSCAN_API_KEY) {
    console.log("\nVerifying contract on PolygonScan...");
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      });
      console.log("Contract verified successfully!");
    } catch (error) {
      console.log("Verification failed:", error.message);
    }
  } else {
    console.log("\nSkipping verification (POLYGONSCAN_API_KEY not set)");
    console.log("To verify manually, run:");
    console.log(`npx hardhat verify --network amoy ${contractAddress}`);
  }

  // Save deployment info to file
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    contractAddress: contractAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    blockExplorer: `https://amoy.polygonscan.com/address/${contractAddress}`,
  };

  fs.writeFileSync(
    "./deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to deployment.json");

  return contractAddress;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
