module Network.Http.Server.Blocking

import Network.Socket
import Network.Socket.Data

import public Network.Http.Server

%default total
 
-- Handle one connection: recv the request, send the response, close
handle : HasIO io => Socket -> (HttpRequest -> io HttpResponse) -> io ()
handle conn handler = do
  Right (req, _) <- recv conn 4096
    | Left err => do
        putStrLn $ "recv error: " ++ show err
        close conn
  putStrLn $ "--- Request ---\n" ++ req
  Just httpReq <- pure $ parseRequest req
    | Nothing => do
        putStrLn "Failed to parse request"
        close conn
  response <- handler httpReq
  let res = show response
  Right _ <- send conn res
    | Left err => putStrLn $ "send error: " ++ show err
  putStrLn $ "--- Response ---\n" ++ res
  close conn

-- Accept blocks on accept, handles connection
accept : HasIO io => Socket -> (HttpRequest -> io HttpResponse) -> io ()
accept sock handler = do
  Right (conn, addr) <- accept sock
    | Left err => do
        putStrLn $ "accept error: " ++ show err
  putStrLn $ "Connection from: " ++ show addr
  handle conn handler

loop : HasIO io => io () -> io () 
loop f = do f; assert_total $ loop f;

public export
implementation HasIO io => HttpServer io where
  start port handler = do
    -- Create a TCP socket
    Right sock <- socket AF_INET Stream 0
      | Left err => putStrLn $ "socket() failed: " ++ show err
    -- Bind to all interfaces on port
    -- Nothing = bind to 0.0.0.0
    0 <- bind sock Nothing port
      | err => do
          putStrLn $ "bind() failed with code: " ++ show err
          close sock
    0 <- listen sock
      | err => do
          putStrLn $ "listen() failed with code: " ++ show err
          close sock
    putStrLn "Listening on http://localhost:\{show port} ..."
    loop $ accept sock handler