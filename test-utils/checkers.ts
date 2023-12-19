import { expect } from "chai";

export interface EventFieldCheckingOptions {
  showValuesInErrorMessage?: boolean
  caseInsensitiveComparison?: boolean
}

function checkEventField(
  fieldName: string,
  expectedValue: any,
  options: EventFieldCheckingOptions = {}
): (value: any) => boolean {
  const f = function (value: any): boolean {
    let errorMessage = `The "${fieldName}" field of the event is wrong`;
    if (options.showValuesInErrorMessage) {
      errorMessage += ` (actual: ${value} ; expected: ${expectedValue})`;
    }
    if (options.caseInsensitiveComparison) {
      value = value.toString().toLowerCase();
      expectedValue = expectedValue.toString().toLowerCase();
    }
    expect(value).to.equal(expectedValue, errorMessage);
    return true;
  };
  Object.defineProperty(f, "name", { value: `checkEventField_${fieldName}`, writable: false });
  return f;
}

function checkEventFieldNotEqual(
  fieldName: string,
  notExpectedValue: any,
  options: EventFieldCheckingOptions = {}
): (value: any) => boolean {
  const f = function (value: any): boolean {
    let errorMessage =
      `The "${fieldName}" field of the event is wrong because it is equal ${notExpectedValue} but should not`;
    if (options.showValuesInErrorMessage) {
      errorMessage += ` (actual: ${value} ; not expected: ${notExpectedValue})`;
    }
    if (options.caseInsensitiveComparison) {
      value = value.toString().toLowerCase();
      notExpectedValue = notExpectedValue.toString().toLowerCase();
    }
    expect(value).not.to.equal(notExpectedValue, errorMessage);
    return true;
  };
  Object.defineProperty(f, "name", { value: `checkEventFieldNot_${fieldName}`, writable: false });
  return f;
}

export {
  checkEventField,
  checkEventFieldNotEqual
};
