module Network.Http.Server.Examples.HelloWorld

import Network.Http.Server.Blocking

main : IO ()
main = start 9090 $ \_ => do
  pure $ html 200 "<h1>Hello, World!</h1>"
