🏛️ CadastreX — Blockchain-Based Land Registry

A decentralized land registration and property-transfer system built using Solidity, Hardhat, Node.js, and ethers.js.

CadastreX demonstrates how blockchain technology can be used to maintain a tamper-resistant digital land registry where property registration, government verification, ownership history, and property transfers are recorded through smart contracts.

«Educational Project: This project is intended as a demonstration of blockchain architecture and decentralized land-record management. It is not intended for production government use without substantial additional security, identity, privacy, consensus, and infrastructure work.»

---

📌 Features

- 🏠 Digital property registration
- 🔐 Blockchain-backed land records
- 📄 SHA-256 fingerprinting of uploaded documents
- 👤 Citizen / property-owner accounts
- 🏛️ Sub-Registrar verification
- 💰 Revenue Department verification
- 🔄 Property transfer and sale workflow
- 📜 Immutable ownership history
- 🔎 Public land-record search
- 🛡️ Solidity role-based access control
- ⛓️ Local Ethereum-compatible blockchain using Hardhat
- 🌐 Browser-based frontend using ethers.js

---

🏗️ System Architecture

The system consists of three primary layers:

                     ┌─────────────────────────┐
                     │       Web Browser       │
                     │                         │
                     │     CadastreX UI        │
                     │   HTML / CSS / JS       │
                     │                         │
                     │      ethers.js          │
                     └────────────┬────────────┘
                                  │
                                  │ JSON-RPC
                                  ▼
                     ┌─────────────────────────┐
                     │     Blockchain Node     │
                     │                         │
                     │      Hardhat Node       │
                     │      Port: 8545         │
                     └────────────┬────────────┘
                                  │
                                  │ Ethereum RPC
                                  ▼
                     ┌─────────────────────────┐
                     │     Smart Contract     │
                     │                         │
                     │     LandRegistry.sol    │
                     │                         │
                     │ • Properties            │
                     │ • Ownership             │
                     │ • Verification          │
                     │ • Transfers             │
                     │ • Access Control        │
                     └─────────────────────────┘

---

🧩 Repository Structure

BlockChain/
│
├── client/
│   ├── index.html
│   ├── app.js
│   └── style.css
│
├── contracts/
│   └── LandRegistry.sol
│
├── scripts/
│   └── deploy.js
│
├── test/
│   └── ...
│
├── docs/
│   └── ...
│
├── hardhat.config.js
├── package.json
├── package-lock.json
└── README.md

"client/"

Contains the browser-based CadastreX application.

The frontend uses "ethers.js" to communicate with the blockchain through JSON-RPC. The current implementation creates an "ethers.JsonRpcProvider" connected to:

http://127.0.0.1:8545

The contract address used by the frontend is currently:

0x5FbDB2315678afecb367f032d93F642f64180aa3

These values correspond to the default Hardhat local development environment.

"contracts/"

Contains the Solidity smart contract.

LandRegistry.sol

This contract manages:

- Property registration
- Property verification
- Ownership
- Ownership history
- Property transfers
- Registrar approval
- Revenue approval
- Role-based access control

"scripts/"

Contains deployment scripts.

The deployment script creates the "LandRegistry" contract and initializes it with Hardhat accounts representing:

Account 0 → Administrator
Account 1 → Sub-Registrar
Account 2 → Revenue Department
Account 3 → Alice / Citizen
Account 4 → Bob / Citizen

It also creates sample property records for demonstration purposes.

---

⚙️ Technology Stack

Component| Technology
Smart Contract| Solidity 0.8.20
Blockchain| Hardhat Network
Backend/Blockchain Runtime| Node.js
Blockchain Interface| ethers.js 6
Frontend| HTML / CSS / JavaScript
Smart Contract Library| OpenZeppelin
Testing| Hardhat + Chai
Contract Deployment| Hardhat
Document Fingerprinting| SHA-256

The project currently uses Solidity "0.8.20" with the optimizer enabled.

---

💻 Running on a Single Machine

1. Prerequisites

Install:

- Node.js
- npm
- Git

Verify:

node --version
npm --version
git --version

---

2. Clone the repository

git clone https://github.com/joelmammoodan/BlockChain.git
cd BlockChain

---

3. Install dependencies

npm install

