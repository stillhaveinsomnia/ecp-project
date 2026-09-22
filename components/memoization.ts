export function memoizeSimple<Arg extends string, Result>(
  fn: (arg: Arg) => Result,
): (arg: Arg) => Result {
  const cache = new Map<Arg, Result>();
  return (arg: Arg) => {
    if (cache.has(arg)) {
      return cache.get(arg)!;
    }
    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
}
