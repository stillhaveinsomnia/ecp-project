module Experiments.Persistable

import Data.List
import Data.Nat

import Data.Parser

%default total

data DD : Type where
  DDBool : DD
  DDInt : DD
  DDString : DD
  DDPair : DD -> DD -> DD

encode : DD -> List Nat
encode DDBool = [0]
encode DDInt = [1]
encode DDString = [2]
encode (DDPair a b) = [3] ++ encode a ++ encode b

parser : Parser Nat DD
parser = recursive 2 $ \parser =>
  (is (== 0) >> pure DDBool) <|>
  (is (== 1) >> pure DDInt) <|>
  (is (== 2) >> pure DDString) <|>
  (do is (== 3); a <- parser; b <- parser; pure (DDPair a b))

decode : List Nat -> Maybe DD
decode bits = case parse parser bits of
  (dd :: _) => Just dd
  _ => Nothing

proofEncodeDecode : (dd : DD) -> decode (encode dd) = Just dd


data Pers : Type where
  Mem : String -> Pers
  Sto : Nat -> Pers
   

