import {Entity} from "../../../../src/decorator/entity/Entity";
import {BaseEntity} from "../../../../src/repository/BaseEntity";
import {PrimaryGeneratedColumn} from "../../../../src/decorator/columns/PrimaryGeneratedColumn";
import {Column} from "../../../../src/decorator/columns/Column";

@Entity()
export class Category  extends BaseEntity {

    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

}