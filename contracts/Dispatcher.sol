// SPDX-License-Identifier: MIT

pragma solidity 0.8.24;

import { AccessControlExtUpgradeable } from "./base/AccessControlExtUpgradeable.sol";
import { PausableExtUpgradeable } from "./base/PausableExtUpgradeable.sol";
import { RescuableUpgradeable } from "./base/RescuableUpgradeable.sol";
import { Versionable } from "./base/Versionable.sol";
import { UUPSExtUpgradeable } from "./base/UUPSExtUpgradeable.sol";

import { DispatcherStorage } from "./DispatcherStorage.sol";

/// @dev Interface for the CompoundAgent contract with the necessary functions.
interface ICompoundAgent {
    function transferOwnership(address newOwner) external;
    function configureAdmin(address account, bool newStatus) external;
}

/**
 * @title Dispatcher contract
 * @author CloudWalk Inc. (See https://www.cloudwalk.io)
 * @dev The contract that responsible for performing various actions on other contracts.
 */
contract Dispatcher is
    DispatcherStorage,
    AccessControlExtUpgradeable,
    PausableExtUpgradeable,
    RescuableUpgradeable,
    UUPSExtUpgradeable,
    Versionable
{
    // ------------------ Constants ------------------------------- //

    /// @dev The role of this contract owner.
    bytes32 public constant OWNER_ROLE = keccak256("OWNER_ROLE");

    // ------------------ Errors ---------------------------------- //

    /// @dev Thrown if the provided new implementation address is not of a dispatcher contract.
    error Dispatcher_ImplementationAddressInvalid();

    // ------------------ Initializers ---------------------------- //

    /**
     * @dev Initializer of the upgradable contract.
     *
     * See details https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable.
     */
    function initialize() external initializer {
        __Dispatcher_init();
    }

    /**
     * @dev Internal initializer of the upgradable contract.
     *
     * See details https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable.
     */
    function __Dispatcher_init() internal onlyInitializing {
        __Context_init_unchained();
        __ERC165_init_unchained();
        __AccessControl_init_unchained();
        __AccessControlExt_init_unchained();
        __Pausable_init_unchained();
        __PausableExt_init_unchained(OWNER_ROLE);
        __Rescuable_init_unchained(OWNER_ROLE);
        __UUPSUpgradeable_init_unchained();

        __Dispatcher_init_unchained();
    }

    /**
     * @dev Unchained internal initializer of the upgradable contract.
     *
     * See details https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable.
     *
     */
    function __Dispatcher_init_unchained() internal onlyInitializing {
        _setRoleAdmin(OWNER_ROLE, OWNER_ROLE);
        _grantRole(OWNER_ROLE, _msgSender());
    }

    // ------------------ Functions ------------------------------- //

    /**
     * @dev Transfers ownership of a CompoundAgent contract to a new owner.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     * - The caller must have the {OWNER_ROLE} role.
     *
     * @param compoundAgent The address of the CompoundAgent contract to transfer ownership for.
     * @param newOwner The address that will become the new owner of the CompoundAgent contract.
     */
    function transferOwnershipForCompoundAgent(
        address compoundAgent,
        address newOwner
    ) external whenNotPaused onlyRole(OWNER_ROLE) {
        ICompoundAgent(compoundAgent).transferOwnership(newOwner);
    }

    /**
     * @dev Configures the admin status for a batch of accounts for a CompoundAgent contract.
     *
     * Requirements:
     *
     * - The contract must not be paused.
     * - The caller must have the {OWNER_ROLE} role.
     *
     * @param compoundAgent The address of the CompoundAgent contract to configure admin status for.
     * @param newStatus The new admin status to set for the accounts.
     * @param accounts The addresses of the accounts to configure admin status for.
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
