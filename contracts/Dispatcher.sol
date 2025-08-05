// SPDX-License-Identifier: MIT

pragma solidity 0.8.24;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import { AccessControlExtUpgradeable } from "./base/AccessControlExtUpgradeable.sol";
import { PausableExtUpgradeable } from "./base/PausableExtUpgradeable.sol";
import { RescuableUpgradeable } from "./base/RescuableUpgradeable.sol";
import { Versionable } from "./base/Versionable.sol";
import { UUPSExtUpgradeable } from "./base/UUPSExtUpgradeable.sol";

import { DispatcherStorage } from "./DispatcherStorage.sol";
import { IDispatcher, IDispatcherConfiguration, IDispatcherPrimary } from "./interfaces/IDispatcher.sol";

/**
 * @title ICompoundAgent interface
 * @author CloudWalk Inc. (See https://www.cloudwalk.io)
 * @dev Interface for the CompoundAgent contract with the necessary functions.
 */
interface ICompoundAgent {
    function transferOwnership(address newOwner) external;
    function configureAdmin(address account, bool newStatus) external;
    function redeemUnderlying(uint256 redeemAmount) external;
}

/**
 * @title ILiquidityPool interface
 * @author CloudWalk Inc. (See https://www.cloudwalk.io)
 * @dev Interface for the liquidity pool contract from the `CapybaraFinance` protocol with the necessary functions.
 */
interface ILiquidityPool {
    function deposit(uint256 amount) external;
    function token() external view returns (address);
}

/**
 * @title Dispatcher contract
 * @author CloudWalk Inc. (See https://www.cloudwalk.io)
 * @dev The contract that is responsible for performing various actions on other contracts.
 */
contract Dispatcher is
    DispatcherStorage,
    AccessControlExtUpgradeable,
    PausableExtUpgradeable,
    RescuableUpgradeable,
    UUPSExtUpgradeable,
    IDispatcher,
    Versionable
{
    // ------------------ Constants ------------------------------- //

    /// @dev The role of a liquidity mover that is allowed to move liquidity from Compound to Capybara.
    bytes32 public constant LIQUIDITY_MOVER_ROLE = keccak256("LIQUIDITY_MOVER_ROLE");

    // ------------------ Constructor ----------------------------- //

    /**
     * @dev Constructor that prohibits the initialization of the implementation of the upgradeable contract.
     *
     * See details:
     * https://docs.openzeppelin.com/upgrades-plugins/writing-upgradeable#initializing_the_implementation_contract
     *
     * @custom:oz-upgrades-unsafe-allow constructor
     */
    constructor() {
        _disableInitializers();
    }

    // ------------------ Initializers ---------------------------- //

    /**
     * @dev Initializer of the upgradeable contract.
     *
     * See details: https://docs.openzeppelin.com/upgrades-plugins/writing-upgradeable
     */
    function initialize() external initializer {
        __AccessControlExt_init_unchained();
        __PausableExt_init_unchained();
        __Rescuable_init_unchained();
        __UUPSExt_init_unchained(); // This is needed only to avoid errors during coverage assessment

        _grantRole(OWNER_ROLE, _msgSender());
    }

    // ------------------ Transactional functions ----------------- //

    /**
     * @inheritdoc IDispatcherConfiguration
     * @dev Requirements:
     *
     * - The caller must have the {OWNER_ROLE} role.
     *
     */
    function initLiquidityMoverRole(address[] calldata accounts) external onlyRole(OWNER_ROLE) {
        _setRoleAdmin(LIQUIDITY_MOVER_ROLE, GRANTOR_ROLE);
        uint256 len = accounts.length;
        for (uint256 i = 0; i < len; ++i) {
            address account = accounts[i];
            if (account == address(0)) {
                revert Dispatcher_AccountAddressZero();
            }
            _grantRole(LIQUIDITY_MOVER_ROLE, account);
        }
    }

    /**
     * @inheritdoc IDispatcherConfiguration
     * @dev Requirements:
     *
     * - The caller must have the {OWNER_ROLE} role.
     */
    function removeLiquidityMoverRole(address[] calldata accounts) external onlyRole(OWNER_ROLE) {
        uint256 len = accounts.length;
        for (uint256 i = 0; i < len; ++i) {
            address account = accounts[i];
            if (account == address(0)) {
                revert Dispatcher_AccountAddressZero();
            }
            _revokeRole(LIQUIDITY_MOVER_ROLE, account);
        }
        _setRoleAdmin(LIQUIDITY_MOVER_ROLE, DEFAULT_ADMIN_ROLE);
    }

    /**
     * @inheritdoc IDispatcherConfiguration
     * @dev Requirements:
     *
     * - The contract must not be paused.
     * - The caller must have the {OWNER_ROLE} role.
     *
     */
    function transferOwnershipForCompoundAgent(
        address compoundAgent,
        address newOwner
    ) external whenNotPaused onlyRole(OWNER_ROLE) {
        ICompoundAgent(compoundAgent).transferOwnership(newOwner);
    }

    /**
     * @inheritdoc IDispatcherConfiguration
     * @dev Requirements:
     *
     * - The contract must not be paused.
     * - The caller must have the {OWNER_ROLE} role.
     */
    function configureAdminBatchForCompoundAgent(
        address compoundAgent,
        bool newStatus,
        address[] calldata accounts
    ) external whenNotPaused onlyRole(OWNER_ROLE) {
        uint256 counter = accounts.length;
        for (uint256 i = 0; i < counter; ++i) {
            ICompoundAgent(compoundAgent).configureAdmin(accounts[i], newStatus);
        }
    }

    /**
     * @inheritdoc IDispatcherPrimary
     * @dev Requirements:
     *
     * - The contract must not be paused.
     * - The caller must have the {LIQUIDITY_MOVER_ROLE} role.
     *
     */
    function moveLiquidityFromCompoundToCapybara(
        uint256 amount,
        address compoundAgent,
        address capybaraLiquidityPool
    ) external whenNotPaused onlyRole(LIQUIDITY_MOVER_ROLE) {
        address underlyingToken = ILiquidityPool(capybaraLiquidityPool).token();
        ICompoundAgent(compoundAgent).redeemUnderlying(amount);
        IERC20(underlyingToken).transferFrom(compoundAgent, address(this), amount);
        IERC20(underlyingToken).approve(capybaraLiquidityPool, amount);
        ILiquidityPool(capybaraLiquidityPool).deposit(amount);
    }

    // ------------------ Pure functions -------------------------- //

    /**
     * @dev Proves the contract is the dispatcher one. A marker function.
     */
    function proveDispatcher() external pure {}

    // ------------------ Internal functions ---------------------- //

    /**
     * @dev The upgrade validation function for the UUPSExtUpgradeable contract.
     * @param newImplementation The address of the new implementation.
     */
    function _validateUpgrade(address newImplementation) internal view override onlyRole(OWNER_ROLE) {
        try Dispatcher(newImplementation).proveDispatcher() {} catch {
            revert Dispatcher_ImplementationAddressInvalid();
        }
    }

    // ------------------ Service functions ----------------------- //

    /**
     * @dev The version of the standard upgrade function without the second parameter for backward compatibility.
     * @custom:oz-upgrades-unsafe-allow-reachable delegatecall
     */
    function upgradeTo(address newImplementation) external {
        upgradeToAndCall(newImplementation, "");
    }
}
