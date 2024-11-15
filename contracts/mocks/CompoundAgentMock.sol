// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @title CompoundAgentMock contract
 * @author CloudWalk Inc. (See https://cloudwalk.io)
 * @dev A simplified version of the CompoundAgent contract to use in tests for other contracts.
 */
contract CompoundAgentMock {
    /// @dev The counter of the `configureAdmin()` function calls.
    uint256 public configureAdminCallCounter;

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

    /// @dev Imitates the same-name function of the CompoundAgent interface. Just emits an event about the call.
    function transferOwnership(address newOwner) external {
        emit MockTransferOwnershipCalled(newOwner);
    }

    /// @dev Imitates the same-name function of the CompoundAgent interface. Just emits an event about the call.
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
}
