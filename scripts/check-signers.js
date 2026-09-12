const hre = require("hardhat");

async function main() {
  const signers = await hre.ethers.getSigners();
  console.log("Hardhat Node Signers:");
  for (let i = 0; i < 6; i++) {
    console.log(`Index ${i}: Address = ${signers[i].address}`);
  }
}

main().catch(console.error);
