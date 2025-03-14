// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { Calendar } from "../libraries/Calendar.sol";

/**
 * @title CalendarMock contract
 * @author CloudWalk Inc. (See https://cloudwalk.io)
 * @dev A simple contract to test the Calendar library.
 */
contract CalendarMock {
    // ------------------ Events ---------------------------------- //

    /// @dev Emitted when the date calculation function is called with the input timestamp and result.
    event MockTimestampToDateCalled(
        uint256 timestamp, // Tools: this comment prevents Prettier from formatting into a single line.
        uint256 year,
        uint256 month,
        uint256 day
    );

    // ------------------ Transactional Functions ----------------- //

    /**
     * @dev Converts a timestamp to a date and emits an event with the result.
     * @param timestamp The timestamp to convert.
     */
    function timestampToDate(uint256 timestamp) external {
        (uint256 year, uint256 month, uint256 day) = Calendar.timestampToDate(timestamp);
        emit MockTimestampToDateCalled(timestamp, year, month, day);
    }
}
