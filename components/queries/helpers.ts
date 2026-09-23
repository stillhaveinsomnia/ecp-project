export function groupBy<Item, Result>(
  array: Array<Item>,
  criteria: (item: Item) => Array<string | number>,
  mapper: (group: Array<Item>) => Result,
): Array<Result> {
  const groups = new Map<string, Array<Item>>();
  array.forEach((item) => {
    const key = JSON.stringify(criteria(item));
    const group = groups.get(key) || [];
    group.push(item);
    groups.set(key, group);
  });
  const result: Array<Result> = [];
  groups.forEach((group) => {
    result.push(mapper(group));
  });
  return result;
}

export function maxBy<Item>(
  array: Array<Item>,
  criteria: (item: Item) => number,
): Item {
  let maxItem: Item | null = null;
  let maxValue = -Infinity;
  array.forEach((item) => {
    const value = criteria(item);
    if (value >= maxValue) {
      maxValue = value;
      maxItem = item;
    }
  });
  if (maxItem === null) {
    throw new Error("maxBy: array must not be empty");
  }
  return maxItem;
}

export function orderBy<Item>(
  array: Array<Item>,
  criteria: (item: Item) => number,
  direction: "asc" | "desc",
): Array<Item> {
  return [...array].sort((a, b) =>
    direction === "asc" ? criteria(a) - criteria(b) : criteria(b) - criteria(a),
  );
}
