// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

/**
 * @title Calendar library
 * @author CloudWalk Inc. (See https://cloudwalk.io)
 * @dev Defines calendar functions for converting timestamps to dates and back.
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

    // ------------------ Errors ---------------------------------- //

    /**
     * @dev The provided timestamp is out of range for the date calculation.
     * @param timestamp The timestamp that is out of range.
     */
    error Calendar_TimestampInvalid(uint256 timestamp);

    /**
     * @dev The provided date is invalid.
     * @param year The year of the date.
     * @param month The month of the date.
     * @param day The day of the date.
     */
    error Calendar_DateInvalid(uint256 year, uint256 month, uint256 day);

    // ------------------ Internal functions ---------------------- //

    /**
     * @dev Converts a timestamp to a date.
     *
     * The function accepts timestamp only between 2000-03-01 00:00:00 and 2399-12-31 23:59:59.
     * Otherwise it is reverted with the appropriate error.
     *
     * Implementation notes:
     *
     * 1. The function is based on the idea of initially calculating the date as if the year starts on March 1st,
     * and the month numbers are extended to 14. The month number and year are then adjusted back to
     * the normal January start of the year.
     * Inspired by: https://git.musl-libc.org/cgit/musl/tree/src/time/__secs_to_tm.c
     *
     * 2. The current implementation was chosen as it gives a smaller contract size.
     * But the calculation of `month` and `day` variables in the function can be replaced by a direct mapping search
     * to decrease gas consumption even more at the expense of the contract size.
     *
     * The alternative code might be like:
     *
     * ```solidity
     *     bytes private constant MONTH_BY_REBASED_DAY_OF_YEAR = hex"030303....0E0E0E"; // 366 bytes long
     *     bytes private constant DAY_BY_REBASED_DAY_OF_YEAR = hex"010203....1B1C1D"; // 366 bytes long
     *
     *     ....
     *
     *     month = uint256(uint8(MONTH_BY_REBASED_DAY_OF_YEAR[remainingDays]));
     *     day = uint256(uint8(DAY_BY_REBASED_DAY_OF_YEAR[remainingDays]));
     * ```
     *
     * The proposed replacement will reduce gas consumption by approximately 400,
     * but increase the result contract size by about 0.74 kBytes.
     * Checked on Solidity v.0.8.24 with 1000 cycles of optimization.
     *
     * @param timestamp The timestamp to convert.
     * @return year The year of the date.
     * @return month The month of the date from 1 (January) to 12 (December).
     * @return day The day of the date from 1 to 31.
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
        month = (remainingDays * 5 + 2) / 153  + 3;
        day = remainingDays - (153 * (month - 3) + 2) / 5 + 1;

        // Adjust the month number and year back to the normal January start of the year.
        if (month > MONTHS_PER_YEAR) {
            month -= MONTHS_PER_YEAR;
            ++year;
        }
    }

    /**
     * @dev Converts a date to a timestamp.
     *
     * The function accepts date only after 2000-03-01.
     * The function executes only limited checks for the date validity, so be careful.
     * E.g. you can pass 31 February and get a valid timestamp.
     *
     * @param year The year of the date.
     * @param month The month of the date from 1 (January) to 12 (December).
     * @param day The day of the date from 1 to 31.
     * @return timestamp The resulting timestamp.
     */
    function dateToTimestamp(uint256 year, uint256 month, uint256 day) internal pure returns (uint256 timestamp) {
        if (year < BASE_YEAR || month == 0 || month > 12 || day == 0 || day > 31 || (year == BASE_YEAR && month < 3)) {
            revert Calendar_DateInvalid(year, month, day);
        }

        // Adjust the date as if the year starts on March 1st and extend month numbers to 14.
        // It allows to use a simplified formula for calculating the day of year
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
