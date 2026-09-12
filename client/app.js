// LandRegistry ABI definition
const CONTRACT_ABI = [
  "event PropertyRegistered(uint256 indexed propertyId, string surveyNumber, address indexed owner, string documentHash)",
  "event PropertyVerifiedByRegistrar(uint256 indexed propertyId, address indexed registrar, bool approved)",
  "event PropertyVerifiedByRevenue(uint256 indexed propertyId, address indexed revenueOfficer, bool approved)",
  "event PropertyFullyVerified(uint256 indexed propertyId)",
  "event TransferRequested(uint256 indexed requestId, uint256 indexed propertyId, address indexed seller, address buyer, uint256 agreedAmount)",
  "event TransferApprovedByRegistrar(uint256 indexed requestId, address indexed registrar)",
  "event TransferApprovedByRevenue(uint256 indexed requestId, address indexed revenueOfficer)",
  "event OwnershipTransferred(uint256 indexed propertyId, address indexed previousOwner, address indexed newOwner, uint256 price, uint256 timestamp)",
  "function REGISTRAR_ROLE() view returns (bytes32)",
  "function REVENUE_ROLE() view returns (bytes32)",
  "function DEFAULT_ADMIN_ROLE() view returns (bytes32)",
  "function hasRole(bytes32 role, address account) view returns (bool)",
  "function registerProperty(string surveyNumber, string location, uint256 areaSqMeters, uint256 marketValue, string documentHash) returns (uint256)",
  "function verifyPropertyByRegistrar(uint256 propertyId, bool approved)",
  "function verifyPropertyByRevenue(uint256 propertyId, bool approved)",
  "function requestTransfer(uint256 propertyId, address buyer, uint256 agreedAmount, string newDeedHash) returns (uint256)",
  "function approveTransferByRegistrar(uint256 requestId)",
  "function approveTransferByRevenue(uint256 requestId)",
  "function executeTransfer(uint256 requestId)",
  "function cancelTransfer(uint256 requestId, string reason)",
  "function getOwnershipHistory(uint256 propertyId) view returns (tuple(address previousOwner, address newOwner, uint256 timestamp, uint256 price, string transferDeedHash, string remarks)[])",
  "function getPropertiesByOwner(address owner) view returns (uint256[])",
  "function getTotalProperties() view returns (uint256)",
  "function getTotalTransferRequests() view returns (uint256)",
  "function properties(uint256) view returns (uint256 propertyId, string surveyNumber, string location, uint256 areaSqMeters, uint256 marketValue, string documentHash, address currentOwner, bool isRegistrarVerified, bool isRevenueVerified, uint8 status, uint256 registrationTimestamp)",
  "function surveyToPropertyId(string) view returns (uint256)",
  "function transferRequests(uint256) view returns (uint256 requestId, uint256 propertyId, address seller, address buyer, uint256 agreedAmount, string newDeedHash, bool isRegistrarApproved, bool isRevenueApproved, bool isBuyerPaid, uint8 status, uint256 requestTimestamp)"
];

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const DEFAULT_USERS = [
  { id: "owner1", name: "Alice Sharma", role: "Citizen (Owner)", index: 3, nationalId: "IND-8839-4412" },
  { id: "buyer1", name: "Bob Verma", role: "Citizen (Buyer)", index: 4, nationalId: "IND-1290-7764" },
  { id: "registrar", name: "Sub-Registrar Office", role: "Government Official", index: 1, nationalId: "GOV-REG-01" },
  { id: "revenue", name: "Revenue & Tax Dept", role: "Government Official", index: 2, nationalId: "GOV-REV-02" },
  { id: "admin", name: "System Administrator", role: "Contract Deployer", index: 0, nationalId: "SYS-ROOT" }
];

let currentUser = null;
let provider, signer, contract, userAddress;
let isRegistrar = false;
let isRevenue = false;
let isAdmin = false;

let registeredFileHash = "0x5a1f2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a";
let transferFileHash = "0x7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c";

