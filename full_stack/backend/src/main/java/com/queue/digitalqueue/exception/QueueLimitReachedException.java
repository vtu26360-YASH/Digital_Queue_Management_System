package com.queue.digitalqueue.exception;

public class QueueLimitReachedException extends RuntimeException {

    public QueueLimitReachedException(String message) {
        super(message);
    }
}
