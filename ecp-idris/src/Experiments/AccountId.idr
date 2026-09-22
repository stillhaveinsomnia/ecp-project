module Experiments.AccountId

public export
data AccountSecret = MakeAccountSecret String

export
data AccountId = MakeAccountId String

export
Eq AccountId where
  (MakeAccountId s1) == (MakeAccountId s2) = s1 == s2

export
Ord AccountId where
  compare (MakeAccountId s1) (MakeAccountId s2) = compare s1 s2

export
from : AccountSecret -> AccountId
from (MakeAccountSecret s) = MakeAccountId (reverse s)