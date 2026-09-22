module Data.Parser

import Data.List1

%default total

public export
data Parser : Type -> Type -> Type where
  Err : Parser x y
  End : y -> Parser x y
  One : (x -> Parser x y) -> Parser x y
  Alt : List (Parser x y) -> Parser x y

public export
parse : Parser x y -> List x -> List y 
parse (End y) [] = [y]
parse (One f) (x :: xs) = parse (f x) xs
parse (Alt []) xs = []
parse (Alt (p :: ps)) xs = parse p xs ++ parse (Alt ps) xs
parse _ _ = []

public export
throw : Parser x y
throw = Err

public export
pure : y -> Parser x y
pure y = End y

public export
any : Parser x x
any = One End

public export
(<|>) : Parser x y -> Parser x y -> Parser x y
l <|> r = Alt [l, r]

public export
(>>=) : Parser x y -> (y -> Parser x z) -> Parser x z
Err >>= f = Err
End y >>= f = f y
One k >>= f = One $ \x => k x >>= f
Alt ps >>= f = Alt (bindAlt ps) where
  public export
  bindAlt : List (Parser x y) -> List (Parser x z)
  bindAlt [] = []
  bindAlt (p :: ps) = (p >>= f) :: bindAlt ps

public export
(>>) : Parser x y -> Parser x z -> Parser x z
l >> r = l >>= \_ => r

public export
(<$>) : (y -> z) -> Parser x y -> Parser x z
f <$> p = p >>= \y => pure (f y)

public export
(<&>) : Parser x y -> (y -> z) -> Parser x z
(<&>) = flip (<$>)

public export
is : (x -> Bool) -> Parser x x
is p = any >>= \x => if p x then pure x else throw

public export
optional : Parser x y -> Parser x (Maybe y)
optional p = (p <&> Just) <|> pure Nothing

public export
recursive : (n : Nat) -> (Parser x y -> Parser x y) -> Parser x y
recursive Z f = throw
recursive (S k) f = let p = f (recursive k f) in p

public export
many : Parser x y -> Parser x (List y)
many p = recursive 1000 $ \many => (do y <- p; ys <- many; pure (y :: ys)) <|> pure []

public export
some : Parser x y -> Parser x (List1 y)
some p = do y <- p; ys <- many p; pure (y ::: ys)

public export
separatedBy : Parser x y -> Parser x z -> Parser x (List y)
separatedBy p sep = (do y <- p; ys <- many (sep >> p); pure (y :: ys)) <|> pure []

public export
exact : Ord x => List x -> Parser x ()
exact [] = pure ()
exact (c :: cs) = do
  x <- any
  if x == c then exact cs else throw

public export
lineEnd : Parser Char ()
lineEnd = (exact $ ['\r', '\n']) <|> (exact ['\n'])

--

data MyTree = Leaf Char | Branch MyTree MyTree
myTree : Parser Char MyTree
myTree = recursive 10 tree where
  tree self = leaf <|> branch where
    leaf = is isAlpha <&> Leaf
    branch : Parser Char MyTree
    branch = do exact ['(']; left <- self; exact [',']; right <- self; exact [')'] >> pure (Branch left right)

TreeTest1 = parse myTree (unpack "(a,(b,c))")
TreeTest2Expected = [Branch (Leaf 'a') (Branch (Leaf 'b') (Leaf 'c'))]
TreeTestProof : TreeTest1 = TreeTest2Expected
TreeTestProof = Refl

Con : Parser x x
Con = any

TEST_A : parse (pure 4) [] = [4]
TEST_A = Refl

TEST_B : parse (pure 4) [True] = []
TEST_B = Refl

TEST_C : parse (Con) [] = []
TEST_C = Refl

TEST_D : parse (Con) [True] = [True]
TEST_D = Refl

TEST_E : parse (do x <- Con; pure x) [True] = [True]
TEST_E = Refl

TEST_F : parse (do x <- Con; pure x) [] = []
TEST_F = Refl

TEST_G : parse (do x <- Con; y <- Con; pure (x, y)) [True, False] = [(True, False)]
TEST_G = Refl

TEST_H : parse (do x <- Con; y <- Con; pure (x, y)) [True] = []
TEST_H = Refl

TEST_I : parse (do x <- Con; y <- Con; pure (x, y)) [] = []
TEST_I = Refl

TEST_J : parse (exact (unpack "hello")) (unpack "hello") = [()]
TEST_J = Refl

TEST_K : parse (exact (unpack "hello")) (unpack "hell") = []
TEST_K = Refl

TEST_L : parse (exact (unpack "hello") >> exact (unpack " ") >> exact (unpack "world")) (unpack "hello world") = [()]
TEST_L = Refl

TEST_M : parse (exact (unpack "GET") <|> exact (unpack "POST")) (unpack "GET") = [()]
TEST_M = Refl

TEST_N : parse (exact (unpack "GET") <|> exact (unpack "POST")) (unpack "POST") = [()]
TEST_N = Refl

TEST_O : parse (exact (unpack "GET") <|> exact (unpack "POST")) (unpack "PUT") = []
TEST_O = Refl

TEST_P : parse (many Con) [True, False] = [[True, False]]
TEST_P = Refl

TEST_Q : parse (many Con) (unpack "Ciaooo") = [unpack "Ciaooo"]
TEST_Q = Refl

TEST_R : parse (separatedBy (is Prelude.isAlpha) (exact (unpack ","))) (unpack "a,b,c") = [['a', 'b', 'c']]
TEST_R = Refl