The project dependencies include Hardhat, ethers.js, OpenZeppelin contracts and the Hardhat toolbox.

---

⛓️ Start the Blockchain Node

Open Terminal 1:

npx hardhat node

You should see something similar to:

Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Hardhat will also generate a set of deterministic development accounts.

Keep this terminal running.

---

🔨 Compile the Smart Contract

Open Terminal 2:

npx hardhat compile

---

🚀 Deploy the Contract

With the Hardhat node still running:

npx hardhat run scripts/deploy.js --network localhost

The deployment script will print the addresses of the demo accounts and the deployed contract.

For example:

Admin (0):           0x...
Registrar (1):       0x...
Revenue Dept (2):    0x...
Citizen 1 (Alice 3): 0x...
Citizen 2 (Bob 4):   0x...

LandRegistry successfully deployed to:
0x5FbDB2315678afecb367f032d93F642f64180aa3

The deployment script also inserts demonstration property data.

---

🌐 Start the Frontend

The frontend is a static web application.

From the project root, enter:

cd client

You can serve it using any static HTTP server.

For example, with "npx serve":

npx serve .

Or with Python:

python3 -m http.server 3000

Then open:

http://localhost:3000

---

🔑 Demo Accounts

The frontend contains predefined demonstration identities:

Account| Role
Alice Sharma| Citizen / Property Owner
Bob Verma| Citizen / Buyer
Sub-Registrar Office| Government Official
Revenue & Tax Department| Government Official
System Administrator| Administrator

The default demonstration password is:

password123

These identities correspond to the Hardhat development accounts created by the local node.

---

🔄 How the System Works

1. Property Registration

Citizen
   │
   │ Property details
   │ + Title document
   ▼
Frontend
   │
   │ SHA-256 document hash
   ▼
LandRegistry.sol
   │
   │ registerProperty()
   ▼
Blockchain
   │
   ▼
Pending Verification

The actual document does not need to be stored directly on-chain.

Instead, the frontend calculates a cryptographic fingerprint of the document and sends the hash to the smart contract.

This allows the system to later determine whether a document has changed.

---

🏛️ Government Verification

A property initially enters a pending state.

Two independent authorities can verify it:

             Property
                │
        ┌───────┴────────┐
        ▼                ▼
 Sub-Registrar      Revenue Dept.
        │                │
        │ approve        │ approve
        └───────┬────────┘
                ▼
        Fully Verified

The smart contract contains separate roles for:

REGISTRAR_ROLE
REVENUE_ROLE
DEFAULT_ADMIN_ROLE

This provides role-based authorization at the smart-contract level.

---

🔄 Property Transfer

A verified owner can initiate a property transfer.

Current Owner
      │
      │ Transfer Request
      ▼
LandRegistry
      │
      ├───────────────┐
      ▼               ▼
Sub-Registrar    Revenue Dept.
      │               │
      │ Approval      │ Approval
      └───────┬───────┘
              ▼
       Transfer Cleared
              │
              ▼
       Ownership Updated
              │
              ▼
       Ownership History

The transfer process records:

- Seller
- Buyer
- Property ID
- Agreed amount
- New deed hash
- Registrar approval
- Revenue approval
- Timestamp
- Ownership history

---

📜 Ownership History

Every ownership transfer creates a historical record.

Conceptually:

State / Original Registration
             │
             ▼
        Alice Sharma
             │
             │ Property Sale
             ▼
          Bob Verma
             │
             │ Future Transfer
             ▼
         New Owner

This allows the frontend to display a chronological title-provenance timeline.

---

🖥️ Multi-Machine Deployment

The project can also be demonstrated across multiple computers.

For example:

             COMPUTER A
        ┌───────────────────┐
        │ Blockchain Node   │
        │                   │
        │ Hardhat           │
        │ 192.168.1.100     │
        │ Port 8545         │
        └─────────┬─────────┘
                  │
             LAN / Wi-Fi
                  │
        ┌─────────┴─────────┐
        │                   │
        ▼                   ▼

 COMPUTER B             COMPUTER C
┌──────────────┐       ┌──────────────┐
│ CadastreX UI │       │ CadastreX UI │
│              │       │              │
│ Citizen      │       │ Government   │
│ Browser      │       │ Officer      │
└──────────────┘       └──────────────┘

Important distinction

This does not create multiple blockchain nodes.

