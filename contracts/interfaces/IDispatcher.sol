// SPDX-License-Identifier: MIT

pragma solidity 0.8.24;

/**
 * @title IDispatcherPrimary interface
 * @author CloudWalk Inc. (See https://www.cloudwalk.io)
 * @dev The primary part of the dispatcher smart contract interface.
 *
 * See details about the contract in the comments of the {IDispatcher} interface.
 */
interface IDispatcherPrimary {
    /**
     * @dev Moves liquidity from a CompoundAgent contract to a liquidity pool of the `CapybaraFinance` protocol.
     *
     * @param amount The amount of liquidity to move.
     * @param compoundAgent The address of the CompoundAgent contract to move liquidity from.
     * @param capybaraLiquidityPool The address of the liquidity pool to move liquidity to.
     */
    function moveLiquidityFromCompoundToCapybara(
        uint256 amount,
        address compoundAgent,
        address capybaraLiquidityPool
    ) external;
}

/**
 * @title IDispatcherConfiguration interface
 * @author CloudWalk Inc. (See https://www.cloudwalk.io)
 * @dev The configuration part of the dispatcher smart contract interface.
 */
interface IDispatcherConfiguration {
    /**
     * @dev Initializes the liquidity mover role for a batch of accounts and
     *      sets the owner role as the admin for the liquidity mover role.
     *
     * @param accounts The addresses of the accounts to initialize the liquidity mover role for.
     */
    function initLiquidityMoverRole(address[] calldata accounts) external;

    /**
     * @dev Removes the liquidity mover role for a batch of accounts
     *      and sets the default role as the admin for the liquidity mover role.
     *
     * @param accounts The addresses of the accounts to remove the liquidity mover role for.
     */
    function removeLiquidityMoverRole(address[] calldata accounts) external;

    /**
     * @dev Transfers ownership of a CompoundAgent contract to a new owner.
     *
     * @param compoundAgent The address of the CompoundAgent contract to transfer ownership for.
     * @param newOwner The address that will become the new owner of the CompoundAgent contract.
     */
    function transferOwnershipForCompoundAgent(address compoundAgent, address newOwner) external;

    /**
     * @dev Configures the admin status for a batch of accounts for a CompoundAgent contract.
     *
     * @param compoundAgent The address of the CompoundAgent contract to configure admin status for.
     * @param newStatus The new admin status to set for the accounts.
     * @param accounts The addresses of the accounts to configure admin status for.
     */
    function configureAdminBatchForCompoundAgent(
        address compoundAgent,
        bool newStatus,
        address[] calldata accounts
    ) external;
}

/**
 * @title IDispatcherErrors interface
 * @author CloudWalk Inc. (See https://www.cloudwalk.io)
 * @dev Defines the custom errors used in the dispatcher contract.
 */
interface IDispatcherErrors {
    /// @dev Thrown if the provided new implementation address is not of a dispatcher contract.
    error Dispatcher_ImplementationAddressInvalid();

    /// @dev Thrown if the provided account address is zero.
    error Dispatcher_AccountAddressZero();
}

/**
 * @title IDispatcher interface
 * @author CloudWalk Inc. (See https://www.cloudwalk.io)
 * @dev The full interface of the dispatcher smart contract.
 */
interface IDispatcher is IDispatcherPrimary, IDispatcherConfiguration, IDispatcherErrors {
    /**
     * @dev Proves the contract is the dispatcher one. A marker function.
     */
    function proveDispatcher() external pure;
}
