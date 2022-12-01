1. Run NATS server in docker
   ```
   docker compose up 
   ```
   
1. Start compilation in "watch" mode
   ```
   npm run watch 
   ```
   
1. Run the publisher, which will run and quit after sending some messages.
   ```
   npm run publisher
   ```
   
1. Run the subscriber, which will run and not-quit, waiting for messages to consume.
   ```
   npm run subscriber 
   ```
   
1. Run the publisher some more, or run extra subscribers.  Up to you.
