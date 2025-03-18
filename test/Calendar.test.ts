import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, ContractFactory } from "ethers";
import { proveTx } from "../test-utils/eth";

interface SimpleDate {
  year: number;
  month: number;
  day: number;
}

// Errors of the contracts under test
const ERROR_NAME_CALENDAR_TIMESTAMP_INVALID = "Calendar_TimestampInvalid";
const ERROR_NAME_CALENDAR_DATE_INVALID = "Calendar_DateInvalid";

function parseDate(datetimeString: string): SimpleDate {
  const [year, month, day] = datetimeString.split(/[- ]/).map(Number);
  return { year, month, day };
}

function toUnixTimestamp(year: number, month: number, day: number): number {
  return Math.floor(Date.UTC(year, month - 1, day) / 1000);
}

function fromUnixTimestamp(timestamp: number): SimpleDate {
  const date = new Date(timestamp * 1000);
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();

  return { year, month, day };
}

describe("Library 'Calendar'", async () => {
  let calendar: Contract;

  before(async () => {
    // Contract factories with the explicitly specified deployer account
    const calendarFactory = await ethers.getContractFactory("CalendarMock") as ContractFactory;
    calendar = await calendarFactory.deploy() as Contract;
  });

  describe("Function 'timestampToDate()'", async () => {
    async function executeAndCheckConversion(timestamp: number, expectedDate: SimpleDate) {
      const tx = calendar.timestampToDate(timestamp);
      await proveTx(tx);
      const actualValues = await calendar.getLastValues();

      expect(actualValues).to.deep.equal([
        timestamp,
        expectedDate.year,
        expectedDate.month,
        expectedDate.day
      ]);
    }

    it("Executes as expected in different cases", async () => {
      await executeAndCheckConversion(951868800, parseDate("2000-03-01 00:00:00"));
      await executeAndCheckConversion(3976300799, parseDate("2096-01-01 23:59:59"));
      await executeAndCheckConversion(3978806400, parseDate("2096-01-31 00:00:00"));
      await executeAndCheckConversion(3978892800, parseDate("2096-02-01 00:00:00"));
      await executeAndCheckConversion(3981312000, parseDate("2096-02-29 00:00:00"));
      await executeAndCheckConversion(3981398400, parseDate("2096-03-01 00:00:00"));
      await executeAndCheckConversion(3983990400, parseDate("2096-03-31 00:00:00"));
      await executeAndCheckConversion(3984076800, parseDate("2096-04-01 00:00:00"));
      await executeAndCheckConversion(3986582400, parseDate("2096-04-30 00:00:00"));
      await executeAndCheckConversion(3986668800, parseDate("2096-05-01 00:00:00"));
      await executeAndCheckConversion(3989260800, parseDate("2096-05-31 00:00:00"));
      await executeAndCheckConversion(3989347200, parseDate("2096-06-01 00:00:00"));
      await executeAndCheckConversion(3991852800, parseDate("2096-06-30 00:00:00"));
      await executeAndCheckConversion(3991939200, parseDate("2096-07-01 00:00:00"));
      await executeAndCheckConversion(3994531200, parseDate("2096-07-31 00:00:00"));
      await executeAndCheckConversion(3994617600, parseDate("2096-08-01 00:00:00"));
      await executeAndCheckConversion(3997209600, parseDate("2096-08-31 00:00:00"));
      await executeAndCheckConversion(3997296000, parseDate("2096-09-01 00:00:00"));
      await executeAndCheckConversion(3999801600, parseDate("2096-09-30 00:00:00"));
      await executeAndCheckConversion(3999888000, parseDate("2096-10-01 00:00:00"));
      await executeAndCheckConversion(4002480000, parseDate("2096-10-31 00:00:00"));
      await executeAndCheckConversion(4002566400, parseDate("2096-11-01 00:00:00"));
      await executeAndCheckConversion(4005158400, parseDate("2096-12-01 00:00:00"));
      await executeAndCheckConversion(4007750400, parseDate("2096-12-31 00:00:00"));
      await executeAndCheckConversion(4107456000, parseDate("2100-02-28 00:00:00"));
      await executeAndCheckConversion(4107542400, parseDate("2100-03-01 00:00:00"));
      await executeAndCheckConversion(4133894400, parseDate("2100-12-31 00:00:00"));
      await executeAndCheckConversion(7263129600, parseDate("2200-02-28 00:00:00"));
      await executeAndCheckConversion(7263216000, parseDate("2200-03-01 00:00:00"));
      await executeAndCheckConversion(7289568000, parseDate("2200-12-31 00:00:00"));
      await executeAndCheckConversion(13448332800, parseDate("2396-02-29 00:00:00"));
      await executeAndCheckConversion(13448419200, parseDate("2396-03-01 00:00:00"));
      await executeAndCheckConversion(13474771200, parseDate("2396-12-31 00:00:00"));
      await executeAndCheckConversion(13569379200, parseDate("2399-12-31 00:00:00"));
    });

    // This test is long and detailed, so it is skipped by default. It is intended for one-time checking if needed
    it.skip("Executes as expected for every day in special date ranges", async () => {
      async function checkForTimestampRange(props: { startTimestamp: number; lastTimestamp: number }) {
        for (let timestamp = props.startTimestamp; timestamp <= props.lastTimestamp; timestamp += 86400) {
          const date: SimpleDate = fromUnixTimestamp(timestamp);
          await executeAndCheckConversion(timestamp, date);
        }
      }

      await checkForTimestampRange({
        startTimestamp: 951868800, // 2000-03-01 00:00:00
        lastTimestamp: 1109635200 // 2005-03-01 00:00:00
      });

      await checkForTimestampRange({
        startTimestamp: 2498169600, // 2049-03-01 00:00:00
        lastTimestamp: 2561241600 // 2051-03-01 00:00:00
      });

      await checkForTimestampRange({
        startTimestamp: 4076006400, // 2099-03-01 00:00:00
        lastTimestamp: 4139078400 // 2101-03-01 00:00:00
      });

      await checkForTimestampRange({
        startTimestamp: 10387353600, // 2299-03-01 00:00:00
        lastTimestamp: 10450425600 // 2301-03-01 00:00:00
      });

      await checkForTimestampRange({
        startTimestamp: 13506307200, // 2397-12-31 00:00:00
        lastTimestamp: 13569379200 // 2399-12-31 00:00:00
      });
    });

    it("Executes if a timestamp is out of range", async () => {
      let timestamp = toUnixTimestamp(2000, 2, 29) + 24 * 60 * 60 - 1;
      await expect(calendar.timestampToDate(timestamp))
        .to.revertedWithCustomError(calendar, ERROR_NAME_CALENDAR_TIMESTAMP_INVALID)
        .withArgs(timestamp);

      timestamp = toUnixTimestamp(2400, 1, 1);
      await expect(calendar.timestampToDate(timestamp))
        .to.revertedWithCustomError(calendar, ERROR_NAME_CALENDAR_TIMESTAMP_INVALID)
        .withArgs(timestamp);
    });
  });

  describe("Function 'dateToTimestamp()'", async () => {
    async function executeAndCheckInverseConversion(expectedTimestamp: number, date: SimpleDate) {
      const tx = calendar.dateToTimestamp(date.year, date.month, date.day);
      await proveTx(tx);
      const actualValues = await calendar.getLastValues();

      expect(actualValues).to.deep.equal([
        expectedTimestamp,
        date.year,
        date.month,
        date.day
      ]);
    }

    it("Executes as expected in different cases", async () => {
      await executeAndCheckInverseConversion(951868800, parseDate("2000-03-01 00:00:00"));
      await executeAndCheckInverseConversion(3976214400, parseDate("2096-01-01 00:00:00"));
      await executeAndCheckInverseConversion(3978806400, parseDate("2096-01-31 00:00:00"));
      await executeAndCheckInverseConversion(3978892800, parseDate("2096-02-01 00:00:00"));
      await executeAndCheckInverseConversion(3981312000, parseDate("2096-02-29 00:00:00"));
      await executeAndCheckInverseConversion(3981398400, parseDate("2096-03-01 00:00:00"));
      await executeAndCheckInverseConversion(3983990400, parseDate("2096-03-31 00:00:00"));
      await executeAndCheckInverseConversion(3984076800, parseDate("2096-04-01 00:00:00"));
      await executeAndCheckInverseConversion(3986582400, parseDate("2096-04-30 00:00:00"));
      await executeAndCheckInverseConversion(3986668800, parseDate("2096-05-01 00:00:00"));
      await executeAndCheckInverseConversion(3989260800, parseDate("2096-05-31 00:00:00"));
      await executeAndCheckInverseConversion(3989347200, parseDate("2096-06-01 00:00:00"));
      await executeAndCheckInverseConversion(3991852800, parseDate("2096-06-30 00:00:00"));
      await executeAndCheckInverseConversion(3991939200, parseDate("2096-07-01 00:00:00"));
      await executeAndCheckInverseConversion(3994531200, parseDate("2096-07-31 00:00:00"));
      await executeAndCheckInverseConversion(3994617600, parseDate("2096-08-01 00:00:00"));
      await executeAndCheckInverseConversion(3997209600, parseDate("2096-08-31 00:00:00"));
      await executeAndCheckInverseConversion(3997296000, parseDate("2096-09-01 00:00:00"));
      await executeAndCheckInverseConversion(3999801600, parseDate("2096-09-30 00:00:00"));
      await executeAndCheckInverseConversion(3999888000, parseDate("2096-10-01 00:00:00"));
      await executeAndCheckInverseConversion(4002480000, parseDate("2096-10-31 00:00:00"));
      await executeAndCheckInverseConversion(4002566400, parseDate("2096-11-01 00:00:00"));
      await executeAndCheckInverseConversion(4005158400, parseDate("2096-12-01 00:00:00"));
      await executeAndCheckInverseConversion(4007750400, parseDate("2096-12-31 00:00:00"));
      await executeAndCheckInverseConversion(4107456000, parseDate("2100-02-28 00:00:00"));
      await executeAndCheckInverseConversion(4107542400, parseDate("2100-03-01 00:00:00"));
      await executeAndCheckInverseConversion(4133894400, parseDate("2100-12-31 00:00:00"));
      await executeAndCheckInverseConversion(7263129600, parseDate("2200-02-28 00:00:00"));
      await executeAndCheckInverseConversion(7263216000, parseDate("2200-03-01 00:00:00"));
      await executeAndCheckInverseConversion(7289568000, parseDate("2200-12-31 00:00:00"));
      await executeAndCheckInverseConversion(13448332800, parseDate("2396-02-29 00:00:00"));
      await executeAndCheckInverseConversion(13448419200, parseDate("2396-03-01 00:00:00"));
      await executeAndCheckInverseConversion(13474771200, parseDate("2396-12-31 00:00:00"));
      await executeAndCheckInverseConversion(13569379200, parseDate("2399-12-31 00:00:00"));
    });

    // This test is long and detailed, so it is skipped by default. It is intended for one-time checking if needed
    it.skip("Executes as expected for every day in special date ranges", async () => {
      async function checkForTimestampRange(props: { startTimestamp: number; lastTimestamp: number }) {
        for (let timestamp = props.startTimestamp; timestamp <= props.lastTimestamp; timestamp += 86400) {
          const date: SimpleDate = fromUnixTimestamp(timestamp);
          await executeAndCheckInverseConversion(timestamp, date);
        }
      }

      await checkForTimestampRange({
        startTimestamp: 951868800, // 2000-03-01 00:00:00
        lastTimestamp: 1109635200 // 2005-03-01 00:00:00
      });

      await checkForTimestampRange({
        startTimestamp: 2498169600, // 2049-03-01 00:00:00
        lastTimestamp: 2561241600 // 2051-03-01 00:00:00
      });

      await checkForTimestampRange({
        startTimestamp: 4076006400, // 2099-03-01 00:00:00
        lastTimestamp: 4139078400 // 2101-03-01 00:00:00
      });

      await checkForTimestampRange({
        startTimestamp: 10387353600, // 2299-03-01 00:00:00
        lastTimestamp: 10450425600 // 2301-03-01 00:00:00
      });

      await checkForTimestampRange({
        startTimestamp: 13543027200, // 2399-03-01 00:00:00
        lastTimestamp: 13606185600 // 2401-03-01 00:00:00
      });
    });

    it("Executes if a date is invalid", async () => {
      // The year is less than 2000
      let date: SimpleDate = parseDate("1999-03-01");
      await expect(calendar.dateToTimestamp(date.year, date.month, date.day))
        .to.revertedWithCustomError(calendar, ERROR_NAME_CALENDAR_DATE_INVALID)
        .withArgs(date.year, date.month, date.day);

      // The month is zero
      date = parseDate("2000-00-29");
      await expect(calendar.dateToTimestamp(date.year, date.month, date.day))
        .to.revertedWithCustomError(calendar, ERROR_NAME_CALENDAR_DATE_INVALID)
        .withArgs(date.year, date.month, date.day);

      // The month is greater than 12
      date = parseDate("2000-13-01");
      await expect(calendar.dateToTimestamp(date.year, date.month, date.day))
        .to.revertedWithCustomError(calendar, ERROR_NAME_CALENDAR_DATE_INVALID)
        .withArgs(date.year, date.month, date.day);

      // The day is zero
      date = parseDate("2000-03-00");
      await expect(calendar.dateToTimestamp(date.year, date.month, date.day))
        .to.revertedWithCustomError(calendar, ERROR_NAME_CALENDAR_DATE_INVALID)
        .withArgs(date.year, date.month, date.day);

      // The day is greater than 31
      date = parseDate("2000-03-32");
      await expect(calendar.dateToTimestamp(date.year, date.month, date.day))
        .to.revertedWithCustomError(calendar, ERROR_NAME_CALENDAR_DATE_INVALID)
        .withArgs(date.year, date.month, date.day);

      // The date is earlier than 2000-03-01
      date = parseDate("2000-02-29");
      await expect(calendar.dateToTimestamp(date.year, date.month, date.day))
        .to.revertedWithCustomError(calendar, ERROR_NAME_CALENDAR_DATE_INVALID)
        .withArgs(date.year, date.month, date.day);
    });
  });
});
