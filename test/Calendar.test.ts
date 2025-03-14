import { ethers } from "hardhat";
import { expect } from "chai";
import { Contract, ContractFactory } from "ethers";

interface Date {
  year: number;
  month: number;
  day: number;
}

function parseDate(datetimeString: string): Date {
  const [year, month, day] = datetimeString.split(/[- ]/).map(Number);
  return { year, month, day };
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
      await executeAndCheck(2082844799, "2036-01-01 23:59:59");
      await executeAndCheck(2085350400, "2036-01-31 00:00:00");
      await executeAndCheck(2085436800, "2036-02-01 00:00:00");
      await executeAndCheck(2087856000, "2036-02-29 00:00:00");
      await executeAndCheck(2087942400, "2036-03-01 00:00:00");
      await executeAndCheck(2090534400, "2036-03-31 00:00:00");
      await executeAndCheck(2090620800, "2036-04-01 00:00:00");
      await executeAndCheck(2093126400, "2036-04-30 00:00:00");
      await executeAndCheck(2093212800, "2036-05-01 00:00:00");
      await executeAndCheck(2095804800, "2036-05-31 00:00:00");
      await executeAndCheck(2095891200, "2036-06-01 00:00:00");
      await executeAndCheck(2098396800, "2036-06-30 00:00:00");
      await executeAndCheck(2098483200, "2036-07-01 00:00:00");
      await executeAndCheck(2101075200, "2036-07-31 00:00:00");
      await executeAndCheck(2101161600, "2036-08-01 00:00:00");
      await executeAndCheck(2103753600, "2036-08-31 00:00:00");
      await executeAndCheck(2103840000, "2036-09-01 00:00:00");
      await executeAndCheck(2106345600, "2036-09-30 00:00:00");
      await executeAndCheck(2106432000, "2036-10-01 00:00:00");
      await executeAndCheck(2109024000, "2036-10-31 00:00:00");
      await executeAndCheck(2109110400, "2036-11-01 00:00:00");
      await executeAndCheck(2111702400, "2036-12-01 00:00:00");
      await executeAndCheck(2114294400, "2036-12-31 00:00:00");
      await executeAndCheck(4102444800, "2100-01-01 00:00:00");
      await executeAndCheck(4107456000, "2100-02-28 00:00:00");
      await executeAndCheck(7258118400, "2200-01-01 00:00:00");
      await executeAndCheck(7263129600, "2200-02-28 00:00:00");
      await executeAndCheck(13542940800, "2399-02-28 00:00:00");
    });

    it.skip("Executes with timestamp of every month", async () => {
      function toUnixTimestamp(year: number, month: number, day: number): number {
        return Math.floor(Date.UTC(year, month - 1, day) / 1000);
      }

      for (let y = 2001; y < 2100; ++y) {
        for (let m = 1; m < 13; ++m) {
          const dateString = "" + y + "-" + m.toString().padStart(2, "0") + "-01 00:00:00";
          const timestamp = toUnixTimestamp(y, m, 1);
          await executeAndCheck(timestamp, dateString);
        }
      }
    });
  });
});
