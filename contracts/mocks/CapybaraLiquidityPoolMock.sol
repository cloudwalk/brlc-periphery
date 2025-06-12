// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title CapybaraLiquidityPoolMock contract
 * @author CloudWalk Inc. (See https://www.cloudwalk.io)
 * @dev A simplified version of the liquidity pool smart contract of the `CapybaraFinance` protocol
 *      to use in tests for other contracts.
 */
contract CapybaraLiquidityPoolMock {
    /// @dev The address of the underlying token.
    address public underlyingToken;

    // ------------------ Events ---------------------------------- //

    /// @dev Emitted when the `deposit()` function is called with the parameters of the function.
    event MockDepositCalled(
        uint256 amount
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
     * @dev Imitates the same-name function of the liquidity pool of the `CapybaraFinance` protocol.
     * @param amount The amount of the underlying token to deposit.
     */
    function deposit(uint256 amount) external {
        emit MockDepositCalled(amount);
        IERC20(underlyingToken).transferFrom(msg.sender, address(this), amount);
    }

    /**
     * @dev Imitates the same-name function of the liquidity pool of the `CapybaraFinance` protocol.
     * @return The address of the underlying token.
     */
    function token() external view returns (address) {
        return underlyingToken;
    }
}