It creates:

1 blockchain node
+
multiple clients

All clients communicate with the same blockchain through JSON-RPC.

This is the easiest way to demonstrate the project on multiple computers.

---

🌐 Multi-Machine Setup

Machine A — Blockchain Server

Find Machine A's local IP:

Linux:

ip addr

Windows:

ipconfig

For example:

192.168.1.100

Start Hardhat so it is reachable from other machines:

npx hardhat node --hostname 0.0.0.0

The blockchain RPC endpoint will then be reachable through:

http://192.168.1.100:8545

Make sure port "8545" is allowed through the firewall.

---

🔌 Configure the Frontend

The current frontend contains:

provider = new ethers.JsonRpcProvider(
    "http://127.0.0.1:8545"
);

That works only when the browser and blockchain node are running on the same computer.

For a multi-machine setup, change it to the IP address of the blockchain server:

provider = new ethers.JsonRpcProvider(
    "http://192.168.1.100:8545"
);

Replace:

192.168.1.100

with the actual IP address of Machine A.

---

💡 Recommended Configuration

For a cleaner implementation, use a configurable RPC URL rather than hardcoding the address.

For example:

const RPC_URL =
    "http://192.168.1.100:8545";

provider = new ethers.JsonRpcProvider(RPC_URL);

This makes it easier to change networks later.

---

🏠 Example: Three Computer Demonstration

Suppose you have:

Computer A
IP: 192.168.1.100
Role: Blockchain Server

Computer B
IP: 192.168.1.101
Role: Citizen

Computer C
IP: 192.168.1.102
Role: Government Officer

Computer A

git clone https://github.com/joelmammoodan/BlockChain.git
cd BlockChain

npm install

npx hardhat compile

npx hardhat node --hostname 0.0.0.0

In another terminal:

npx hardhat run scripts/deploy.js --network localhost

---

Computer B

Clone the repository:

git clone https://github.com/joelmammoodan/BlockChain.git
cd BlockChain/client

Change the RPC URL in "app.js":

const RPC_URL = "http://192.168.1.100:8545";

Then run:

python3 -m http.server 3000

Open:

http://192.168.1.101:3000

---

Computer C

Do the same:

git clone https://github.com/joelmammoodan/BlockChain.git
cd BlockChain/client

python3 -m http.server 3000

Open:

http://192.168.1.102:3000

Both computers now communicate with:

192.168.1.100:8545

---

⚠️ Important: Hardhat Accounts

The multi-machine demonstration uses Hardhat's development accounts.

These accounts are intended for local development and testing.

Do not use the private keys generated by Hardhat for real assets or production systems.

The deployment script specifically relies on Hardhat signers for the administrator, registrar, revenue department and demonstration citizens.

---

🧠 True Distributed Blockchain Architecture

If the goal is to demonstrate a real multi-node blockchain architecture, the architecture should eventually become:

                  ┌─────────────────────┐
                  │     Citizen UI      │
                  └──────────┬──────────┘
                             │
                             ▼
                    ┌────────────────┐
                    │ Blockchain RPC │
                    └───────┬────────┘
                            │
              ┌─────────────┼─────────────┐
              │             │             │
              ▼             ▼             ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │ Node 1   │  │ Node 2   │  │ Node 3   │
        │ Registrar│  │ Revenue  │  │ Citizen  │
        │          │  │          │  │          │
        └────┬─────┘  └────┬─────┘  └────┬─────┘
             │             │             │
             └─────────────┼─────────────┘
                           │
                     P2P Network
                           │
                     Blockchain

However, the current Hardhat setup is not this architecture.

Hardhat's local node is primarily a development blockchain. For a true multi-node deployment, the system would need a network where multiple blockchain nodes participate in consensus and maintain replicated ledger state.

---

🔐 Current vs Distributed Architecture

Feature| Current Project| True Distributed Network
Blockchain node| 1 Hardhat node| Multiple nodes
Clients| Multiple possible| Multiple
Consensus| Hardhat development environment| Network consensus
P2P blockchain| No| Yes
Ledger replication| One node| Multiple nodes
Smart contract| Yes| Yes
Role-based access| Yes| Yes
Production ready| No| Requires additional engineering
Network security| Development only| Required
Identity system| Demo/local accounts| Real identity infrastructure