const NAMES_MAP = {
  "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266": "System Admin",
  "0x70997970c51812dc3a010c7d01b50e0d17dc79c8": "Sub-Registrar Office",
  "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc": "Revenue Department",
  "0x90f79bf6eb2c4f870365e785982e1f101e93b906": "Alice Sharma (Citizen)",
  "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65": "Bob Verma (Citizen)"
};

const STATUS_MAP = ["Pending Official Verification", "Verified & Legally Valid", "Sale Pending (In Escrow)", "Blocked / Dispute"];
const TRANSFER_STATUS_MAP = ["Application Submitted", "Registrar Approved", "Revenue Approved", "Fully Cleared for Settlement", "Transferred & Completed", "Cancelled", "Rejected"];

// DOM references
const authOverlay = document.getElementById("authOverlay");
const mainApp = document.getElementById("mainApp");
const loginAccountSelect = document.getElementById("loginAccountSelect");
const loginPassword = document.getElementById("loginPassword");
const loginForm = document.getElementById("loginForm");
const authTabLogin = document.getElementById("authTabLogin");
const authTabSignup = document.getElementById("authTabSignup");
const loginView = document.getElementById("loginView");
const signupView = document.getElementById("signupView");
const signupForm = document.getElementById("signupForm");
const logoutBtn = document.getElementById("logoutBtn");

const userNameDisplay = document.getElementById("userNameDisplay");
const userRoleBadge = document.getElementById("userRoleBadge");
const walletAddressElem = document.getElementById("walletAddress");
const statTotalProps = document.getElementById("statTotalProps");
const statActiveTransfers = document.getElementById("statActiveTransfers");
const currentBlock = document.getElementById("currentBlock");

window.addEventListener("DOMContentLoaded", () => {
  initAuthUI();
  initTabs();
  setupEventListeners();
});

function getStoredUsers() {
  const customUsers = JSON.parse(localStorage.getItem("cadastre_users") || "[]");
  return [...DEFAULT_USERS, ...customUsers];
}

function initAuthUI() {
  // Populate Login Select
  const users = getStoredUsers();
  loginAccountSelect.innerHTML = "";
  users.forEach((u, i) => {
    const opt = document.createElement("option");
    opt.value = u.id || `user_${i}`;
    opt.textContent = `${u.name} — ${u.role} (${u.nationalId || 'Verified'})`;
    loginAccountSelect.appendChild(opt);
  });

  // Switch between Login and Signup tabs
  authTabLogin.addEventListener("click", () => {
    authTabLogin.classList.add("active");
    authTabSignup.classList.remove("active");
    loginView.classList.add("active");
    signupView.classList.remove("active");
  });

  authTabSignup.addEventListener("click", () => {
    authTabSignup.classList.add("active");
    authTabLogin.classList.remove("active");
    signupView.classList.add("active");
    loginView.classList.remove("active");
  });

  // Submit Login
  if (loginForm) {
    loginForm.addEventListener("submit", handleLogin);
  }

  // Submit Signup
  signupForm.addEventListener("submit", handleSignup);

  // Logout
  logoutBtn.addEventListener("click", handleLogout);
}

