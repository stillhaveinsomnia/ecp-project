import { groupBy, maxBy, orderBy } from "../../components/queries/helpers";

test("groupBy returns a single group when all items share the same key", () => {
  const result = groupBy(
    [{ type: "a" }, { type: "a" }, { type: "a" }],
    (item) => [item.type],
    (group) => group.length,
  );
  expect(result).toEqual([3]);
});

test("groupBy creates separate groups for items with different keys", () => {
  const result = groupBy(
    [{ type: "a" }, { type: "b" }, { type: "a" }],
    (item) => [item.type],
    (group) => group.map((i) => i.type),
  );
  expect(result).toEqual([["a", "a"], ["b"]]);
});

test("groupBy applies the mapper function to transform each group into a result", () => {
  const items = [
    { name: "alice", score: 10 },
    { name: "bob", score: 20 },
    { name: "carol", score: 30 },
  ];
  const result = groupBy(
    items,
    () => ["all"],
    (group) => group.reduce((sum, i) => sum + i.score, 0),
  );
  expect(result).toEqual([60]);
});

test("groupBy groups by a composite multi-field criterion and keeps items together only when all fields match", () => {
  const items = [
    { city: "Berlin", year: 2024 },
    { city: "Berlin", year: 2025 },
    { city: "Paris", year: 2024 },
    { city: "Berlin", year: 2024 },
  ];
  const result = groupBy(
    items,
    (item) => [item.city, item.year],
    (group) => group.length,
  );
  expect(result).toEqual([2, 1, 1]);
});

test("groupBy returns an empty array when input array is empty", () => {
  const result = groupBy(
    [],
    () => ["key"],
    (group) => group.length,
  );
  expect(result).toEqual([]);
});

test("maxBy returns the item with the highest score", () => {
  const items = [{ v: 1 }, { v: 42 }, { v: 7 }];
  expect(maxBy(items, (i) => i.v)).toEqual({ v: 42 });
});

test("maxBy returns the last item encountered when two items share the equal maximum value", () => {
  const a = { v: 10, label: "first" };
  const b = { v: 10, label: "second" };
  expect(maxBy([a, b], (i) => i.v)).toEqual(b);
});

test("maxBy throws when called with an empty array", () => {
  expect(() => maxBy([], () => 0)).toThrow("maxBy: array must not be empty");
});

test("orderBy sorts an array of items in ascending order", () => {
  const items = [{ n: 3 }, { n: 1 }, { n: 2 }];
  expect(orderBy(items, (i) => i.n, "asc")).toEqual([
    { n: 1 },
    { n: 2 },
    { n: 3 },
  ]);
});

test("orderBy sorts an array of items in descending order", () => {
  const items = [{ n: 3 }, { n: 1 }, { n: 2 }];
  expect(orderBy(items, (i) => i.n, "desc")).toEqual([
    { n: 3 },
    { n: 2 },
    { n: 1 },
  ]);
});
