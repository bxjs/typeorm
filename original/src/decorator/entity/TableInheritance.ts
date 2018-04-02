import {ColumnOptions, getMetadataArgsStorage} from "../../";
import {InheritanceMetadataArgs} from "../../metadata-args/InheritanceMetadataArgs";

/**
 * Sets for entity to use table inheritance pattern.
 */
export function TableInheritance(options?: { pattern?: "STI"/*|"CTI"*/, column?: string|ColumnOptions }) {
    return function (target: Function) {

        getMetadataArgsStorage().inheritances.push({
            target: target,
            pattern: options && options.pattern ? options.pattern : "STI",
            column: options && options.column ? typeof options.column === "string" ? { name: options.column } : options.column : undefined
        } as InheritanceMetadataArgs);
    };
}