async function handleLogin(e) {
  if (e) e.preventDefault();
  const users = getStoredUsers();
  const selectedId = loginAccountSelect.value;
  const enteredPassword = loginPassword.value;

  let targetUser = users.find(u => u.id === selectedId) || users[0];

  // Password validation:
  // For default pre-seeded demo users, default password is "password123"
  const expectedPassword = targetUser.password || "password123";
  if (enteredPassword !== expectedPassword) {
    alert("❌ Invalid password! Please enter the correct password for this account.");
    return;
  }

  try {
    provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

    const signerIdx = targetUser.index !== undefined ? targetUser.index : 3;
    signer = await provider.getSigner(signerIdx);
    userAddress = await signer.getAddress();

    currentUser = targetUser;
    NAMES_MAP[userAddress.toLowerCase()] = currentUser.name;

    contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

    // Update session UI
    userNameDisplay.textContent = currentUser.name;
    userRoleBadge.textContent = currentUser.role.split(" ")[0].toUpperCase();
    walletAddressElem.textContent = `${userAddress.substring(0, 6)}...${userAddress.substring(38)}`;

    // Check roles
    isRegistrar = (currentUser.id === "registrar" || currentUser.id === "admin");
    isRevenue = (currentUser.id === "revenue" || currentUser.id === "admin");
    isAdmin = (currentUser.id === "admin");

    try {
      const REGISTRAR_ROLE = await contract.REGISTRAR_ROLE();
      const REVENUE_ROLE = await contract.REVENUE_ROLE();
      const isRegOnChain = await contract.hasRole(REGISTRAR_ROLE, userAddress);
      const isRevOnChain = await contract.hasRole(REVENUE_ROLE, userAddress);
      if (isRegOnChain) isRegistrar = true;
      if (isRevOnChain) isRevenue = true;
    } catch(e) {}

    // Show App & Clear password
    loginPassword.value = "";
    authOverlay.style.display = "none";
    mainApp.style.display = "block";

    // Apply strict Role-Based Access Control to UI Navigation
    applyRolePermissions();

    // Update Buyer Select Dropdown dynamically across the app
    populateBuyerSelect();

    // Load Data
    loadPublicData();
    loadMyProperties();
    loadAuthorityPending();
    loadTransfers();
  } catch (err) {
    alert("Connection to Blockchain Node failed: " + (err.reason || err.message));
  }
}

function applyRolePermissions() {
  const isAuthority = (isRegistrar || isRevenue || isAdmin);

  const tabBtnExplorer = document.getElementById("tabBtnExplorer");
  const tabBtnRegister = document.getElementById("tabBtnRegister");
  const tabBtnMyProps = document.getElementById("tabBtnMyProps");
  const tabBtnTransfer = document.getElementById("tabBtnTransfer");
  const tabBtnAuthority = document.getElementById("tabBtnAuthority");

  if (!isAuthority) {
    // Citizen / Customer / Commercial Buyer Role:
    // Can only access: My Land Holdings, New Land Registration, and Search Land Records
    tabBtnRegister.style.display = "inline-flex";
    tabBtnMyProps.style.display = "inline-flex";
    tabBtnTransfer.style.display = "inline-flex";
    tabBtnExplorer.style.display = "inline-flex";
    
    // Completely hide Government Verification Desk
    tabBtnAuthority.style.display = "none";

    // Default open to "My Land Holdings" for Customers/Citizens
    tabBtnMyProps.click();
  } else {
    // Government Officials (Sub-Registrar, Revenue Dept, Admin):
    // Dedicated to Land Verification Checks, Explorer, and Approvals
    tabBtnAuthority.style.display = "inline-flex";
    tabBtnExplorer.style.display = "inline-flex";
    tabBtnTransfer.style.display = "inline-flex";

    // Government officers typically do not register private property on their officer profile
    tabBtnRegister.style.display = isAdmin ? "inline-flex" : "none";
    tabBtnMyProps.style.display = isAdmin ? "inline-flex" : "none";

    // Default open to "Government Verification Desk" for Officials
    tabBtnAuthority.click();
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const name = document.getElementById("signupFullName").value.trim();
  const citizenId = document.getElementById("signupCitizenId").value.trim();
  const roleType = document.getElementById("signupRole").value;
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value;
  const passwordConfirm = document.getElementById("signupPasswordConfirm").value;

  if (!name || !citizenId) return;

  if (password.length < 6) {
    alert("Password must be at least 6 characters long.");
    return;
  }

  if (password !== passwordConfirm) {
    alert("Passwords do not match. Please re-enter.");
    return;
  }

  const currentUsers = JSON.parse(localStorage.getItem("cadastre_users") || "[]");
  // Pick next unused hardhat signer index (5 through 19)
  const nextIndex = 5 + currentUsers.length;

  const newUser = {
    id: `user_${Date.now()}`,
    name: name,
    role: roleType === "investor" ? "Commercial Buyer" : "Citizen",
    nationalId: citizenId,
    email: email,
    password: password,
    index: nextIndex < 20 ? nextIndex : 3
  };

  currentUsers.push(newUser);
  localStorage.setItem("cadastre_users", JSON.stringify(currentUsers));

  alert(`✓ Identity created for ${name}! Please enter your password to sign in.`);
  
  // Clear inputs
  document.getElementById("signupFullName").value = "";
  document.getElementById("signupCitizenId").value = "";
  document.getElementById("signupEmail").value = "";
  document.getElementById("signupPassword").value = "";
  document.getElementById("signupPasswordConfirm").value = "";

  // Refresh select and switch to login tab
  initAuthUI();
  authTabLogin.click();
  loginAccountSelect.value = newUser.id;
  loginPassword.focus();
}

function handleLogout() {
  currentUser = null;
  signer = null;
  loginPassword.value = "";
  mainApp.style.display = "none";
  authOverlay.style.display = "flex";
}

function populateBuyerSelect() {
  const transferBuyerSelect = document.getElementById("transferBuyerSelect");
  if (!transferBuyerSelect) return;

  const users = getStoredUsers().filter(u => u.id !== currentUser?.id);
  transferBuyerSelect.innerHTML = "";

  users.forEach(u => {
    const opt = document.createElement("option");
    // Assign mapped address or hardhat address
    opt.value = u.address || (u.index === 4 ? "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65" : "custom");
    opt.textContent = `${u.name} (${u.role})`;
    transferBuyerSelect.appendChild(opt);
  });

  const customOpt = document.createElement("option");
  customOpt.value = "custom";
  customOpt.textContent = "Enter Custom Citizen Address...";
  transferBuyerSelect.appendChild(customOpt);
}

function initTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach(btn => {
    btn.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
      
      btn.classList.add("active");
      const target = document.getElementById(`tab-${btn.dataset.tab}`);
      if (target) target.classList.add("active");

      refreshCurrentTab(btn.dataset.tab);
    });
  });
}

