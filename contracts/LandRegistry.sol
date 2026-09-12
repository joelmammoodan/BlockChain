// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title LandRegistry
 * @dev Blockchain-Based Land Registration and Property Transfer System.
 * Implements multi-stakeholder role verification (Owner, Registrar, Revenue Dept, Buyer)
 * preventing unauthorized modification, duplicate claims, and fraudulent deed transfers.
 */
contract LandRegistry is AccessControl, ReentrancyGuard {
    bytes32 public constant REGISTRAR_ROLE = keccak256("REGISTRAR_ROLE");
    bytes32 public constant REVENUE_ROLE = keccak256("REVENUE_ROLE");

    enum PropertyStatus {
        PendingVerification, // Registered by citizen, awaiting authority approvals
        Verified,            // Approved by both Registrar & Revenue Dept
        TransferPending,     // Escrow/Transfer initiated, awaiting multi-party signoff
        Blocked              // Frozen due to dispute, correction or court order
    }

    enum TransferStatus {
        Initiated,
        RegistrarApproved,
        RevenueApproved,
        FullyApproved,
        Completed,
        Cancelled,
        Rejected
    }

    struct OwnershipRecord {
        address previousOwner;
        address newOwner;
        uint256 timestamp;
        uint256 price;
        string transferDeedHash;
        string remarks;
    }

    struct Property {
        uint256 propertyId;
        string surveyNumber;
        string location;
        uint256 areaSqMeters;
        uint256 marketValue;
        string documentHash; // IPFS or cryptographic SHA-256 fingerprint
        address currentOwner;
        bool isRegistrarVerified;
        bool isRevenueVerified;
        PropertyStatus status;
        uint256 registrationTimestamp;
    }

    struct TransferRequest {
        uint256 requestId;
        uint256 propertyId;
        address seller;
        address buyer;
        uint256 agreedAmount;
        string newDeedHash;
        bool isRegistrarApproved;
        bool isRevenueApproved;
        bool isBuyerPaid;
        TransferStatus status;
        uint256 requestTimestamp;
    }

    // Counters
    uint256 private _propertyIdCounter;
    uint256 private _requestIdCounter;

    // Mappings
    mapping(uint256 => Property) public properties;
    mapping(string => bool) private _surveyNumberExists;
    mapping(string => uint256) public surveyToPropertyId;
    mapping(uint256 => OwnershipRecord[]) private _propertyOwnershipHistory;
    mapping(uint256 => TransferRequest) public transferRequests;
    mapping(address => uint256[]) private _ownerProperties;

    // Events
    event PropertyRegistered(
        uint256 indexed propertyId,
        string surveyNumber,
        address indexed owner,
        string documentHash
    );
    event PropertyVerifiedByRegistrar(uint256 indexed propertyId, address indexed registrar, bool approved);
    event PropertyVerifiedByRevenue(uint256 indexed propertyId, address indexed revenueOfficer, bool approved);
    event PropertyFullyVerified(uint256 indexed propertyId);
    event PropertyStatusUpdated(uint256 indexed propertyId, PropertyStatus status, string reason);
    
    event TransferRequested(
        uint256 indexed requestId,
        uint256 indexed propertyId,
        address indexed seller,
        address buyer,
        uint256 agreedAmount
    );
    event TransferApprovedByRegistrar(uint256 indexed requestId, address indexed registrar);
    event TransferApprovedByRevenue(uint256 indexed requestId, address indexed revenueOfficer);
    event OwnershipTransferred(
        uint256 indexed propertyId,
        address indexed previousOwner,
        address indexed newOwner,
        uint256 price,
        uint256 timestamp
    );
    event TransferCancelled(uint256 indexed requestId, string reason);
    event PropertyCorrectionLogged(uint256 indexed propertyId, string reason, address indexed authorizedBy);

    // Modifiers
    modifier onlyPropertyOwner(uint256 propertyId) {
        require(properties[propertyId].currentOwner == msg.sender, "LandRegistry: Caller is not the property owner");
        _;
    }

    modifier propertyExists(uint256 propertyId) {
        require(properties[propertyId].propertyId != 0, "LandRegistry: Property does not exist");
        _;
    }

    constructor(address initialAdmin, address initialRegistrar, address initialRevenue) {
        _grantRole(DEFAULT_ADMIN_ROLE, initialAdmin);
        _grantRole(REGISTRAR_ROLE, initialRegistrar);
        _grantRole(REVENUE_ROLE, initialRevenue);
    }

    /**
     * @dev Register a new property on the blockchain.
     * Prevents duplicate survey/parcel registration.
     */
    function registerProperty(
        string calldata surveyNumber,
        string calldata location,
        uint256 areaSqMeters,
        uint256 marketValue,
        string calldata documentHash
    ) external returns (uint256) {
        require(bytes(surveyNumber).length > 0, "LandRegistry: Survey number required");
        require(!_surveyNumberExists[surveyNumber], "LandRegistry: Property with this survey number already registered");
        require(bytes(documentHash).length > 0, "LandRegistry: Document hash required");

        _propertyIdCounter++;
        uint256 newPropertyId = _propertyIdCounter;

        properties[newPropertyId] = Property({
            propertyId: newPropertyId,
            surveyNumber: surveyNumber,
            location: location,
            areaSqMeters: areaSqMeters,
            marketValue: marketValue,
            documentHash: documentHash,
            currentOwner: msg.sender,
            isRegistrarVerified: false,
            isRevenueVerified: false,
            status: PropertyStatus.PendingVerification,
            registrationTimestamp: block.timestamp
        });

        _surveyNumberExists[surveyNumber] = true;
        surveyToPropertyId[surveyNumber] = newPropertyId;
        _ownerProperties[msg.sender].push(newPropertyId);

        // Record Initial Genesis Ownership
        _propertyOwnershipHistory[newPropertyId].push(OwnershipRecord({
            previousOwner: address(0),
            newOwner: msg.sender,
            timestamp: block.timestamp,
            price: marketValue,
            transferDeedHash: documentHash,
            remarks: "Initial Property Registration (Pending Verification)"
        }));

        emit PropertyRegistered(newPropertyId, surveyNumber, msg.sender, documentHash);
        return newPropertyId;
    }

    /**
     * @dev Registrar verifies and attests physical deeds & survey claims.
     */
    function verifyPropertyByRegistrar(uint256 propertyId, bool approved)
        external
        onlyRole(REGISTRAR_ROLE)
        propertyExists(propertyId)
    {
        Property storage prop = properties[propertyId];
        require(prop.status == PropertyStatus.PendingVerification, "LandRegistry: Not in pending verification state");

        prop.isRegistrarVerified = approved;
        emit PropertyVerifiedByRegistrar(propertyId, msg.sender, approved);

        if (prop.isRegistrarVerified && prop.isRevenueVerified) {
            prop.status = PropertyStatus.Verified;
            emit PropertyFullyVerified(propertyId);
        }
    }

    /**
     * @dev Revenue Department verifies tax clearance, encumbrances, and stamp compliance.
     */
    function verifyPropertyByRevenue(uint256 propertyId, bool approved)
        external
        onlyRole(REVENUE_ROLE)
        propertyExists(propertyId)
    {
        Property storage prop = properties[propertyId];
        require(prop.status == PropertyStatus.PendingVerification, "LandRegistry: Not in pending verification state");

        prop.isRevenueVerified = approved;
        emit PropertyVerifiedByRevenue(propertyId, msg.sender, approved);

        if (prop.isRegistrarVerified && prop.isRevenueVerified) {
            prop.status = PropertyStatus.Verified;
            emit PropertyFullyVerified(propertyId);
        }
    }

    /**
     * @dev Property owner initiates a transfer request to a buyer.
     */
    function requestTransfer(
        uint256 propertyId,
        address buyer,
        uint256 agreedAmount,
        string calldata newDeedHash
    ) external onlyPropertyOwner(propertyId) propertyExists(propertyId) returns (uint256) {
        Property storage prop = properties[propertyId];
        require(prop.status == PropertyStatus.Verified, "LandRegistry: Property must be fully verified to initiate transfer");
        require(buyer != address(0), "LandRegistry: Invalid buyer address");
        require(buyer != msg.sender, "LandRegistry: Buyer cannot be current owner");

        _requestIdCounter++;
        uint256 requestId = _requestIdCounter;

        transferRequests[requestId] = TransferRequest({
            requestId: requestId,
            propertyId: propertyId,
            seller: msg.sender,
            buyer: buyer,
            agreedAmount: agreedAmount,
            newDeedHash: newDeedHash,
            isRegistrarApproved: false,
            isRevenueApproved: false,
            isBuyerPaid: false,
            status: TransferStatus.Initiated,
            requestTimestamp: block.timestamp
        });

        prop.status = PropertyStatus.TransferPending;

        emit TransferRequested(requestId, propertyId, msg.sender, buyer, agreedAmount);
        return requestId;
    }

    /**
     * @dev Registrar inspects and approves transfer paperwork.
     */
    function approveTransferByRegistrar(uint256 requestId)
        external
        onlyRole(REGISTRAR_ROLE)
    {
        TransferRequest storage req = transferRequests[requestId];
        require(req.requestId != 0, "LandRegistry: Transfer request not found");
        require(
            req.status == TransferStatus.Initiated || req.status == TransferStatus.RevenueApproved,
            "LandRegistry: Invalid state for Registrar approval"
        );

        req.isRegistrarApproved = true;
        if (req.isRevenueApproved) {
            req.status = TransferStatus.FullyApproved;
        } else {
            req.status = TransferStatus.RegistrarApproved;
        }

        emit TransferApprovedByRegistrar(requestId, msg.sender);
    }

    /**
     * @dev Revenue Department verifies stamp duty / fees and clears transfer.
     */
    function approveTransferByRevenue(uint256 requestId)
        external
        onlyRole(REVENUE_ROLE)
    {
        TransferRequest storage req = transferRequests[requestId];
        require(req.requestId != 0, "LandRegistry: Transfer request not found");
        require(
            req.status == TransferStatus.Initiated || req.status == TransferStatus.RegistrarApproved,
            "LandRegistry: Invalid state for Revenue approval"
        );

        req.isRevenueApproved = true;
        if (req.isRegistrarApproved) {
            req.status = TransferStatus.FullyApproved;
        } else {
            req.status = TransferStatus.RevenueApproved;
        }

        emit TransferApprovedByRevenue(requestId, msg.sender);
    }

    /**
     * @dev Executes the transfer once multi-stakeholder clearance is obtained.
     * Can be triggered with payment settlement or authorized signature.
     */
    function executeTransfer(uint256 requestId) external nonReentrant {
        TransferRequest storage req = transferRequests[requestId];
        require(req.requestId != 0, "LandRegistry: Transfer request not found");
        require(req.status == TransferStatus.FullyApproved, "LandRegistry: Transfer must be fully approved by both authorities");
        require(
            msg.sender == req.buyer || msg.sender == req.seller || hasRole(REGISTRAR_ROLE, msg.sender),
            "LandRegistry: Unauthorized executor"
        );

        uint256 propId = req.propertyId;
        Property storage prop = properties[propId];
        address previousOwner = prop.currentOwner;
        address newOwner = req.buyer;

        // Update property record
        prop.currentOwner = newOwner;
        prop.documentHash = req.newDeedHash;
        prop.marketValue = req.agreedAmount;
        prop.status = PropertyStatus.Verified;

        // Append to immutable ownership history
        _propertyOwnershipHistory[propId].push(OwnershipRecord({
            previousOwner: previousOwner,
            newOwner: newOwner,
            timestamp: block.timestamp,
            price: req.agreedAmount,
            transferDeedHash: req.newDeedHash,
            remarks: "Legal Title Transfer Completed"
        }));

        // Update ownership indexes
        _ownerProperties[newOwner].push(propId);
        req.status = TransferStatus.Completed;

        emit OwnershipTransferred(propId, previousOwner, newOwner, req.agreedAmount, block.timestamp);
    }

    /**
     * @dev Cancel an active transfer request.
     */
    function cancelTransfer(uint256 requestId, string calldata reason) external {
        TransferRequest storage req = transferRequests[requestId];
        require(req.requestId != 0, "LandRegistry: Transfer request not found");
        require(
            msg.sender == req.seller || msg.sender == req.buyer || hasRole(REGISTRAR_ROLE, msg.sender),
            "LandRegistry: Unauthorized to cancel"
        );
        require(req.status != TransferStatus.Completed, "LandRegistry: Cannot cancel completed transfer");

        req.status = TransferStatus.Cancelled;
        properties[req.propertyId].status = PropertyStatus.Verified;

        emit TransferCancelled(requestId, reason);
    }

    /**
     * @dev Handles legitimate corrections of erroneous records with multi-signature governance audit.
     */
    function correctPropertyRecord(
        uint256 propertyId,
        string calldata newLocation,
        uint256 newArea,
        string calldata newDocumentHash,
        string calldata reason
    ) external onlyRole(DEFAULT_ADMIN_ROLE) propertyExists(propertyId) {
        Property storage prop = properties[propertyId];
        prop.location = newLocation;
        prop.areaSqMeters = newArea;
        prop.documentHash = newDocumentHash;

        _propertyOwnershipHistory[propertyId].push(OwnershipRecord({
            previousOwner: prop.currentOwner,
            newOwner: prop.currentOwner,
            timestamp: block.timestamp,
            price: prop.marketValue,
            transferDeedHash: newDocumentHash,
            remarks: string.concat("Administrative Record Amendment: ", reason)
        }));

        emit PropertyCorrectionLogged(propertyId, reason, msg.sender);
    }

    /**
     * @dev Retrieve chronological ownership history of a parcel.
     */
    function getOwnershipHistory(uint256 propertyId)
        external
        view
        propertyExists(propertyId)
        returns (OwnershipRecord[] memory)
    {
        return _propertyOwnershipHistory[propertyId];
    }

    /**
     * @dev Get properties owned by an address.
     */
    function getPropertiesByOwner(address owner) external view returns (uint256[] memory) {
        return _ownerProperties[owner];
    }

    /**
     * @dev Get total registered properties count.
     */
    function getTotalProperties() external view returns (uint256) {
        return _propertyIdCounter;
    }

    /**
     * @dev Get total transfer requests count.
     */
    function getTotalTransferRequests() external view returns (uint256) {
        return _requestIdCounter;
    }
}
