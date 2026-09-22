module Network.Http.Server

import public Network.Http.Request
import public Network.Http.Response

%default total

public export
interface HasIO io => HttpServer io where
  start :
    (port : Int) ->
    (handler : HttpRequest -> io HttpResponse) ->
    io ()

