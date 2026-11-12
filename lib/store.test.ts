import { describe, expect, it } from "vitest";
import { filterItems, historyLabel, itemAction, type StoreItem } from "./store";

const item = (over: Partial<StoreItem>): StoreItem => ({
  itemId: 1, category: "title", name: "Binary Hunter", description: "", price: 50, rarity: "Common",
  assetKey: "title-binary-hunter", owned: false, equipped: false, ...over,
});

describe("store helpers", () => {
  it("filters by category and name", () => {
    const list = [item({}), item({ itemId: 2, category: "avatar", name: "네온 해커" })];
    expect(filterItems(list, "avatar", "").map((i) => i.itemId)).toEqual([2]);
    expect(filterItems(list, "all", "binary").map((i) => i.itemId)).toEqual([1]);
  });

  it("chooses the card action", () => {
    expect(itemAction(item({}), false, null)).toBe("login");
    expect(itemAction(item({ owned: true, equipped: true }), true, 0)).toBe("equipped");
    expect(itemAction(item({ owned: true }), true, 0)).toBe("equip");
    expect(itemAction(item({}), true, 40)).toBe("short");
    expect(itemAction(item({}), true, 50)).toBe("buy");
    expect(itemAction(item({ price: 0 }), true, 0)).toBe("buy");
  });

  it("labels history rows", () => {
    expect(historyLabel({ amount: 10, reason: "SOLVE", refId: 112, label: "FIFO", createdAt: "" })).toBe("#112 FIFO");
    expect(historyLabel({ amount: -50, reason: "PURCHASE", refId: 5, label: "Binary Hunter", createdAt: "" })).toBe("Binary Hunter");
  });
});
