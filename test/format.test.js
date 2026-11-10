import test from "node:test";
import assert from "node:assert/strict";
import { formatInput, formatSignedInput, inputNumber } from "../src/format.js";

test("parses formatted amounts", () => assert.equal(inputNumber("1.500.000"), 1500000));
test("formats thousands", () => assert.equal(formatInput("1500000"), "1.500.000"));
test("formats signed amounts", () => assert.equal(formatSignedInput("-500000"), "-500.000"));