function setupEventListeners() {
  const deedFileInput = document.getElementById("deedFileInput");
  if (deedFileInput) {
    deedFileInput.addEventListener("change", async (e) => {
      if (e.target.files.length > 0) {
        const file = e.target.files[0];
        registeredFileHash = await computeFileHash(file);
        document.getElementById("fileHashPreview").textContent = `✓ Document verified: ${file.name} (SHA-256: ${registeredFileHash.substring(0, 18)}...)`;
      }
    });
  }

  const transferDeedFileInput = document.getElementById("transferDeedFileInput");
  if (transferDeedFileInput) {
    transferDeedFileInput.addEventListener("change", async (e) => {
      if (e.target.files.length > 0) {
        const file = e.target.files[0];
        transferFileHash = await computeFileHash(file);
        document.getElementById("transferFileHashPreview").textContent = `✓ Document verified: ${file.name} (SHA-256: ${transferFileHash.substring(0, 18)}...)`;
      }
    });
  }

  const transferBuyerSelect = document.getElementById("transferBuyerSelect");
  const transferBuyerCustom = document.getElementById("transferBuyerCustom");
  if (transferBuyerSelect) {
    transferBuyerSelect.addEventListener("change", () => {
      if (transferBuyerSelect.value === "custom") {
        transferBuyerCustom.style.display = "block";
        transferBuyerCustom.required = true;
      } else {
        transferBuyerCustom.style.display = "none";
        transferBuyerCustom.required = false;
      }
    });
  }

  document.getElementById("searchBtn").addEventListener("click", searchProperty);
  document.getElementById("searchQuery").addEventListener("keypress", (e) => {
    if (e.key === "Enter") searchProperty();
  });

  document.getElementById("refreshAllBtn").addEventListener("click", loadPublicData);
  document.getElementById("refreshMyPropsBtn").addEventListener("click", loadMyProperties);
  document.getElementById("refreshTransfersBtn").addEventListener("click", loadTransfers);

  document.getElementById("registerForm").addEventListener("submit", handleRegister);
  document.getElementById("initiateTransferForm").addEventListener("submit", handleTransferSubmit);
  document.getElementById("closeTransferFormBtn").addEventListener("click", () => {
    document.getElementById("transferInitiateCard").style.display = "none";
  });
}

function refreshCurrentTab(tabId) {
  if (tabId === "explorer") loadPublicData();
  if (tabId === "my-properties") loadMyProperties();
  if (tabId === "transfer") loadTransfers();
  if (tabId === "authority") loadAuthorityPending();
}

