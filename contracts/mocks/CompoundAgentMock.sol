// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { ERC20TokenMock } from "./tokens/ERC20TokenMock.sol";

/**
 * @title CompoundAgentMock contract
 * @author CloudWalk Inc. (See https://cloudwalk.io)
 * @dev A simplified version of the CompoundAgent contract to use in tests for other contracts.
 */
contract CompoundAgentMock {
    /// @dev The owner of the contract.
    address public owner;

    /// @dev The counter of the `configureAdmin()` function calls.
    uint256 public configureAdminCallCounter;

    /// @dev The address of the underlying token.
    address public underlyingToken;

    // ------------------ Events ---------------------------------- //

    /// @dev Emitted when the `transferOwnership()` function is called with the parameters of the function.
    event MockTransferOwnershipCalled(
        address newOwner
    );

    /// @dev Emitted when the `configureAdmin()` function is called with the parameters of the function and the counter
    event MockConfigureAdminCalled(
        address account,
        bool newStatus,
        uint256 configureAdminCallCounter
    );

    /// @dev Emitted when the `redeemUnderlying()` function is called with the parameters of the function
    event MockRedeemUnderlyingCalled(
        uint256 redeemAmount
    );

    // ------------------ Constructor ----------------------------- //

    /**
     * @dev The constructor of the contract.
     * @param underlyingToken_ The address of the underlying token.
     */
    constructor(address underlyingToken_) {
        underlyingToken = underlyingToken_;
    }

    // ------------------ Transactional functions ----------------- //

    /**
     * @dev Imitates the same-name function of the CompoundAgent smart-contract.
     *
     * Just emits an event about the call and manage allowance for token transfers from the contract.
     *
     * @param newOwner The address of the new owner.
     */
    function transferOwnership(address newOwner) external {
        emit MockTransferOwnershipCalled(newOwner);
        address oldOwner = owner;
        owner = newOwner;
        if (oldOwner != address(0)) {
            ERC20TokenMock(underlyingToken).approve(oldOwner, 0);
        }
        if (newOwner != address(0)) {
            ERC20TokenMock(underlyingToken).approve(newOwner, type(uint256).max);
        }
    }

    /**
     * @dev Imitates the same-name function of the CompoundAgent smart-contract. Just emits an event about the call.
     * @param account The address of the account to configure.
     * @param newStatus The new status of the account.
     */
    function configureAdmin(
        address account,
        bool newStatus
    ) external {
        ++configureAdminCallCounter;
        emit MockConfigureAdminCalled(
            account,
            newStatus,
            configureAdminCallCounter
        );
    }

    /**
     * @dev Imitates the same-name function of the CompoundAgent smart-contract.
     * @param redeemAmount The amount of the underlying token to redeem.
     */
    function redeemUnderlying(uint256 redeemAmount) external {
        emit MockRedeemUnderlyingCalled(redeemAmount);
        ERC20TokenMock(underlyingToken).mint(address(this), redeemAmount);
    }
}
