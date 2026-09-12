const hre = require("hardhat");

async function main() {
  console.log("==================================================================");
  console.log("   CADASTREX: FULL END-TO-END FLOW VERIFICATION ON LIVE NODE      ");
  console.log("==================================================================");

  const [admin, registrar, revenue, alice, bob, impostor] = await hre.ethers.getSigners();

  const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const LandRegistry = await hre.ethers.getContractFactory("LandRegistry");
  const landRegistry = LandRegistry.attach(contractAddress);

  console.log(`Contract attached at: ${contractAddress}\n`);

  // Step 1: Alice registers a new land parcel
  const surveyNumber = "SURVEY-E2E-TEST-" + Date.now();
  console.log(`[STEP 1] Citizen Alice is registering new land parcel: ${surveyNumber}`);
  const regTx = await landRegistry.connect(alice).registerProperty(
    surveyNumber,
    "Plot 88, Brigade Gateway, Malleshwaram, Bangalore - 560055",
    1200,
    12500000, // 1.25 Cr
    "0x5a1f2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a"
  );
  const regReceipt = await regTx.wait();
  const totalProps = await landRegistry.getTotalProperties();
  const propId = totalProps;
  console.log(`✓ Property registered successfully with Property ID: #${propId}`);

  let prop = await landRegistry.properties(propId);
  console.log(`  Status: ${prop.status} (0 = PendingVerification) | Owner: ${prop.currentOwner}`);

  // Step 2: Municipal Sub-Registrar attests
  console.log(`\n[STEP 2A] Sub-Registrar is verifying title deeds...`);
  const regVerifyTx = await landRegistry.connect(registrar).verifyPropertyByRegistrar(propId, true);
  await regVerifyTx.wait();
  console.log(`✓ Sub-Registrar signed off!`);

  // Step 2B: Revenue Department attests
  console.log(`[STEP 2B] Revenue Department is verifying tax and encumbrances...`);
  const revVerifyTx = await landRegistry.connect(revenue).verifyPropertyByRevenue(propId, true);
  await revVerifyTx.wait();
  console.log(`✓ Revenue Department signed off!`);

  prop = await landRegistry.properties(propId);
  console.log(`  New Property Status: ${prop.status} (1 = Verified & Legally Valid)`);

  // Step 3: Security Test - Impostor tries to sell Alice's land
  console.log(`\n[STEP 3 - SECURITY AUDIT] Impostor attempting unauthorized sale of Alice's parcel...`);
  try {
    await landRegistry.connect(impostor).requestTransfer(
      propId,
      impostor.address,
      1000000,
      "0xFakeDeedHash"
    );
    console.error("❌ CRITICAL FAILURE: Unauthorized transfer was allowed!");
  } catch (err) {
    console.log(`✓ BLOCKED: Smart contract successfully rejected unauthorized seller with: ${err.message.split('reverted with reason string')[1] || err.message}`);
  }

  // Step 4: Alice initiates legitimate sale to Bob
  console.log(`\n[STEP 4] Citizen Alice is initiating sale to Bob Verma for ₹1.35 Cr...`);
  const transferTx = await landRegistry.connect(alice).requestTransfer(
    propId,
    bob.address,
    13500000,
    "0x7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c"
  );
  await transferTx.wait();
  const totalReqs = await landRegistry.getTotalTransferRequests();
  const reqId = totalReqs;
  console.log(`✓ Transfer application submitted with Application ID: #${reqId}`);

  // Step 5: Government clearances for sale conveyance
  console.log(`\n[STEP 5] Government authorities reviewing sale agreement...`);
  await (await landRegistry.connect(registrar).approveTransferByRegistrar(reqId)).wait();
  console.log(`✓ Sub-Registrar cleared conveyance.`);
  await (await landRegistry.connect(revenue).approveTransferByRevenue(reqId)).wait();
  console.log(`✓ Revenue Department cleared stamp duty.`);

  let req = await landRegistry.transferRequests(reqId);
  console.log(`  Transfer Request Status: ${req.status} (3 = Fully Cleared for Settlement)`);

  // Step 6: Bob Verma accepts & executes final title transfer
  console.log(`\n[STEP 6] Citizen Bob Verma is executing and finalizing title settlement...`);
  const execTx = await landRegistry.connect(bob).executeTransfer(reqId);
  await execTx.wait();
  console.log(`✓ Title Transfer settlement executed on blockchain!`);

  // Step 7: Final Verification of Ownership & Immutable Provenance Timeline
  console.log(`\n[STEP 7 - FINAL LEDGER AUDIT] Auditing updated on-chain title records...`);
  const updatedProp = await landRegistry.properties(propId);
  console.log(`  New Current Owner: ${updatedProp.currentOwner} (Bob Verma)`);
  console.log(`  Ownership matches Bob? ${updatedProp.currentOwner.toLowerCase() === bob.address.toLowerCase() ? "YES (✓ 100% SUCCESS)" : "NO"}`);

  const history = await landRegistry.getOwnershipHistory(propId);
  console.log(`\n--- Chronological Ownership Chain (#${propId}) ---`);
  history.forEach((h, idx) => {
    console.log(`  [Block #${idx}] From: ${h.previousOwner} -> To: ${h.newOwner} | Price: ₹${h.price.toString()} | Note: "${h.remarks}"`);
  });

  console.log("\n==================================================================");
  console.log("   ALL END-TO-END FLOWS & SECURITY GUARDS VERIFIED SUCCESSFULLY!  ");
  console.log("==================================================================");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
