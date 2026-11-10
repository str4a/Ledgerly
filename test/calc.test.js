import test from "node:test";
import assert from "node:assert/strict";
import { convertAmount, expectancy, maxDrawdown, profitFactor, winRate } from "../src/calc.js";

test("calculates win rate", () => assert.equal(winRate([10, -5, 2]), 66.66666666666666));
test("calculates profit factor", () => assert.equal(profitFactor([10, -5, 2]), 2.4));
test("calculates expectancy", () => assert.equal(expectancy([10, -5, 2]), 7 / 3));
test("calculates max drawdown", () => assert.equal(maxDrawdown([10, -5, -10, 20]), 150));
test("converts USD to IDR", () => assert.equal(convertAmount(10, "USD", 15000), 150000));
