// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import { Calendar } from "../libraries/Calendar.sol";

/**
 * @title CalendarMock contract
 * @author CloudWalk Inc. (See https://cloudwalk.io)
 * @dev A simple contract to test the Calendar library.
 */
contract CalendarMock {
    // ------------------ Storage variables ----------------------- //
    /// @dev The last timestamp that was provided as an argument or converted from a date.
    uint256 public lastTimestamp;
    /// @dev The year of the last date that was provided as an argument or converted from a timestamp.
    uint256 public lastYear;
    /// @dev The month of the last date that was provided as an argument or converted from a timestamp.
    uint256 public lastMonth;
    /// @dev The day of the last date that was provided as an argument or converted from a timestamp.
    uint256 public lastDay;

    // ------------------ Constructor ----------------------------- //

    /// @dev Initializes the last values to the maximum possible numbers to warm up the storage.
    constructor() {
        lastTimestamp = type(uint256).max;
        lastYear = type(uint256).max;
        lastMonth = type(uint256).max;
        lastDay = type(uint256).max;
    }

    // ------------------ Transactional Functions ----------------- //

    /**
     * @dev Converts a timestamp to the related date and emits an event with the result.
     * @param timestamp The timestamp to convert.
     */
    function timestampToDate(uint256 timestamp) external {
        (uint256 year, uint256 month, uint256 day) = Calendar.timestampToDate(timestamp);
        lastTimestamp = timestamp;
        lastYear = year;
        lastMonth = month;
        lastDay = day;
    }

    /**
     * @dev Converts a date to the related timestamp and emits an event with the result.
     * @param year The year of the date.
     * @param month The month of the date.
     * @param day The day of the date.
     */
    function dateToTimestamp(uint256 year, uint256 month, uint256 day) external {
        uint256 timestamp = Calendar.dateToTimestamp(year, month, day);
        lastTimestamp = timestamp;
        lastYear = year;
        lastMonth = month;
        lastDay = day;
    }

    // ------------------ View Functions -------------------------- //

    /// @dev Returns the last values stored in the contract.
    /// @return timestamp The last timestamp that was provided as an argument or converted from a date.
    /// @return year The year of the last date that was provided as an argument or converted from a timestamp.
    /// @return month The month of the last date that was provided as an argument or converted from a timestamp.
    /// @return day The day of the last date that was provided as an argument or converted from a timestamp.  
    function getLastValues() external view returns (uint256 timestamp, uint256 year, uint256 month, uint256 day) {
        timestamp = lastTimestamp;
        year = lastYear;
        month = lastMonth;
        day = lastDay;
    }
}
