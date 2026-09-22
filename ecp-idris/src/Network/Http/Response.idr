module Network.Http.Response

import Data.String
import Data.List

%default total

public export
record HttpResponse where
  constructor MakeHttpResponse
  statusCode : Int
  headers : List (String, String)
  body : String

codeName : Int -> String
codeName 200 = "OK"
codeName 302 = "Found"
codeName 400 = "Bad Request"
codeName 404 = "Not Found"
codeName code = "Unknown"

export
implementation Show HttpResponse where
  show response =
    """
    HTTP/1.1 \{show response.statusCode} \{codeName response.statusCode}
    \{joinBy "\r\n" $ response.headers <&> (\(k, v) => "\{k}: \{v}") }

    \{response.body}
    """

export
html : Int -> String -> HttpResponse
html statusCode body = MakeHttpResponse statusCode [("Content-Type", "text/html; charset=utf-8")] body

export
redirect : String -> HttpResponse
redirect location = MakeHttpResponse 302 [("Location", location)] ""
