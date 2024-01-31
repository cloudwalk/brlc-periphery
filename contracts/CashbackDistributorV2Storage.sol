// SPDX-License-Identifier: MIT

pragma solidity 0.8.16;

import { EnumerableSetUpgradeable } from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import { ICashbackDistributorV2Types } from "./interfaces/ICashbackDistributorV2.sol";

/**
 * @title CashbackDistributorV2 storage version 1
 */
abstract contract CashbackDistributorV2StorageV1 is ICashbackDistributorV2Types {
    /// @dev The enable flag of the cashback operations.
    bool internal _enabled;

    /// @dev The nonce of the next cashback operation.
    uint256 internal _nextNonce;

    /// @dev The mapping of a cashback structure for a given cashback nonce.
    mapping(uint256 => Cashback) internal _cashbacks;

    /// @dev The mapping of an account cashback structure for a given token address and account address.
    mapping(address => mapping(address => AccountCashbackState)) internal _accountCashbackStates;

    /// @dev Mapping of a nonce collection of all the cashback operations for a given external cashback identifier.
    mapping(bytes32 => uint256[]) internal _nonceCollectionByExternalId;

    /// @dev Mapping of a total amount of success cashback operations for a given token and an external identifier.
    mapping(address => mapping(bytes32 => uint256)) internal _totalCashbackByTokenAndExternalId;
}

/**
 * @title CashbackDistributorV2 storage
 * @dev Contains storage variables of the {CashbackDistributorV2} contract.
 *
 * We are following Compound's approach of upgrading new contract implementations.
 * See https://github.com/compound-finance/compound-protocol.
 * When we need to add new storage variables, we create a new version of CashbackDistributorV2Storage
 * e.g. CashbackDistributorV2Storage<versionNumber>, so finally it would look like
 * "contract CashbackDistributorV2Storage is CashbackDistributorV2StorageV1, CashbackDistributorV2StorageV2".
 */
abstract contract CashbackDistributorV2Storage is CashbackDistributorV2StorageV1 {}
