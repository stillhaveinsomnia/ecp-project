module Experiments.DecEqDMap

import Decidable.Equality

mutual

  export
  data DecEqDMap : (0 k : Type) -> (0 fv : k -> Type) -> {auto 0 dek : DecEq k} -> Type where
    Nil :
      {auto 0 dek : DecEq k} ->
      DecEqDMap k fv {dek = dek}
    (::) :
      {auto 0 dek : DecEq k} ->
      (h : (k ** fv k)) -> (t : DecEqDMap k fv {dek = dek}) ->
      {auto 0 hasX : has (fst h) t = False} ->
      DecEqDMap k fv {dek = dek}

  export
  0 has : {0 dek : DecEq k} -> (0 xk : k) -> (0 m : DecEqDMap k fv {dek = dek}) -> Bool
  has xk Nil = False
  has xk ((::) (hk ** _) t) = case decEq xk hk of
    Yes _ => True
    No _ => has xk t

export
nil : {auto dek : DecEq k} -> DecEqDMap k fv {dek = dek}
nil = Nil

export
add : {auto dek : DecEq k} -> (xk : k) -> (fv xk) -> (m : DecEqDMap k fv {dek = dek}) -> {auto 0 hasX : has xk m = False} -> DecEqDMap k fv {dek = dek}
add xk xv m = (::) (xk ** xv) m

export
inside : {auto dek : DecEq k} -> (xk : k) -> (m : DecEqDMap k fv {dek = dek}) -> Either (has xk m = False) (has xk m = True)
inside xk [] = Left Refl
inside xk ((hk ** _) :: t) with (decEq xk hk)
  inside hk ((hk ** _) :: t) | (Yes Refl) = Right Refl
  inside xk ((hk ** _) :: t) | (No _) = inside xk t

export
toList : {auto dek : DecEq k} -> DecEqDMap k fv {dek = dek} -> List (k ** fv k)
toList Nil = []
toList (h :: t) = h :: toList t

export
rem : {auto dek : DecEq k} -> (xk : k) -> (m : DecEqDMap k fv {dek = dek}) -> {auto 0 hasX : has xk m = True} -> DecEqDMap k fv {dek = dek}
rem xk ((hk ** hv) :: t) with (decEq xk hk)
  rem hk ((hk ** hv) :: t) | (Yes Refl) = t
  rem xk ((hk ** hv) :: t) | (No contra) = (::) (hk ** hv) (rem xk t) {hasX = ?TODO4}

export
get : {auto dek : DecEq k} -> (xk : k) -> (m : DecEqDMap k fv {dek = dek}) -> {auto 0 hasX : has xk m = True} -> fv xk
get xk ((hk ** hv) :: t) with (decEq xk hk)
  get hk ((hk ** hv) :: t) | (Yes Refl) = hv
  get xk ((hk ** hv) :: t) | (No contra) = get xk t

export
set : {auto dek : DecEq k} -> (xk : k) -> (fv xk) -> (m : DecEqDMap k fv {dek = dek}) -> {auto 0 hasX : has xk m = True} -> DecEqDMap k fv {dek = dek}
set xk xv ((hk ** hv) :: t) with (decEq xk hk)
  set hk xv ((hk ** hv) :: t) | (Yes Refl) = (::) (hk ** xv) t
  set xk xv ((hk ** hv) :: t) | (No contra) = (::) (hk ** hv) (set xk xv t) {hasX = ?TODO6}

export
mapValues :
  {0 k : Type} -> {auto dek : DecEq k} -> {0 fvx : k -> Type} -> {0 fvy : k -> Type} ->
  ((xk : k) -> fvx xk -> fvy xk) -> DecEqDMap k fvx {dek = dek} -> DecEqDMap k fvy {dek = dek}
mapValues f Nil = Nil
mapValues f ((::) (hk ** hv) t) = (::) (hk ** f hk hv) (mapValues f t) {hasX = ?TODO5}

0 proofAddHas : 
  {auto 0 dek : DecEq k} -> (0 xk : k) -> (0 xv : fv xk) -> (0 m : DecEqDMap k fv {dek = dek}) ->
  (0 hasX : has xk m = False) ->
  has xk (add xk xv m) = True

0 proofRemHas :
  {auto 0 dek : DecEq k} -> (0 xk : k) -> (0 m : DecEqDMap k fv {dek = dek}) ->
  (0 hasX : has xk m = True) ->
  has xk (rem xk m) = False

-- TODO
-- 0 proofAddGet :
--   DecEq k => (xk : k) -> (xv : fv xk) -> (m : DecEqDMap k fv) ->
--   (hasX : has xk m = False) ->
--   get xk (add xk xv m) = xv -- decEqSelfIsYes

-- TODO
-- 0 proofSetGet :
--   DecEq k => (xk : k) -> (xv : fv xk) -> (m : DecEqDMap k fv) ->
--   (hasX : has xk m = True) ->
--   get xk (set xk xv m) = xv

0 proofMapValuesId :
  {auto 0 dek : DecEq k} -> (0 m : DecEqDMap k fv {dek = dek}) ->
  mapValues (\xk => \xv => xv) m = m

-- TODO export helper wrap it in a type
-- export
-- DecEqMap : (0 k : Type) -> (0 v : Type) -> Type
-- DecEqMap k v = DecEqDMap k (const v)

-- TODO export helper wrap it in a type
-- export
-- DecEqSet : (0 k : Type) -> {auto 0 dek : DecEq k} -> Type
-- DecEqSet k {dek} = DecEqDMap k (const ()) {dek = dek}


-- tests

ta : DecEqDMap Nat (const String)
ta = []

tb : DecEqDMap Nat (const String)
tb = [(1 ** "one")]

tc : DecEqDMap Nat (const String)
tc = [(1 ** "one"), (2 ** "two")]

td : DecEqDMap Nat (const String)
td = [(1 ** "one"), (3 ** "two"), (2 ** "two")]

te : DecEqDMap Nat (const String)
-- te = [(1 ** "one"), (2 ** "two"), (2 ** "two")] -- must not typecheck

