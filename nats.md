# NATS subject partitioning

1. [Install NATS CLI](https://nats.io/blog/nats-cli-intro/#download):
   ```
   brew tap nats-io/nats-tools
   brew install nats-io/nats-tools/nats
   ```
1. [Pull the latest NATS server docker image](https://docs.nats.io/running-a-nats-service/nats_docker#usage):
   ```
   docker pull nats
   ```
1. Create a nats-server config file that will partition our client data subject:
   ```
   mappings = {
     # "client data" subject of the form "clientdata.<env id>", which
     # will be mapped in to 2 partitions.
     "clientdata.*" : "clientdata.{{wildcard(1)}}.{{partition(2,1)}}"
   }
   ```
1. In a terminal, run the nats server docker image.
   ```
   # In this example, my "nats-server.conf" config file lives in
   # /Users/paulwoolley/code/my-stuff/nats-poc
   
   docker run \
   -v /Users/paulwoolley/code/my-stuff/nats-poc:/etc/nats \
   -p 4222:4222 \
   -p 8222:8222 \
   -p 6222:6222 \
   --name nats-server \
   -ti nats:latest \
   -c /etc/nats/nats-server.conf
   ```
   ...should give you...
   ```
   [1] 2022/11/11 15:50:36.577436 [INF] Starting nats-server
   [1] 2022/11/11 15:50:36.577504 [INF]   Version:  2.9.6
   [1] 2022/11/11 15:50:36.577508 [INF]   Git:      [289a9e1]
   [1] 2022/11/11 15:50:36.577518 [INF]   Name:     NAY35DQVTYH5QJDDGIXPYNCFK37LS5WQBPATWMGLM337I2RASX3XYRSU
   [1] 2022/11/11 15:50:36.577540 [INF]   ID:       NAY35DQVTYH5QJDDGIXPYNCFK37LS5WQBPATWMGLM337I2RASX3XYRSU
   [1] 2022/11/11 15:50:36.577549 [INF] Using configuration file: /etc/nats/nats-server.conf
   [1] 2022/11/11 15:50:36.578385 [INF] Listening for client connections on 0.0.0.0:4222
   [1] 2022/11/11 15:50:36.578598 [INF] Server is ready
   ```
1. In a separate terminal, start a subscriber listening to partition 1 of 2:
   ```
   nats sub clientdata.*.0
   ```
1. In a separate terminal, start a subscriber listening to partition 2 of 2:
   ```
   nats sub clientdata.*.1
   ```
1. In a separate terminal, start a publisher send messages to one env id (notice that the publisher doesn't need to know about the partitions):
   ```
   nats pub clientdata.111 "hi" --count=-1 --sleep=1s
   ```
1. In a separate terminal, start a publisher send messages to another env id:
   ```
   nats pub clientdata.222 "hi" --count=-1 --sleep=1s
   ```

What you (should) observe is that messages to "clientdata.111" are only ever handled by 1 of the subscribers, and messages to "clientdata.222" are only ever handled by the other subscriber.

If you start up more publishers send to, for example, "clientdata.333" and "clientdata.444", you'll see the subscribers start to handle those messages too, but again, in a deterministic way where one subscriber only ever deals with "clientdata.333" and the other only ever deals with "clientdata.444".

This is all due to [deterministic subject token partitioning](https://docs.nats.io/nats-concepts/subject_mapping#deterministic-subject-token-partitioning).

The pros of this strategy are:
- No need for distributed locks in Redis.

The cons of this strategy are:
- The setup is not dynamic and prone to configuration errors.  You would have to decide ahead of time how many partitions you wanted and configure the NATS server accordingly.
- You would then have to make sure that you launch the same number of subscriber processes as there are partitions, and that each subscriber was handling a different partition.
  - If a partition didn't have any subscriber, those messages would go unprocessed.
  - If a partition had more than 1 subscriber, message processing would be duplicated and in parallel.
