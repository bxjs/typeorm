import {getMetadataArgsStorage} from "../../";
import {RelationMetadataArgs} from "../../metadata-args/RelationMetadataArgs";

/**
 * Marks a entity property as a parent of the tree.
 * "Tree parent" indicates who owns (is a parent) of this entity in tree structure.
 */
export function TreeParent(): Function {
    return function (object: Object, propertyName: string) {

        // now try to determine it its lazy relation
        const reflectedType = Reflect && (Reflect as any).getMetadata ? Reflect.getMetadata("design:type", object, propertyName) : undefined;
        const isLazy = (reflectedType && typeof reflectedType.name === "string" && reflectedType.name.toLowerCase() === "promise") || false;

        getMetadataArgsStorage().relations.push({
            isTreeParent: true,
            target: object.constructor,
            propertyName: propertyName,
            isLazy: isLazy,
            relationType: "many-to-one",
            type: () => object.constructor,
            options: {}
        } as RelationMetadataArgs);
    };
}
