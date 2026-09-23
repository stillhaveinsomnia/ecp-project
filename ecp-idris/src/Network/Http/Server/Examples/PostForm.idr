module Network.Http.Server.Examples.PostForm

import Data.IORef
import Data.String

import Network.Http.Server.Blocking

record ServerState where
  constructor MakeServerState
  todos : List String

indexPage : ServerState -> String
indexPage state = """
  <h1>Todos</h1>
  <form method="POST" action="/">
    <input type="text" name="todo" />
    <button type="submit">Add</button>
  </form>
  <ul>
    \{joinBy "\n" $ state.todos <&> \todo => "<li> \{todo}</li>"}
  </ul>
  """

controller : ServerState -> HttpRequest -> (ServerState, HttpResponse)
controller state request = case request.method of
  GET =>
    (state, html 200 $ indexPage state)
  POST =>
    case parseFormBody request.body >>= (lookup "todo") of
      Just todo =>
        let newState = {todos $= (todo ::)} state in
        (newState, redirect "/")
      Nothing =>
        (state, html 400 "Bad request")
  _ =>
    (state, html 404 "Not found")

main : IO ()
main = do
  serverStateRef <- newIORef $ MakeServerState ["add one"]
  start 9091 $ \request => do
    serverState <- readIORef serverStateRef
    let (newState, response) = controller serverState request
    writeIORef serverStateRef newState
    pure response