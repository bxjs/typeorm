import {EntityOptions, getMetadataArgsStorage} from "../../";
import {TableMetadataArgs} from "../../metadata-args/TableMetadataArgs";

/**
 * This decorator is used to mark classes that will be an entity (table or document depend on database type).
 * Database schema will be created for all classes decorated with it, and Repository can be retrieved and used for it.
 */
export function Entity(options?: EntityOptions): Function;

/**
 * This decorator is used to mark classes that will be an entity (table or document depend on database type).
 * Database schema will be created for all classes decorated with it, and Repository can be retrieved and used for it.
 */
export function Entity(name?: string, options?: EntityOptions): Function;

/**
 * This decorator is used to mark classes that will be an entity (table or document depend on database type).
 * Database schema will be created for all classes decorated with it, and Repository can be retrieved and used for it.
 */
export function Entity(nameOrOptions?: string|EntityOptions, maybeOptions?: EntityOptions): Function {
    const options = (typeof nameOrOptions === "object" ? nameOrOptions as EntityOptions : maybeOptions) || {};
    const name = typeof nameOrOptions === "string" ? nameOrOptions : options.name;

    return function (target: Function) {
        getMetadataArgsStorage().tables.push({
            target: target,
            name: name,
            type: "regular",
            orderBy: options.orderBy ? options.orderBy : undefined,
            engine: options.engine ? options.engine : undefined,
            database: options.database ? options.database : undefined,
            schema: options.schema ? options.schema : undefined,
            synchronize: options.synchronize
        } as TableMetadataArgs);
    };
}