async function loadPublicData() {
  if (!contract) return;
  try {
    const block = await provider.getBlockNumber();
    currentBlock.textContent = block.toString();

    const totalProps = Number(await contract.getTotalProperties());
    const totalTransfers = Number(await contract.getTotalTransferRequests());
    
    statTotalProps.textContent = totalProps;
    statActiveTransfers.textContent = totalTransfers;

    const tbody = document.getElementById("allPropertiesBody");
    tbody.innerHTML = "";

    if (totalProps === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state">No land records registered yet.</td></tr>`;
      return;
    }

    for (let i = 1; i <= totalProps; i++) {
      const prop = await contract.properties(i);
      const row = document.createElement("tr");
      
      const badgeClass = getBadgeClass(Number(prop.status));
      row.innerHTML = `
        <td class="mono">#${prop.propertyId}</td>
        <td class="mono"><strong>${escapeHtml(prop.surveyNumber)}</strong></td>
        <td>${escapeHtml(prop.location)}</td>
        <td>${prop.areaSqMeters}</td>
        <td><strong>${formatPersona(prop.currentOwner)}</strong></td>
        <td><span class="badge ${badgeClass}">${STATUS_MAP[Number(prop.status)]}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="window.viewPropertyDetail(${prop.propertyId})">View Title Record</button>
        </td>
      `;
      tbody.appendChild(row);
    }
  } catch (err) {
    console.error("Error loading public data:", err);
  }
}

async function searchProperty() {
  const query = document.getElementById("searchQuery").value.trim();
  if (!query || !contract) return;

  try {
    let propId = Number(query);
    if (isNaN(propId) || propId === 0) {
      propId = Number(await contract.surveyToPropertyId(query));
    }

    if (!propId || propId === 0) {
      alert("No official record found for Survey No / Record ID: " + query);
      return;
    }

    window.viewPropertyDetail(propId);
  } catch (err) {
    alert("Search error: " + (err.message || err));
  }
}

