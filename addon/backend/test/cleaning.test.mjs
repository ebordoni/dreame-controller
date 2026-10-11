import assert from "node:assert/strict";
import test from "node:test";
import { isCleaningSettings, makeCleaningPayload, roomsFor } from "../dist/cleaning.js";

test("legge solo le stanze della mappa selezionata", () => {
  const state = {
    attributes: {
      selected_map: "Piano 2",
      rooms: {
        "Piano 1": [{ id: 1, name: "Soggiorno" }],
        "Piano 2": [{ id: 4, name: "Camera" }, { id: -1, name: "Errata" }],
      },
    },
  };
  assert.deepEqual(roomsFor(state), [{ id: 4, name: "Camera" }]);
});

test("accetta solo potenze e passate supportate", () => {
  assert.equal(isCleaningSettings({ suctionLevel: 0, repeats: 3 }), true);
  assert.equal(isCleaningSettings({ suctionLevel: 3, repeats: 1 }), true);
  assert.equal(isCleaningSettings({ suctionLevel: 4, repeats: 1 }), false);
  assert.equal(isCleaningSettings({ suctionLevel: 1, repeats: 0 }), false);
  assert.equal(isCleaningSettings({ suctionLevel: "1", repeats: 2 }), false);
});

test("mantiene l'allineamento dei parametri per ciascuna stanza", () => {
  assert.deepEqual(makeCleaningPayload("vacuum.robot", [
    { id: 2, suctionLevel: 1, repeats: 2 },
    { id: 5, suctionLevel: 3, repeats: 1 },
  ]), {
    entity_id: "vacuum.robot",
    segments: [2, 5],
    suction_level: [1, 3],
    repeats: [2, 1],
  });
  assert.deepEqual(makeCleaningPayload("vacuum.robot", [
    { id: 2, suctionLevel: 0, repeats: 3 },
  ]), {
    entity_id: "vacuum.robot",
    segments: 2,
    suction_level: 0,
    repeats: 3,
  });
});
