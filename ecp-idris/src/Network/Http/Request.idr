module Network.Http.Request

import Data.Parser

%default total

public export
data HttpMethod = GET | POST | PUT | PATCH | DELETE

export
implementation Eq HttpMethod where
  GET == GET = True
  POST == POST = True
  PUT == PUT = True
  PATCH == PATCH = True
  DELETE == DELETE = True
  _ == _ = False

public export
record HttpRequest where
  constructor MakeHttpRequest
  method : HttpMethod
  headers : List (String, String)
  body : String 

export
implementation Eq HttpRequest where
  (MakeHttpRequest m1 h1 b1) == (MakeHttpRequest m2 h2 b2) =
    m1 == m2 && h1 == h2 && b1 == b2

---

httpMethod : Parser Char HttpMethod
httpMethod =
  (exact (unpack "GET") <&> const GET) <|>
  (exact (unpack "POST") <&> const POST) <|>
  (exact (unpack "PUT") <&> const PUT) <|>
  (exact (unpack "PATCH") <&> const PATCH) <|>
  (exact (unpack "DELETE") <&> const DELETE)

httpHeader : Parser Char (String, String)
httpHeader = do
  name <- many (is $ \c => isAlpha c || c == '-') <&> pack
  exact [':', ' ']
  value <- many (is $ \c => c /= '\r') <&> pack
  exact ['\r', '\n']
  pure (name, value)

httpRequest : Parser Char HttpRequest
httpRequest = do
  method <- httpMethod
  exact [' ', '/',' ']
  exact (unpack "HTTP/1.1\r\n")
  headers <- many httpHeader
  exact ['\r', '\n']
  body <- many any
  pure $ MakeHttpRequest method headers (pack body)

export
parseRequest : String -> Maybe HttpRequest
parseRequest string = case parse httpRequest (unpack string) of
  [req] => Just req
  _ => Nothing

formBody : Parser Char (List (String, String))
formBody = separatedBy entry (exact ['&']) where
  name : Parser Char String
  name = many (is $ \c => c /= '=') <&> pack
  value : Parser Char String
  value = many (is $ \c => c /= '&') <&> pack
  entry : Parser Char (String, String)
  entry = do
    name <- name
    exact ['=']
    value <- value
    pure (name, value)

export
parseFormBody : String -> Maybe (List (String, String))
parseFormBody string = case parse formBody (unpack string) of
  [req] => Just req
  _ => Nothing

TEST_A = parseRequest "GET / HTTP/1.1\r\n\r\n" == Just (MakeHttpRequest GET [] "")
TEST_B = parseRequest "POST / HTTP/1.1\r\nHost: example.com\r\n\r\n" == Just (MakeHttpRequest POST [("Host", "example.com")] "")
TEST_C = parseRequest "PUT / HTTP/1.1\r\nHost: example.com\r\ncustom: val\r\n\r\nbody text" == Just (MakeHttpRequest PUT [("Host", "example.com"), ("custom", "val")] "body text")
TEST_D_TEXT = """
GET / HTTP/1.1
Host: localhost:9091
Connection: keep-alive
"""
TEST_D = parseRequest TEST_D_TEXT