module Experiments.DSeq

%default total

data GSeq : {ht : Type} -> {vt : Type} -> {default (\_ => \_ => ()) rp : ht -> vt -> Type} -> {init : vt} -> {default (\_ => \v => v) track : ht -> vt -> vt} -> {v : vt} -> Type where
  Nil :
    {ht : Type} -> {vt : Type} -> {rp : ht -> vt -> Type} -> {init : vt} -> {track : ht -> vt -> vt} ->
    GSeq {ht = ht} {vt = vt} {rp = rp} {init = init} {track = track} {v = init}
  (::) :
    {ht : Type} -> {vt : Type} -> {rp : ht -> vt -> Type} -> {init : vt} -> {track : ht -> vt -> vt} -> {v : vt} ->
    (h : ht) -> {auto p : rp h v} -> 
    GSeq {ht = ht} {vt = vt} {rp = rp} {init = init} {track = track} {v = v} ->
    GSeq {ht = ht} {vt = vt} {rp = rp} {init = init} {track = track} {v = track h v}


-- list like
GList : Type -> Type
GList a = GSeq {ht = a} {init = ()} {v=()}
t1 : GList String
t1 = ["a", "b", "c"]

-- vector like
GVec : Type -> Nat -> Type
GVec a n = GSeq {ht = a} {init = Z} {track = const S} {v = n}
t2 : GVec String 3
t2 = ["a", "b", "c"]

-- heterogenous list like
GHList : List Type -> Type
GHList l = GSeq {ht = (i : Type ** i)} {init = []} {track = \(i ** _) => \t => i :: t} {v = l}
t3 : GHList [String, Nat, Bool]
t3 = [(String ** "a"), (Nat ** 1), (Bool ** True)]

-- set like
GSet : (a : Type) -> Eq a => {v : List a} -> Type
GSet a {v} = GSeq {ht = a} {vt = List a} {rp = \x => \xs => x `elem` xs = False} {init = []} {track = \x => \xs => x :: xs} {v = v}
t4 : GSet String {v = ["c", "b", "a"]}
t4 = ["c", "b", "a"]