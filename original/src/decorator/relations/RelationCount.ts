import {getMetadataArgsStorage, SelectQueryBuilder} from "../../";
import {RelationCountMetadataArgs} from "../../metadata-args/RelationCountMetadataArgs";

/**
 * Holds a number of children in the closure table of the column.
 *
 * @deprecated Do not use this decorator, it may be removed in the future versions
 */
export function RelationCount<T>(relation: string|((object: T) => any), alias?: string, queryBuilderFactory?: (qb: SelectQueryBuilder<any>) => SelectQueryBuilder<any>): Function {
    return function (object: Object, propertyName: string) {

        getMetadataArgsStorage().relationCounts.push({
            target: object.constructor,
            propertyName: propertyName,
            relation: relation,
            alias: alias,
            queryBuilderFactory: queryBuilderFactory
        } as RelationCountMetadataArgs);
    };
}
