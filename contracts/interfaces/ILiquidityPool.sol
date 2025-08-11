// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @title ILiquidityPool interface
 * @author CloudWalk Inc. (See https://www.cloudwalk.io)
 * @dev Interface for the liquidity pool contract from the `CapybaraFinance` protocol with the necessary functions.
 */
interface ILiquidityPool {
    function deposit(uint256 amount) external;
    function token() external view returns (address);
}