---

🧪 Testing

Run the project's test suite:

npm test

Or:

npx hardhat test

Compile the contracts:

npm run compile

Start a local blockchain:

npm run node

Deploy:

npm run deploy

The available npm scripts are defined in "package.json".

---

🗺️ System Data Flow

The overall data flow is:

                   USER
                    │
                    ▼
             ┌─────────────┐
             │  Web Client │
             └──────┬──────┘
                    │
              ethers.js
                    │
                    ▼
             ┌─────────────┐
             │ JSON-RPC    │
             │ Blockchain  │
             │ Node        │
             └──────┬──────┘
                    │
                    ▼
          ┌───────────────────┐
          │  LandRegistry.sol │
          └─────────┬─────────┘
                    │
       ┌────────────┼─────────────┐
       │            │             │
       ▼            ▼             ▼
   Properties    Transfers    Ownership
       │            │             │
       └────────────┼─────────────┘
                    │
                    ▼
             Blockchain State

---

📄 Document Verification Architecture

The project uses document hashing rather than storing the document itself in the blockchain.

Title Deed / Sale Deed
          │
          ▼
     SHA-256 Hash
          │
          ▼
   Document Fingerprint
          │
          ▼
    Smart Contract
          │
          ▼
   Immutable Record

Later, the document can be hashed again:

Original Document
       │
       ▼
    SHA-256
       │
       ▼
Hash A
       │
       │ compare
       ▼
Hash stored on blockchain

If the hashes match, the document contents have not changed.

---

🔒 Security Considerations

This project is an educational prototype and should not be treated as a production land-registration system.

A production implementation would require additional security mechanisms including:

- Strong digital identity
- Government PKI / certificates
- Hardware-backed key storage
- Secure wallet management
- Multi-signature authorization
- Real blockchain consensus
- Node authentication
- Encrypted network communication
- Privacy-preserving storage
- Database/indexing infrastructure
- Document storage such as IPFS or secure government storage
- Audit logging
- Key rotation and revocation
- Smart-contract security audits
- Protection against front-running and replay attacks
- Disaster recovery
- Backup and archival strategy

---

🚀 Future Architecture

A production-oriented version could evolve toward:

                         ┌───────────────┐
                         │ Web / Mobile  │
                         │ Applications  │
                         └───────┬───────┘
                                 │
                                 ▼
                         ┌───────────────┐
                         │ API Gateway   │
                         └───────┬───────┘
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
                ▼                ▼                ▼
          Identity Service   Document Store   Blockchain
                │                │                │
                │                │         ┌──────┼──────┐
                │                │         │      │      │
                │                │       Node 1 Node 2 Node 3
                │                │         │      │      │
                └────────────────┴─────────┴──────┴──────┘

The blockchain would become the trust layer, while large documents and application data would remain off-chain.

---

📚 Smart Contract Workflow

Register

registerProperty()
        ↓
Property Created
        ↓
Registrar Verification
        ↓
Revenue Verification
        ↓
Property Fully Verified

Transfer

requestTransfer()
        ↓
Registrar Approval
        ↓
Revenue Approval
        ↓
executeTransfer()
        ↓
Ownership Updated
        ↓
History Recorded

---

🛠️ Useful Commands

Install dependencies

npm install

Compile contracts

npm run compile

Start blockchain

npm run node

Deploy

npm run deploy

Run tests

npm test

Start frontend

cd client
python3 -m http.server 3000

---

👨‍💻 Development Workflow

1. Start Hardhat
        ↓
2. Compile contracts
        ↓
3. Deploy LandRegistry
        ↓
4. Start frontend
        ↓
5. Connect browser to RPC
        ↓
6. Login as demonstration user
        ↓
7. Register / verify property
        ↓
8. Initiate transfer
        ↓
9. Approve transfer
        ↓
10. Verify ownership history

---

📜 License

See the repository license and project files for licensing information.

---

⚠️ Disclaimer

This application is a blockchain demonstration / academic project.

It should not be used as an actual government land registry or for storing real citizens' identity documents, Aadhaar numbers, financial information, or legally binding property records without substantial security, privacy, legal, and infrastructure changes.

---

🔗 Repository

"GitHub — joelmammoodan/BlockChain" (https://github.com/joelmammoodan/BlockChain)