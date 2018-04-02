/**
 * Thrown when transaction is not started yet and user tries to run commit or rollback.
 */
export class TransactionNotStartedError extends Error {
    name = "TransactionNotStartedError";

    constructor() {
        super();
        Object.setPrototypeOf(this, TransactionNotStartedError.prototype);
        this.message = `Transaction is not started yet, start transaction before committing or rolling it back.`;
    }

}