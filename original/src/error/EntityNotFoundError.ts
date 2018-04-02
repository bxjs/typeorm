import {ObjectType} from "../common/ObjectType";
import {EntitySchema} from "../index";

/**
 * Thrown when no result could be found in methods which are not allowed to return undefined or an empty set.
 */
export class EntityNotFoundError extends Error {
    name = "EntityNotFound";

    constructor(entityClass: ObjectType<any>|EntitySchema<any>|string, criteria: any) {
        super();
        Object.setPrototypeOf(this, EntityNotFoundError.prototype);
        let targetName: string;
        if (entityClass instanceof EntitySchema) {
            targetName = entityClass.options.name;
        } else if (typeof entityClass === "function") {
            targetName = entityClass.name;
        } else {
            targetName = entityClass;
        }
        const criteriaString = this.stringifyCriteria(criteria);
        this.message = `Could not find any entity of type "${targetName}" matching: ${criteriaString}`;
    }

    private stringifyCriteria(criteria: any): string {
        try {
            return JSON.stringify(criteria, null, 4);
        } catch (e) { }
        return "" + criteria;
    }

}
