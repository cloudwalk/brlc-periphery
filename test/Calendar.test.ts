import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, ContractFactory } from "ethers";

interface Date {
  year: number;
  month: number;
  day: number;
}

// Errors of the contracts under test
const ERROR_NAME_CALENDAR_TIMESTAMP_INVALID = "Calendar_TimestampInvalid";

function parseDate(datetimeString: string): Date {
  const [year, month, day] = datetimeString.split(/[- ]/).map(Number);
  return { year, month, day };
}

function toUnixTimestamp(year: number, month: number, day: number): number {
  return Math.floor(Date.UTC(year, month - 1, day) / 1000);
}

describe("Library 'Dispatcher'", async () => {
  let calendar: Contract;

  before(async () => {
    // Contract factories with the explicitly specified deployer account
    const calendarFactory = await ethers.getContractFactory("CalendarMock") as ContractFactory;
    calendar = await calendarFactory.deploy() as Contract;
  });

  describe("Function 'timestampToDate()'", async () => {
    async function executeAndCheck(timestamp: number, expectedDateString: string) {
      const expectedDate: Date = parseDate(expectedDateString);
      const tx = calendar.timestampToDate(timestamp);
      await expect(tx).to.emit(calendar, "MockTimestampToDateCalled").withArgs(
        timestamp,
        expectedDate.year,
        expectedDate.month,
        expectedDate.day
      );
    }

    it("Executes as expected in different cases", async () => {
      await executeAndCheck(951868800, "2000-03-01 00:00:00");
      await executeAndCheck(3976300799, "2096-01-01 23:59:59");
      await executeAndCheck(3978806400, "2096-01-31 00:00:00");
      await executeAndCheck(3978892800, "2096-02-01 00:00:00");
      await executeAndCheck(3981312000, "2096-02-29 00:00:00");
      await executeAndCheck(3981398400, "2096-03-01 00:00:00");
      await executeAndCheck(3983990400, "2096-03-31 00:00:00");
      await executeAndCheck(3984076800, "2096-04-01 00:00:00");
      await executeAndCheck(3986582400, "2096-04-30 00:00:00");
      await executeAndCheck(3986668800, "2096-05-01 00:00:00");
      await executeAndCheck(3989260800, "2096-05-31 00:00:00");
      await executeAndCheck(3989347200, "2096-06-01 00:00:00");
      await executeAndCheck(3991852800, "2096-06-30 00:00:00");
      await executeAndCheck(3991939200, "2096-07-01 00:00:00");
      await executeAndCheck(3994531200, "2096-07-31 00:00:00");
      await executeAndCheck(3994617600, "2096-08-01 00:00:00");
      await executeAndCheck(3997209600, "2096-08-31 00:00:00");
      await executeAndCheck(3997296000, "2096-09-01 00:00:00");
      await executeAndCheck(3999801600, "2096-09-30 00:00:00");
      await executeAndCheck(3999888000, "2096-10-01 00:00:00");
      await executeAndCheck(4002480000, "2096-10-31 00:00:00");
      await executeAndCheck(4002566400, "2096-11-01 00:00:00");
      await executeAndCheck(4005158400, "2096-12-01 00:00:00");
      await executeAndCheck(4007750400, "2096-12-31 00:00:00");
      await executeAndCheck(4102444800, "2100-01-01 00:00:00");
      await executeAndCheck(4107456000, "2100-02-28 00:00:00");
      await executeAndCheck(4133894400, "2100-12-31 00:00:00");
      await executeAndCheck(7258118400, "2200-01-01 00:00:00");
      await executeAndCheck(7263129600, "2200-02-28 00:00:00");
      await executeAndCheck(7289568000, "2200-12-31 00:00:00");
      await executeAndCheck(13443235200, "2396-01-01 00:00:00");
      await executeAndCheck(13448332800, "2396-02-29 00:00:00");
      await executeAndCheck(13474771200, "2396-12-31 00:00:00");
      await executeAndCheck(13542940800, "2399-02-28 00:00:00");
      await executeAndCheck(13569379200, "2399-12-31 00:00:00");
    });

    // This test is long and detailed, so it is skipped by default. It is intended for one-time checking if needed
    it.skip("Executes with timestamp of every month", async () => {
      let d = 1;
      for (let y = 2001; y < 2400; ++y) {
        for (let m = 1; m < 13; ++m) {
          const dateString =
            "" + y + "-" + m.toString().padStart(2, "0") +
            "-" + d.toString().padStart(2, "0") +
            " 00:00:00";
          const timestamp = toUnixTimestamp(y, m, d);
          await executeAndCheck(timestamp, dateString);
          ++d;
          if (d > 28) {
            d = 1;
          }
        }
      }
    });

    it("Executes if a timestamp is our of range", async () => {
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
});
