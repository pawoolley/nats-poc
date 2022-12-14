import {connect, ConnectionOptions, consumerOpts, createInbox, NatsConnection, StringCodec} from "nats";
import {log, servers, subjectName} from './common'
import * as util from 'util'

let natsConnection: NatsConnection
let natsConnectionClosed: Promise<void | Error>

const doSubscribe = async (connectionOptions: ConnectionOptions) => {
    try {
        // Connect to NATS
        natsConnection = await connect(connectionOptions);
        log(`connected to ${natsConnection.getServer()}`);

        // this promise indicates the client closed
        natsConnectionClosed = natsConnection.closed();

        // Create a JetStream client
        const jetStream = natsConnection.jetstream();

        const subject = subjectName;
        const queue = subjectName
        const durable = subjectName
        const inbox = createInbox()

        const consumerOptions = consumerOpts()
        consumerOptions.queue(queue)
        consumerOptions.durable(durable + '20')
        consumerOptions.deliverTo(inbox)
        consumerOptions.manualAck()
        // Once the consumer is set up (id'ed by the 'durable' name), changing these values after the fact has no effect.
        // You need to change the 'durable' name, in effect setting up a new consumer.
        consumerOptions.ackWait(3000)
        consumerOptions.maxDeliver(3)

        const subscription = await jetStream.subscribe(subject, consumerOptions)

        const codec = StringCodec()
        for await (const message of subscription) {
            log(`Received: ${codec.decode(message.data)} (redelivered=${message.info.redelivered}, redeliveryCount=${message.info.redeliveryCount}, deliverySequence=${message.info.deliverySequence})`)
            // await sleep(1000)
            message.ack();
        }
    } catch (err) {
        log(`error connecting to ${JSON.stringify(connectionOptions)}`);
        log(err)
        process.exit(1)
    }
}

const shutdown = util.callbackify(async () => {
    if (natsConnection && !natsConnection.isDraining() && !natsConnection.isClosed()) {
        natsConnection.drain().then(() => log('drained')).catch((e) => log(e))
    }
    await natsConnectionClosed
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