window.viewPropertyDetail = async function(propId) {
  if (!contract) return;
  try {
    const prop = await contract.properties(propId);
    const history = await contract.getOwnershipHistory(propId);

    const resultArea = document.getElementById("searchResultArea");
    resultArea.style.display = "block";

    document.getElementById("resPropId").textContent = `#${prop.propertyId}`;
    document.getElementById("resSurvey").textContent = prop.surveyNumber;
    document.getElementById("resLocation").textContent = prop.location;
    document.getElementById("resArea").textContent = prop.areaSqMeters.toString();
    document.getElementById("resOwner").textContent = `${formatPersona(prop.currentOwner)} (${formatAddress(prop.currentOwner)})`;
    document.getElementById("resValue").textContent = Number(prop.marketValue).toLocaleString('en-IN');
    document.getElementById("resRegClear").textContent = prop.isRegistrarVerified ? "✓ APPROVED & SEALED" : "⏳ PENDING VERIFICATION";
    document.getElementById("resRevClear").textContent = prop.isRevenueVerified ? "✓ TAX & TITLE CLEARED" : "⏳ PENDING CLEARANCE";

    const badgeElem = document.getElementById("resBadge");
    badgeElem.className = `badge ${getBadgeClass(Number(prop.status))}`;
    badgeElem.textContent = STATUS_MAP[Number(prop.status)];

    const timeline = document.getElementById("ownershipTimeline");
    timeline.innerHTML = "";

    history.forEach((record, index) => {
      const item = document.createElement("div");
      item.className = "timeline-item";
      
      const isGenesis = record.previousOwner === ethers.ZeroAddress;
      const dateStr = new Date(Number(record.timestamp) * 1000).toLocaleString();

      item.innerHTML = `
        <div class="timeline-dot"></div>
        <div class="timeline-header">
          <div class="timeline-title">${isGenesis ? "Original Title Inception / Registration" : `Title Transfer #${index}`}</div>
          <div class="timeline-date">${dateStr}</div>
        </div>
        <div class="timeline-body">
          <div><strong>Transferred From:</strong> ${isGenesis ? "State Cadastre Authority" : formatPersona(record.previousOwner)}</div>
          <div><strong>Transferred To:</strong> ${formatPersona(record.newOwner)} (${formatAddress(record.newOwner)})</div>
          <div><strong>Registered Consideration:</strong> ₹${Number(record.price).toLocaleString('en-IN')}</div>
          <div style="color: #888; margin-top: 4px;"><em>Official Note: ${record.remarks}</em></div>
        </div>
      `;
      timeline.appendChild(item);
    });

    resultArea.scrollIntoView({ behavior: "smooth" });
  } catch (err) {
    alert("Error fetching property detail: " + err.message);
  }
};

async function handleRegister(e) {
  e.preventDefault();
  const survey = document.getElementById("regSurvey").value.trim();
  const location = document.getElementById("regLocation").value.trim();
  const area = document.getElementById("regArea").value;
  const value = document.getElementById("regValue").value;

  try {
    const tx = await contract.registerProperty(survey, location, area, value, registeredFileHash);
    await tx.wait();
    alert("✓ Land Registration Application submitted successfully! It has been placed in the Government Verification queue.");
    document.getElementById("registerForm").reset();
    document.getElementById("fileHashPreview").textContent = "Digital Fingerprint: (Will be computed automatically upon file selection)";
    loadPublicData();
    loadMyProperties();
  } catch (err) {
    alert("Registration failed: " + (err.reason || err.message));
  }
}

async function loadMyProperties() {
  if (!contract || !userAddress) return;
  try {
    const propIds = await contract.getPropertiesByOwner(userAddress);
    const tbody = document.getElementById("myPropertiesBody");
    tbody.innerHTML = "";

    let ownedCount = 0;
    for (let id of propIds) {
      const prop = await contract.properties(id);
      if (prop.currentOwner.toLowerCase() !== userAddress.toLowerCase()) continue;

      ownedCount++;
      const row = document.createElement("tr");
      const canTransfer = Number(prop.status) === 1; // Verified

      row.innerHTML = `
        <td class="mono">#${prop.propertyId}</td>
        <td class="mono"><strong>${escapeHtml(prop.surveyNumber)}</strong></td>
        <td>${escapeHtml(prop.location)}</td>
        <td>₹${Number(prop.marketValue).toLocaleString('en-IN')}</td>
        <td><span class="badge ${getBadgeClass(Number(prop.status))}">${STATUS_MAP[Number(prop.status)]}</span></td>
        <td>
          ${canTransfer ? `<button class="btn btn-primary btn-sm" onclick="window.openTransferModal(${prop.propertyId})">Sell / Transfer</button>` : `<span style="font-size: 11px; color: #888;">Pending Clearance</span>`}
        </td>
      `;
      tbody.appendChild(row);
    }

    if (ownedCount === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="empty-state">No land records registered under ${formatPersona(userAddress)}.</td></tr>`;
    }
  } catch (err) {
    console.error("Error loading my properties:", err);
  }
}

window.openTransferModal = function(propId) {
  document.getElementById("transferPropId").value = propId;
  document.getElementById("transferPropIdDisplay").textContent = `#${propId}`;
  document.getElementById("transferInitiateCard").style.display = "block";
  document.getElementById("transferInitiateCard").scrollIntoView({ behavior: "smooth" });
};

async function handleTransferSubmit(e) {
  e.preventDefault();
  const propId = document.getElementById("transferPropId").value;
  const selectVal = document.getElementById("transferBuyerSelect").value;
  const buyer = (selectVal === "custom") ? document.getElementById("transferBuyerCustom").value.trim() : selectVal;
  const amount = document.getElementById("transferAmount").value;

  try {
    const tx = await contract.requestTransfer(propId, buyer, amount, transferFileHash);
    await tx.wait();
    alert("✓ Property Sale Agreement submitted! Awaiting Sub-Registrar and Revenue Department clearance.");
    document.getElementById("initiateTransferForm").reset();
    document.getElementById("transferInitiateCard").style.display = "none";
    loadMyProperties();
    loadTransfers();
  } catch (err) {
    alert("Transfer application failed: " + (err.reason || err.message));
  }
}

async function loadTransfers() {
  if (!contract) return;
  try {
    const totalRequests = Number(await contract.getTotalTransferRequests());
    const tbody = document.getElementById("transferRequestsBody");
    tbody.innerHTML = "";

    if (totalRequests === 0) {
      tbody.innerHTML = `<tr><td colspan="9" class="empty-state">No active property sale applications.</td></tr>`;
      return;
    }

    for (let i = 1; i <= totalRequests; i++) {
      const req = await contract.transferRequests(i);
      const row = document.createElement("tr");

      const isBuyer = userAddress && req.buyer.toLowerCase() === userAddress.toLowerCase();
      const isSeller = userAddress && req.seller.toLowerCase() === userAddress.toLowerCase();
      const canExecute = Number(req.status) === 3 && (isBuyer || isSeller || isRegistrar || isAdmin);

      row.innerHTML = `
        <td class="mono">#${req.requestId}</td>
        <td class="mono">#${req.propertyId}</td>
        <td>${formatPersona(req.seller)}</td>
        <td>${formatPersona(req.buyer)}</td>
        <td>₹${Number(req.agreedAmount).toLocaleString('en-IN')}</td>
        <td>${req.isRegistrarApproved ? "✓ APPROVED" : "⏳ PENDING"}</td>
        <td>${req.isRevenueApproved ? "✓ APPROVED" : "⏳ PENDING"}</td>
        <td><span class="badge ${Number(req.status) === 4 ? 'badge-verified' : 'badge-transfer'}">${TRANSFER_STATUS_MAP[Number(req.status)]}</span></td>
        <td>
          ${canExecute ? `<button class="btn btn-primary btn-sm" onclick="window.executeTransferAction(${req.requestId})">Accept & Finalize Transfer</button>` : `<span style="font-size: 11px; color: #888;">${Number(req.status) === 4 ? 'Settled' : 'Awaiting Clearances'}</span>`}
        </td>
      `;
      tbody.appendChild(row);
    }
  } catch (err) {
    console.error("Error loading transfers:", err);
  }
}

window.executeTransferAction = async function(requestId) {
  try {
    const tx = await contract.executeTransfer(requestId);
    await tx.wait();
    alert("✓ Title Transfer finalized! Property ownership is now legally updated on the blockchain.");
    loadTransfers();
    loadPublicData();
    loadMyProperties();
  } catch (err) {
    alert("Execution error: " + (err.reason || err.message));
  }
};

async function loadAuthorityPending() {
  if (!contract) return;
  try {
    const totalProps = Number(await contract.getTotalProperties());
    const regTbody = document.getElementById("pendingVerificationsBody");
    regTbody.innerHTML = "";
    let pendingCount = 0;

    for (let i = 1; i <= totalProps; i++) {
      const prop = await contract.properties(i);
      if (Number(prop.status) === 0) {
        pendingCount++;
        const row = document.createElement("tr");
        row.innerHTML = `
          <td class="mono">#${prop.propertyId}</td>
          <td class="mono"><strong>${escapeHtml(prop.surveyNumber)}</strong></td>
          <td>${formatPersona(prop.currentOwner)}</td>
          <td>${prop.isRegistrarVerified ? "✓ APPROVED" : "⏳ PENDING"}</td>
          <td>${prop.isRevenueVerified ? "✓ APPROVED" : "⏳ PENDING"}</td>
          <td>
            ${isRegistrar && !prop.isRegistrarVerified ? `<button class="btn btn-primary btn-sm" onclick="window.verifyInitialByRegistrar(${prop.propertyId})">Approve & Sign (Registrar)</button> ` : ''}
            ${isRevenue && !prop.isRevenueVerified ? `<button class="btn btn-secondary btn-sm" onclick="window.verifyInitialByRevenue(${prop.propertyId})">Approve Tax & Stamp (Revenue)</button>` : ''}
            ${!isRegistrar && !isRevenue ? `<span style="font-size: 11px; color: #888;">Requires Government Officer Login</span>` : ''}
          </td>
        `;
        regTbody.appendChild(row);
      }
    }

    if (pendingCount === 0) {
      regTbody.innerHTML = `<tr><td colspan="6" class="empty-state">No new registration applications awaiting verification.</td></tr>`;
    }

    const totalRequests = Number(await contract.getTotalTransferRequests());
    const transTbody = document.getElementById("pendingTransfersAuthorityBody");
    transTbody.innerHTML = "";
    let pendingTransferCount = 0;

    for (let i = 1; i <= totalRequests; i++) {
      const req = await contract.transferRequests(i);
      if (Number(req.status) < 3) {
        pendingTransferCount++;
        const row = document.createElement("tr");
        row.innerHTML = `
          <td class="mono">#${req.requestId}</td>
          <td class="mono">#${req.propertyId}</td>
          <td>${formatPersona(req.seller)}</td>
          <td>${formatPersona(req.buyer)}</td>
          <td>${req.isRegistrarApproved ? "✓ APPROVED" : "⏳ PENDING"}</td>
          <td>${req.isRevenueApproved ? "✓ APPROVED" : "⏳ PENDING"}</td>
          <td>
            ${isRegistrar && !req.isRegistrarApproved ? `<button class="btn btn-primary btn-sm" onclick="window.approveTransferRegistrar(${req.requestId})">Clear Registrar</button> ` : ''}
            ${isRevenue && !req.isRevenueApproved ? `<button class="btn btn-secondary btn-sm" onclick="window.approveTransferRevenue(${req.requestId})">Clear Revenue</button>` : ''}
            ${!isRegistrar && !isRevenue ? `<span style="font-size: 11px; color: #888;">Requires Government Officer Login</span>` : ''}
          </td>
        `;
        transTbody.appendChild(row);
      }
    }

    if (pendingTransferCount === 0) {
      transTbody.innerHTML = `<tr><td colspan="7" class="empty-state">No property sale applications awaiting clearance.</td></tr>`;
    }

  } catch (err) {
    console.error("Error loading authority pending:", err);
  }
}

window.verifyInitialByRegistrar = async function(propId) {
  try {
    const tx = await contract.verifyPropertyByRegistrar(propId, true);
    await tx.wait();
    alert(`✓ Property #${propId} verified by Sub-Registrar!`);
    loadAuthorityPending();
    loadPublicData();
  } catch (err) {
    alert("Registrar attestation failed: " + (err.reason || err.message));
  }
};

window.verifyInitialByRevenue = async function(propId) {
  try {
    const tx = await contract.verifyPropertyByRevenue(propId, true);
    await tx.wait();
    alert(`✓ Property #${propId} tax and title cleared by Revenue Department!`);
    loadAuthorityPending();
    loadPublicData();
  } catch (err) {
    alert("Revenue attestation failed: " + (err.reason || err.message));
  }
};

window.approveTransferRegistrar = async function(reqId) {
  try {
    const tx = await contract.approveTransferByRegistrar(reqId);
    await tx.wait();
    alert(`✓ Sale Application #${reqId} cleared by Sub-Registrar!`);
    loadAuthorityPending();
    loadTransfers();
  } catch (err) {
    alert("Registrar clearance failed: " + (err.reason || err.message));
  }
};

window.approveTransferRevenue = async function(reqId) {
  try {
    const tx = await contract.approveTransferByRevenue(reqId);
    await tx.wait();
    alert(`✓ Sale Application #${reqId} cleared by Revenue Department!`);
    loadAuthorityPending();
    loadTransfers();
  } catch (err) {
    alert("Revenue clearance failed: " + (err.reason || err.message));
  }
};

function getBadgeClass(status) {
  switch(status) {
    case 0: return "badge-pending";
    case 1: return "badge-verified";
    case 2: return "badge-transfer";
    case 3: return "badge-blocked";
    default: return "badge-pending";
  }
}

function formatPersona(addr) {
  if (!addr || addr === ethers.ZeroAddress) return "Cadastre Genesis";
  const key = addr.toLowerCase();
  return NAMES_MAP[key] || formatAddress(addr);
}

function formatAddress(addr) {
  if (!addr || addr === ethers.ZeroAddress) return "Genesis";
  return `${addr.substring(0, 6)}...${addr.substring(38)}`;
}

function escapeHtml(text) {
  if (!text) return "";
  return text.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
