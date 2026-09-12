# Obsidian Code Breakdown: CadastreX Land Registry

## 1. System Components & Architecture

```mermaid
classDiagram
    class LandRegistry {
        +bytes32 REGISTRAR_ROLE
        +bytes32 REVENUE_ROLE
        +mapping properties
        +mapping transferRequests
        +registerProperty()
        +verifyPropertyByRegistrar()
        +verifyPropertyByRevenue()
        +requestTransfer()
        +approveTransferByRegistrar()
        +approveTransferByRevenue()
        +executeTransfer()
        +correctPropertyRecord()
        +getOwnershipHistory()
    }

    class Property {
        +uint256 propertyId
        +string surveyNumber
        +string location
        +uint256 areaSqMeters
        +uint256 marketValue
        +string documentHash
        +address currentOwner
        +bool isRegistrarVerified
        +bool isRevenueVerified
        +PropertyStatus status
    }

    class TransferRequest {
        +uint256 requestId
        +uint256 propertyId
        +address seller
        +address buyer
        +uint256 agreedAmount
        +bool isRegistrarApproved
        +bool isRevenueApproved
        +TransferStatus status
    }

    class OwnershipRecord {
        +address previousOwner
        +address newOwner
        +uint256 timestamp
        +uint256 price
        +string transferDeedHash
        +string remarks
    }

    LandRegistry *-- Property
    LandRegistry *-- TransferRequest
    LandRegistry *-- OwnershipRecord
```

---

## 2. Transfer Execution Sequence Diagram

```mermaid
sequenceDiagram
    autonumber
    actor Owner as Citizen (Owner)
    actor Registrar as Municipal Registrar
    actor Revenue as Revenue Department
    actor Buyer as Buyer / Bank
    participant Contract as LandRegistry.sol

    Owner->>Contract: registerProperty(survey, loc, area, val, docHash)
    Note over Contract: Status: PendingVerification
    Registrar->>Contract: verifyPropertyByRegistrar(propId, true)
    Revenue->>Contract: verifyPropertyByRevenue(propId, true)
    Note over Contract: Status: Verified

    Owner->>Contract: requestTransfer(propId, buyer, price, newDeedHash)
    Note over Contract: Status: TransferPending

    Registrar->>Contract: approveTransferByRegistrar(requestId)
    Revenue->>Contract: approveTransferByRevenue(requestId)
    Note over Contract: Status: FullyApproved

    Buyer->>Contract: executeTransfer(requestId)
    Note over Contract: Updates Owner & Appends OwnershipRecord
    Contract-->>Buyer: Ownership Transferred Event
```

---

## 3. Security Checklist
- [x] **Zero Plaintext PII**: Sensitive records represented via IPFS content IDs / SHA-256 digests.
- [x] **Reentrancy Protection**: Critical state mutation functions use OpenZeppelin `ReentrancyGuard`.
- [x] **Granular Role Segregation**: Separation between Administrative, Municipal Registrar, and Revenue Authority capabilities.
- [x] **Strict Uniqueness Invariants**: Parcel survey numbers mapped to prevent double-registration collisions.
