import {connect, ConnectionOptions, StringCodec} from "nats";
import {servers, subjectName} from './common'

const doPublish = async (connectionOptions: ConnectionOptions) => {
    try {
        // Connect to NATS
        const natsConnection = await connect(connectionOptions);
        console.log(`connected to ${natsConnection.getServer()}`);
        // this promise indicates the client closed
        const natsConnectionClosed = natsConnection.closed();

        // Use JetStream manager to set up a stream
        const jetStreamManager = await natsConnection.jetstreamManager();
        const stream = subjectName;
        const subject = subjectName;
        await jetStreamManager.streams.add({name: stream, subjects: [subject]});

        // Create a JetStream client
        const jetStream = natsConnection.jetstream();

        // Publish a bunch of messages
        const codec = StringCodec()
        const limit = 10
        const runId = Date.now()
        for (let i = 0; i < limit; i++) {
            const message = `hello ${runId}:::${i}`
            console.info(`Publishing '${message}'`)
            await jetStream.publish(subject, codec.encode(message))
        }

        // close the connection
        console.info('draining')
        await natsConnection.drain();
        // check if the close was OK
        console.info('awaiting close')
        const err = await natsConnectionClosed;
        console.info('closed')
        if (err) {
            console.error(`error closing:`, err);
        }
    } catch (err) {
        console.log(`error connecting to ${JSON.stringify(connectionOptions)}`);
        console.error(err)
    }
}

doPublish({servers} as ConnectionOptions).then(() => console.log("done"))
