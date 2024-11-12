// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import { Dispatcher } from "../Dispatcher.sol";

/**
 * @title Dispatcher contract
 * @author CloudWalk Inc. (See https://www.cloudwalk.io)
 * @dev The version of the dispatcher contract with additions required for testing.
 */
contract DispatcherTestable is Dispatcher {
    /**
     * @dev Needed to check that the initialize function of the ancestor contract
     * has the 'onlyInitializing' modifier.
     */
    function call_parent_initialize() public {
        __Dispatcher_init();
    }

    /**
     * @dev Needed to check that the unchained initialize function of the ancestor contract
     * has the 'onlyInitializing' modifier.
     */
    function call_parent_initialize_unchained() public {
        __Dispatcher_init_unchained();
    }
}
