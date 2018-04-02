import {getMetadataArgsStorage} from "../../";
import {EntitySubscriberMetadataArgs} from "../../metadata-args/EntitySubscriberMetadataArgs";

/**
 * Classes decorated with this decorator will listen to ORM events and their methods will be triggered when event
 * occurs. Those classes must implement EventSubscriberInterface interface.
 */
export function EventSubscriber() {
    return function (target: Function) {

        getMetadataArgsStorage().entitySubscribers.push({
            target: target
        } as EntitySubscriberMetadataArgs);
    };
}