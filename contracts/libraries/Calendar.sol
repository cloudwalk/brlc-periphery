// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

/**
 * @title Calendar library
 * @author CloudWalk Inc. (See https://cloudwalk.io)
 * @dev Defines calendar functions for converting timestamps to dates and back.
 *
 * Inspired by: https://git.musl-libc.org/cgit/musl/tree/src/time/__secs_to_tm.c
 */
library Calendar {
    // ------------------ Constants ------------------------------- //

    // @dev Number of days in 400 years.
    uint256 private constant DAYS_PER_400_YEAR = 365 * 400 + 97;

    /// @dev Number of days in 100 years.
    uint256 private constant DAYS_PER_100_YEAR = 365 * 100 + 24;

    /// @dev Number of days in 4 years.
    uint256 private constant DAYS_PER_4_YEAR = 365 * 4 + 1;

    /// @dev Number of days in a year.
    uint256 private constant DAYS_PER_YEAR = 365;

    /// @dev Number of seconds in a day.
    uint256 private constant SECONDS_IN_DAY = 86400;

    /// @dev Number of months in a year.
    uint256 private constant MONTHS_PER_YEAR = 12;

    /// @dev Base timestamp: 2000-03-01 00:00:00 (mod 400 year, previous date is 29 Feb */
    uint256 private constant BASE_TIMESTAMP = 946684800 + 86400 * (31 + 29);

    /// @dev Base year.
    uint256 private constant BASE_YEAR = 2000;

    /// @dev Last acceptable timestamp: 2399-12-31 23:59:59 GMT
    uint256 private constant LAST_TIMESTAMP = 13569465599;

    /// @dev Byte i corresponds to a month for a rebased day of year with index i.
    bytes private constant MONTH_BY_REBASED_DAY_OF_YEAR =
        hex"030303030303030303030303030303030303030303030303030303030303030404040404040404040404040404040404040404040404040404040404040505050505050505050505050505050505050505050505050505050505050506060606060606060606060606060606060606060606060606060606060607070707070707070707070707070707070707070707070707070707070707080808080808080808080808080808080808080808080808080808080808080909090909090909090909090909090909090909090909090909090909090A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0A0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0B0C0C0C0C0C0C0C0C0C0C0C0C0C0C0C0C0C0C0C0C0C0C0C0C0C0C0C0C0C0C0C0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0D0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E0E";

    /// @dev Byte i corresponds to a day within a month for a rebased day of year with index i.
    bytes private constant DAY_BY_REBASED_DAY_OF_YEAR =
        hex"0102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E1F0102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E0102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E1F0102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E0102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E1F0102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E1F0102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E0102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E1F0102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E0102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E1F0102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D1E1F0102030405060708090A0B0C0D0E0F101112131415161718191A1B1C1D";

    // ------------------ Errors ---------------------------------- //

    /**
     * @dev The provided timestamp is out of range for the date calculation.
     * @param timestamp The timestamp that is out of range.
     */
    error Calendar_TimestampInvalid(uint256 timestamp);

    /**
     * @dev TODO
     */
    error Calendar_DateInvalid(uint256 year, uint256 month, uint256 day);

    // ------------------ Internal functions ---------------------- //

    /**
     * @dev Converts a timestamp to a date.
     *
     * The function accepts timestamp only between 2000-03-01 00:00:00 and 2399-12-31 23:59:59.
     * Otherwise it is reverted with the appropriate error.
     *
     * @param timestamp The timestamp to convert.
     * @return year The year of the date.
     * @return month The month of the date.
     * @return day The day of the date.
     */
    function timestampToDate(uint256 timestamp) internal pure returns (uint256 year, uint256 month, uint256 day) {
        if (timestamp < BASE_TIMESTAMP || timestamp > LAST_TIMESTAMP) {
            revert Calendar_TimestampInvalid(timestamp);
        }

        uint256 remainingDays = (timestamp - BASE_TIMESTAMP) / SECONDS_IN_DAY;

        uint256 centuries = remainingDays / DAYS_PER_100_YEAR;
        remainingDays = remainingDays % DAYS_PER_100_YEAR;

        uint256 yearTetradsInCentury = remainingDays / DAYS_PER_4_YEAR;
        remainingDays = remainingDays % DAYS_PER_4_YEAR;

        year = remainingDays / DAYS_PER_YEAR;
        if (year == 4) {
            --year;
        }

        remainingDays -= year * DAYS_PER_YEAR;
        year += BASE_YEAR + 4 * yearTetradsInCentury + 100 * centuries;

        month = uint256(uint8(MONTH_BY_REBASED_DAY_OF_YEAR[remainingDays]));
        if (month > MONTHS_PER_YEAR) {
            month -= MONTHS_PER_YEAR;
            ++year;
        }
        day = uint256(uint8(DAY_BY_REBASED_DAY_OF_YEAR[remainingDays]));
    }

    /**
     * @dev Converts a date to a timestamp.
     *
     * TODO
     *
     * @param year The year of the date.
     * @param month The month of the date.
     * @param day The day of the date.
     * @return timestamp The resulting timestamp.
     */
    function dateToTimestamp(uint256 year, uint256 month, uint256 day) internal pure returns (uint256 timestamp) {
        if (year < BASE_YEAR || month == 0 || day == 0 || day > 31 || (year == BASE_YEAR && month < 3)) {
            revert Calendar_DateInvalid(year, month, day);
        }

        //
        if (month < 3) {
            year -= 1;
            month += 12;
        }

        uint256 fullYears = year - BASE_YEAR;
        uint256 daysOfFullYears = fullYears * DAYS_PER_YEAR + fullYears / 4 - fullYears / 100 + fullYears / 400;
        uint256 dayOfYear = (153 * (month - 3) + 2) / 5 + day;

        return (daysOfFullYears + dayOfYear - 1) * SECONDS_IN_DAY + BASE_TIMESTAMP;
    }
}
