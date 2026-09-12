const hre = require("hardhat");

async function main() {
  const [admin, registrar, revenue, citizen1, citizen2] = await hre.ethers.getSigners();

  console.log("----------------------------------------------------");
  console.log("Deploying LandRegistry contract with Hardhat Signers:");
  console.log("Admin (0):           ", admin.address);
  console.log("Registrar (1):       ", registrar.address);
  console.log("Revenue Dept (2):    ", revenue.address);
  console.log("Citizen 1 (Alice 3): ", citizen1.address);
  console.log("Citizen 2 (Bob 4):   ", citizen2.address);
  console.log("----------------------------------------------------");

  const LandRegistry = await hre.ethers.getContractFactory("LandRegistry");
  const landRegistry = await LandRegistry.deploy(
    admin.address,
    registrar.address,
    revenue.address
  );

  await landRegistry.waitForDeployment();
  const contractAddress = await landRegistry.getAddress();

  console.log(`LandRegistry successfully deployed to: ${contractAddress}`);

  // Seed sample genesis data for instant testing
  console.log("Seeding sample properties and verifications...");
  
  // Alice registers Property 1
  const tx1 = await landRegistry.connect(citizen1).registerProperty(
    "SURVEY-KA-2024-8891",
    "Sector 4, Whitefield, Bangalore, Karnataka - 560066",
    2400,
    15000000,
    "0x5a1f2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a"
  );
  await tx1.wait();

  // Registrar & Revenue verify Property 1
  await (await landRegistry.connect(registrar).verifyPropertyByRegistrar(1, true)).wait();
  await (await landRegistry.connect(revenue).verifyPropertyByRevenue(1, true)).wait();
  console.log("Sample Property #1 registered and verified!");

  // Alice registers Property 2 (Pending verification)
  const tx2 = await landRegistry.connect(citizen1).registerProperty(
    "SURVEY-MH-2024-1042",
    "Plot 82, Bandra Kurla Complex, Mumbai, Maharashtra - 400051",
    4500,
    85000000,
    "0x7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c"
  );
  await tx2.wait();
  console.log("Sample Property #2 registered (Pending status)!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
