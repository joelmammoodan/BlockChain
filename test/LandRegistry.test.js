const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LandRegistry Smart Contract Tests", function () {
  let LandRegistry, landRegistry;
  let admin, registrar, revenue, owner1, buyer1, impostor;

  beforeEach(async function () {
    [admin, registrar, revenue, owner1, buyer1, impostor] = await ethers.getSigners();

    LandRegistry = await ethers.getContractFactory("LandRegistry");
    landRegistry = await LandRegistry.deploy(
      admin.address,
      registrar.address,
      revenue.address
    );
    await landRegistry.waitForDeployment();
  });

  describe("A. Deployment & Role Setup", function () {
    it("Should grant correct initial roles", async function () {
      const DEFAULT_ADMIN_ROLE = await landRegistry.DEFAULT_ADMIN_ROLE();
      const REGISTRAR_ROLE = await landRegistry.REGISTRAR_ROLE();
      const REVENUE_ROLE = await landRegistry.REVENUE_ROLE();

      expect(await landRegistry.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await landRegistry.hasRole(REGISTRAR_ROLE, registrar.address)).to.be.true;
      expect(await landRegistry.hasRole(REVENUE_ROLE, revenue.address)).to.be.true;
      expect(await landRegistry.hasRole(REGISTRAR_ROLE, impostor.address)).to.be.false;
    });
  });

  describe("B. Property Registration & Verification", function () {
    it("Should allow a citizen to register a property in Pending state", async function () {
      const tx = await landRegistry.connect(owner1).registerProperty(
        "SURVEY-101",
        "Downtown District 1",
        1200,
        500000,
        "QmHashDoc1"
      );
      await tx.wait();

      const prop = await landRegistry.properties(1);
      expect(prop.propertyId).to.equal(1n);
      expect(prop.surveyNumber).to.equal("SURVEY-101");
      expect(prop.currentOwner).to.equal(owner1.address);
      expect(prop.status).to.equal(0n); // PendingVerification
      expect(prop.isRegistrarVerified).to.be.false;
      expect(prop.isRevenueVerified).to.be.false;
    });

    it("Should reject duplicate survey numbers", async function () {
      await landRegistry.connect(owner1).registerProperty("SURVEY-DUPLICATE", "Loc A", 1000, 100000, "QmHash1");
      
      await expect(
        landRegistry.connect(impostor).registerProperty("SURVEY-DUPLICATE", "Loc B", 2000, 200000, "QmHash2")
      ).to.be.revertedWith("LandRegistry: Property with this survey number already registered");
    });

    it("Should allow Registrar and Revenue Department to verify property", async function () {
      await landRegistry.connect(owner1).registerProperty("SURVEY-202", "Loc C", 1500, 300000, "QmHash2");

      // Non-registrar cannot verify
      await expect(
        landRegistry.connect(impostor).verifyPropertyByRegistrar(1, true)
      ).to.be.reverted;

      // Registrar verifies
      await landRegistry.connect(registrar).verifyPropertyByRegistrar(1, true);
      let prop = await landRegistry.properties(1);
      expect(prop.isRegistrarVerified).to.be.true;
      expect(prop.status).to.equal(0n); // Still pending revenue

      // Revenue Dept verifies
      await landRegistry.connect(revenue).verifyPropertyByRevenue(1, true);
      prop = await landRegistry.properties(1);
      expect(prop.isRevenueVerified).to.be.true;
      expect(prop.status).to.equal(1n); // Verified
    });
  });

  describe("C. Property Transfer & Unauthorized Transfer Rejection", function () {
    beforeEach(async function () {
      // Register and fully verify property #1
      await landRegistry.connect(owner1).registerProperty("SURVEY-303", "Loc D", 2000, 400000, "QmHashDeed");
      await landRegistry.connect(registrar).verifyPropertyByRegistrar(1, true);
      await landRegistry.connect(revenue).verifyPropertyByRevenue(1, true);
    });

    it("Should prevent non-owner from initiating a transfer request", async function () {
      await expect(
        landRegistry.connect(impostor).requestTransfer(1, buyer1.address, 450000, "QmNewDeed")
      ).to.be.revertedWith("LandRegistry: Caller is not the property owner");
    });

    it("Should prevent transfer on unverified property", async function () {
      // Register unverified property #2
      await landRegistry.connect(owner1).registerProperty("SURVEY-UNVERIFIED", "Loc E", 1000, 100000, "QmHash");

      await expect(
        landRegistry.connect(owner1).requestTransfer(2, buyer1.address, 100000, "QmNewDeed")
      ).to.be.revertedWith("LandRegistry: Property must be fully verified to initiate transfer");
    });

    it("Should execute complete multi-stakeholder transfer workflow", async function () {
      // 1. Owner requests transfer to buyer
      const reqTx = await landRegistry.connect(owner1).requestTransfer(1, buyer1.address, 450000, "QmNewDeedBuyer");
      await reqTx.wait();

      let req = await landRegistry.transferRequests(1);
      expect(req.status).to.equal(0n); // Initiated
      expect(req.buyer).to.equal(buyer1.address);

      // 2. Multi-authority approvals
      await landRegistry.connect(registrar).approveTransferByRegistrar(1);
      req = await landRegistry.transferRequests(1);
      expect(req.isRegistrarApproved).to.be.true;

      await landRegistry.connect(revenue).approveTransferByRevenue(1);
      req = await landRegistry.transferRequests(1);
      expect(req.isRevenueApproved).to.be.true;
      expect(req.status).to.equal(3n); // FullyApproved

      // 3. Unauthorized executor cannot execute transfer
      await expect(
        landRegistry.connect(impostor).executeTransfer(1)
      ).to.be.revertedWith("LandRegistry: Unauthorized executor");

      // 4. Buyer executes transfer
      await landRegistry.connect(buyer1).executeTransfer(1);

      // Verify new ownership
      const prop = await landRegistry.properties(1);
      expect(prop.currentOwner).to.equal(buyer1.address);
      expect(prop.documentHash).to.equal("QmNewDeedBuyer");
      expect(prop.status).to.equal(1n); // Verified under new owner
    });
  });

  describe("D. Ownership History Retrieval & Auditability", function () {
    it("Should maintain immutable chronological history across transfers", async function () {
      // Genesis
      await landRegistry.connect(owner1).registerProperty("SURVEY-HIST-1", "Loc Hist", 3000, 600000, "Deed-v1");
      await landRegistry.connect(registrar).verifyPropertyByRegistrar(1, true);
      await landRegistry.connect(revenue).verifyPropertyByRevenue(1, true);

      // Transfer 1: owner1 -> buyer1
      await landRegistry.connect(owner1).requestTransfer(1, buyer1.address, 650000, "Deed-v2");
      await landRegistry.connect(registrar).approveTransferByRegistrar(1);
      await landRegistry.connect(revenue).approveTransferByRevenue(1);
      await landRegistry.connect(buyer1).executeTransfer(1);

      // Transfer 2: buyer1 -> impostor (now a buyer)
      await landRegistry.connect(buyer1).requestTransfer(1, impostor.address, 700000, "Deed-v3");
      await landRegistry.connect(registrar).approveTransferByRegistrar(2);
      await landRegistry.connect(revenue).approveTransferByRevenue(2);
      await landRegistry.connect(impostor).executeTransfer(2);

      // Fetch history
      const history = await landRegistry.getOwnershipHistory(1);
      expect(history.length).to.equal(3);

      // Genesis
      expect(history[0].previousOwner).to.equal(ethers.ZeroAddress);
      expect(history[0].newOwner).to.equal(owner1.address);
      expect(history[0].transferDeedHash).to.equal("Deed-v1");

      // Transfer 1
      expect(history[1].previousOwner).to.equal(owner1.address);
      expect(history[1].newOwner).to.equal(buyer1.address);
      expect(history[1].price).to.equal(650000n);

      // Transfer 2
      expect(history[2].previousOwner).to.equal(buyer1.address);
      expect(history[2].newOwner).to.equal(impostor.address);
      expect(history[2].price).to.equal(700000n);
    });

    it("Should support legitimate administrative correction with immutable audit trail", async function () {
      await landRegistry.connect(owner1).registerProperty("SURVEY-AMEND", "Typo Loc", 1000, 200000, "Deed-Err");
      
      // Admin corrects the typo in survey record
      await landRegistry.connect(admin).correctPropertyRecord(
        1,
        "Corrected Location Plot 44",
        1050,
        "Deed-Fixed",
        "Rectified survey boundary typo per court order 2024/99"
      );

      const prop = await landRegistry.properties(1);
      expect(prop.location).to.equal("Corrected Location Plot 44");
      expect(prop.areaSqMeters).to.equal(1050n);

      const history = await landRegistry.getOwnershipHistory(1);
      expect(history.length).to.equal(2);
      expect(history[1].remarks).to.include("Administrative Record Amendment");
    });
  });
});
