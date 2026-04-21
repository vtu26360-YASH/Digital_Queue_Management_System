package com.queue.digitalqueue.exception;

public class QueuePausedException extends RuntimeException {

    public QueuePausedException(String message) {
        super(message);
    }
}
