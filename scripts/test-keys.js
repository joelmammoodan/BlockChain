const hre = require("hardhat");

async function main() {
  const nodeAccounts = [
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // 0
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d", // 1
    "0x5de4111afa1a4b9345e627d09a30026e100f983155799981e8c955a6d5952d9c", // 2 ??
    "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6", // 3
    "0x47e179ec340048711f9f31402d26f61842f1b5d84240747728236795b3214824"  // 4
  ];

  for (let i = 0; i < nodeAccounts.length; i++) {
    const w = new hre.ethers.Wallet(nodeAccounts[i]);
    console.log(`Key ${i} derives address: ${w.address}`);
  }
}

main().catch(console.error);
