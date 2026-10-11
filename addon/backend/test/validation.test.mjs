import assert from "node:assert/strict";
import test from "node:test";
import { isAction, isEntityId, isVacuumState } from "../dist/ha.js";

test("accetta solo comandi e ID delle entità vacuum", () => {
  assert.equal(isAction("start"), true);
  assert.equal(isAction("delete"), false);
  assert.equal(isEntityId("vacuum.dreame_d10_plus_gen_2"), true);
  assert.equal(isEntityId("light.living_room"), false);
  assert.equal(isEntityId("vacuum.foo/bar"), false);
});

test("filtra gli stati Home Assistant validi", () => {
  assert.equal(isVacuumState({ entity_id: "vacuum.robot", state: "docked", attributes: {} }), true);
  assert.equal(isVacuumState({ entity_id: "sensor.battery", state: "80", attributes: {} }), false);
});

