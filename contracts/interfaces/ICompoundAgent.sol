// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

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
