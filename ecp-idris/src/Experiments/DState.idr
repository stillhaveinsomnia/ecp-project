module Experiments.DState

export
record DState sx sy v where
  constructor MS
  run : sx -> (sy, v)

export
run : DState sx sy v -> sx -> (sy, v)
run (MS f) = f

export
(>>=) : DState sx sy vx -> (vx -> DState sy sz vy) -> DState sx sz vy
(MS run1) >>= f = MS $ \s1 =>
  let (s2, a) = run1 s1 in
  let (MS run2) = f a in
  run2 s2

export
(>>) : DState sx sy vx -> DState sy sz vy -> DState sx sz vy
m1 >> m2 = m1 >>= \_ => m2

export
pure : a -> DState sx sx a
pure x = MS $ \s => (s, x)

export
read : DState sx sx sx
read = MS $ \s => (s, s)

export
write : sy -> DState sx sy sy
write s = MS $ \_ => (s, s)

export
select : (sx -> a) -> DState sx sx a
select f = MS $ \s => (s, f s)

export
update : (sx -> sy) -> DState sx sy sy
update f = MS $ \s => let s' = f s in (s', s')

export
attempt : (f : sx -> Either err sx) -> DState sx sx (Either err sx)
attempt f = MS $ \s1 =>
  case f s1 of
    Left err => (s1, Left err)
    Right s2 => (s2, Right s2)

