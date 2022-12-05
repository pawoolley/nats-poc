import {AckPolicy, connect, ConnectionOptions, NatsConnection, StringCodec} from "nats";
import {createStream, log, servers, subjectName} from './common'
import * as util from 'util'

let natsConnection: NatsConnection
let natsConnectionClosed: Promise<void | Error>
let keepConsuming = true

const doSubscribe = async (connectionOptions: ConnectionOptions) => {
    try {
        // Connect to NATS
        natsConnection = await connect(connectionOptions);
        log(`connected to ${natsConnection.getServer()}`);

        // this promise indicates the client closed
        natsConnectionClosed = natsConnection.closed();

        // Create the stream, in case it doesn't already exist
        await createStream(natsConnection)

        // Create a JetStream client
        const jetStream = natsConnection.jetstream();

        // Create the consumer of the stream.  If the stream already exists, this is effectively a no-op.
        const jetStreamManager = await natsConnection.jetstreamManager();
        const stream = subjectName;
        const durable = subjectName + 2
        await jetStreamManager.consumers.add(stream, {
            ack_policy: AckPolicy.Explicit, durable_name: durable, ack_wait: 3000000000, // N.B. This value is express in nanos, not millis!
        })

        const codec = StringCodec()
        while (keepConsuming) {
            // Pull a single message from the stream.  Block for up to 5000ms for one to appear.
            const message = await jetStream.pull(stream, durable, 5000).catch((e) => {
                if (e.message !== 'TIMEOUT') {
                    log(e)
                }
            })
            if (message) {
                const data = codec.decode(message.data)
                log(`Received: '${data}' (redelivered=${message.info.redelivered}, redeliveryCount=${message.info.redeliveryCount}, deliverySequence=${message.info.deliverySequence})`)
                // Deal with the message half the time.  Put it back half the time
                const random = Math.random()
                if (0 <= random && random < 0.5) {
                    // Process it.
                    // // Simulate taking time (longer than the ack_wait) to complete the processing
                    // for (let i = 0; i < 5; i++) {
                    //     await sleep(1000)
                    //     log(`Working: '${data}' (redelivered=${message.info.redelivered}, redeliveryCount=${message.info.redeliveryCount}, deliverySequence=${message.info.deliverySequence})`)
                    //     message.working()
                    // }
                    log(`Ack'ing: '${data}' (redelivered=${message.info.redelivered}, redeliveryCount=${message.info.redeliveryCount}, deliverySequence=${message.info.deliverySequence})`)
                    message.ack()
                } else {
                    // Put it back
                    log(`Nack'ing: '${data}' (redelivered=${message.info.redelivered}, redeliveryCount=${message.info.redeliveryCount}, deliverySequence=${message.info.deliverySequence})`)
                    message.nak(10000)
                }

            }
        }
        log('Exiting consumer loop')
    } catch (err) {
        log(`error connecting to ${JSON.stringify(connectionOptions)}`);
        log(err)
        process.exit(1)
    }
}

const shutdown = util.callbackify(async () => {
    keepConsuming = false
    if (natsConnection && !natsConnection.isDraining() && !natsConnection.isClosed()) {
        natsConnection.drain().then(() => log('drained')).catch((e) => log(e))
    }
    await natsConnectionClosed.then(() => log('closed'))
})

process.on('SIGTERM', () => {
    shutdown((err) => {
        if (err) log(err)
    })
})

process.on('SIGINT', () => {
    shutdown((err) => {
        if (err) log(err)
    })
})


doSubscribe({servers} as ConnectionOptions).then(() => log("done"))
