import {NatsConnection, StreamInfo} from 'nats'

export const servers = 'localhost:4222'

export const subjectName = 'nats-poc'

/**
 * Sleep for a bit
 * @param millis millis to sleep for
 */
export const sleep = async (millis) => new Promise(resolve => setTimeout(resolve, millis))

/**
 * Helper function to create a NATS stream.
 * @param natsConnection the NATS connection.
 * @param stream the stream name.
 * @param subject the stream's subject.
 */
export const createStream = async (natsConnection: NatsConnection, stream = subjectName, subject = subjectName): Promise<StreamInfo> => {
    // Use JetStream manager to set up a stream
    const jetStreamManager = await natsConnection.jetstreamManager();
    return jetStreamManager.streams.add({name: stream, subjects: [subject]});
}

/**
 * Helper function to log to the console with a timestamp.
 * @param data the data to log.
 */
export const log = (...data: any[]) => console.log(`[${new Date().toISOString()}] ${data}`)
