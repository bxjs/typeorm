import {SqlInMemory} from "../driver/SqlInMemory";
import {PromiseUtils} from "../util/PromiseUtils";
import {Connection} from "../connection/Connection";
import {Table} from "../schema-builder/table/Table";
import {EntityManager} from "../entity-manager/EntityManager";
import {TableColumn} from "../schema-builder/table/TableColumn";
import {Broadcaster} from "../subscriber/Broadcaster";

export abstract class BaseQueryRunner {

    // -------------------------------------------------------------------------
    // Public Properties
    // -------------------------------------------------------------------------

    /**
     * Connection used by this query runner.
     */
    connection: Connection;

    /**
     * Entity manager working only with current query runner.
     */
    manager: EntityManager;

    /**
     * Indicates if connection for this query runner is released.
     * Once its released, query runner cannot run queries anymore.
     */
    isReleased = false;

    /**
     * Indicates if transaction is in progress.
     */
    isTransactionActive = false;

    /**
     * Stores temporarily user data.
     * Useful for sharing data with subscribers.
     */
    data = {};

    /**
     * All synchronized tables in the database.
     */
    loadedTables: Table[] = [];

    /**
     * Broadcaster used on this query runner to broadcast entity events.
     */
    broadcaster: Broadcaster;

    // -------------------------------------------------------------------------
    // Protected Properties
    // -------------------------------------------------------------------------

    /**
     * Real database connection from a connection pool used to perform queries.
     */
    protected databaseConnection: any;

    /**
     * Indicates if special query runner mode in which sql queries won't be executed is enabled.
     */
    protected sqlMemoryMode: boolean = false;

    /**
     * Sql-s stored if "sql in memory" mode is enabled.
     */
    protected sqlInMemory: SqlInMemory = new SqlInMemory();

    /**
     * Mode in which query runner executes.
     * Used for replication.
     * If replication is not setup its value is ignored.
     */
    protected mode: "master"|"slave";

    // -------------------------------------------------------------------------
    // Public Abstract Methods
    // -------------------------------------------------------------------------

    /**
     * Executes a given SQL query.
     */
    abstract query(query: string, parameters?: any[]): Promise<any>;

    // -------------------------------------------------------------------------
    // Protected Abstract Methods
    // -------------------------------------------------------------------------

    protected abstract async loadTables(tablePaths: string[]): Promise<Table[]>;

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Loads given table's data from the database.
     */
    async getTable(tablePath: string): Promise<Table|undefined> {
        this.loadedTables = await this.loadTables([tablePath]);
        return this.loadedTables.length > 0 ? this.loadedTables[0] : undefined;
    }

    /**
     * Loads all tables (with given names) from the database.
     */
    async getTables(tableNames: string[]): Promise<Table[]> {
        this.loadedTables = await this.loadTables(tableNames);
        return this.loadedTables;
    }

    /**
     * Enables special query runner mode in which sql queries won't be executed,
     * instead they will be memorized into a special variable inside query runner.
     * You can get memorized sql using getMemorySql() method.
     */
    enableSqlMemory(): void {
        this.sqlInMemory = new SqlInMemory();
        this.sqlMemoryMode = true;
    }

    /**
     * Disables special query runner mode in which sql queries won't be executed
     * started by calling enableSqlMemory() method.
     *
     * Previously memorized sql will be flushed.
     */
    disableSqlMemory(): void {
        this.sqlInMemory = new SqlInMemory();
        this.sqlMemoryMode = false;
    }

    /**
     * Flushes all memorized sqls.
     */
    clearSqlMemory(): void {
        this.sqlInMemory = new SqlInMemory();
    }

    /**
     * Gets sql stored in the memory. Parameters in the sql are already replaced.
     */
    getMemorySql(): SqlInMemory {
        return this.sqlInMemory;
    }

    /**
     * Executes up sql queries.
     */
    async executeMemoryUpSql(): Promise<void> {
        await PromiseUtils.runInSequence(this.sqlInMemory.upQueries, downQuery => this.query(downQuery));
    }

    /**
     * Executes down sql queries.
     */
    async executeMemoryDownSql(): Promise<void> {
        await PromiseUtils.runInSequence(this.sqlInMemory.downQueries.reverse(), downQuery => this.query(downQuery));
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Gets table from previously loaded tables, otherwise loads it from database.
     */
    protected async getCachedTable(tableName: string): Promise<Table> {
        const table = this.loadedTables.find(table => table.name === tableName);
        if (table) return table;

        const foundTables = await this.loadTables([tableName]);
        if (foundTables.length > 0) {
            this.loadedTables.push(foundTables[0]);
            return foundTables[0];
        } else {
            throw new Error(`Table "${tableName}" does not exist.`);
        }
    }

    /**
     * Replaces loaded table with given changed table.
     */
    protected replaceCachedTable(table: Table, changedTable: Table): void {
        const foundTable = this.loadedTables.find(loadedTable => loadedTable.name === table.name);
        if (foundTable) {
            foundTable.name = changedTable.name;
            foundTable.columns = changedTable.columns;
            foundTable.indices = changedTable.indices;
            foundTable.foreignKeys = changedTable.foreignKeys;
            foundTable.uniques = changedTable.uniques;
            foundTable.checks = changedTable.checks;
            foundTable.justCreated = changedTable.justCreated;
            foundTable.engine = changedTable.engine;
        }
    }

    /**
     * Checks if at least one of column properties was changed.
     * Does not checks column type, length and autoincrement, because these properties changes separately.
     */
    protected isColumnChanged(oldColumn: TableColumn, newColumn: TableColumn, checkDefault?: boolean, checkComment?: boolean): boolean {
        // this logs need to debug issues in column change detection. Do not delete it!

        // console.log("charset ---------------");
        // console.log(oldColumn.charset !== newColumn.charset);
        // console.log(oldColumn.charset, newColumn.charset);
        // console.log("collation ---------------");
        // console.log(oldColumn.collation !== newColumn.collation);
        // console.log(oldColumn.collation, newColumn.collation);
        // console.log("precision ---------------");
        // console.log(oldColumn.precision !== newColumn.precision);
        // console.log(oldColumn.precision, newColumn.precision);
        // console.log("scale ---------------");
        // console.log(oldColumn.scale !== newColumn.scale);
        // console.log(oldColumn.scale, newColumn.scale);
        // console.log("default ---------------");
        // console.log((checkDefault && oldColumn.default !== newColumn.default));
        // console.log(oldColumn.default, newColumn.default);
        // console.log("isNullable ---------------");
        // console.log(oldColumn.isNullable !== newColumn.isNullable);
        // console.log(oldColumn.isNullable, newColumn.isNullable);
        // console.log("comment ---------------");
        // console.log((checkComment && oldColumn.comment !== newColumn.comment));
        // console.log(oldColumn.comment, newColumn.comment);
        // console.log("enum ---------------");
        // console.log(oldColumn.enum !== newColumn.enum);
        // console.log(oldColumn.enum, newColumn.enum);

        return oldColumn.charset !== newColumn.charset
            || oldColumn.collation !== newColumn.collation
            || oldColumn.precision !== newColumn.precision
            || oldColumn.scale !== newColumn.scale
            || oldColumn.zerofill !== newColumn.zerofill
            || oldColumn.unsigned !== newColumn.unsigned
            || (checkDefault && oldColumn.default !== newColumn.default)
            || oldColumn.isNullable !== newColumn.isNullable
            || (checkComment && oldColumn.comment !== newColumn.comment)
            || oldColumn.enum !== newColumn.enum;
    }

    /**
     * Checks if column length is by default.
     */
    protected isDefaultColumnLength(table: Table, column: TableColumn, length: string): boolean {
        // if table have metadata, we check if length is specified in column metadata
        if (this.connection.hasMetadata(table.name)) {
            const metadata = this.connection.getMetadata(table.name);
            const columnMetadata = metadata.findColumnWithDatabaseName(column.name);
            if (columnMetadata && columnMetadata.length)
                return false;
        }

        if (this.connection.driver.dataTypeDefaults
            && this.connection.driver.dataTypeDefaults[column.type]
            && this.connection.driver.dataTypeDefaults[column.type].length) {
            return this.connection.driver.dataTypeDefaults[column.type].length!.toString() === length.toString();
        }

        return false;
    }

    /**
     * Checks if column precision is by default.
     */
    protected isDefaultColumnPrecision(table: Table, column: TableColumn, precision: number): boolean {
        // if table have metadata, we check if length is specified in column metadata
        if (this.connection.hasMetadata(table.name)) {
            const metadata = this.connection.getMetadata(table.name);
            const columnMetadata = metadata.findColumnWithDatabaseName(column.name);
            if (columnMetadata && columnMetadata.precision !== null && columnMetadata.precision !== undefined)
                return false;
        }

        if (this.connection.driver.dataTypeDefaults
            && this.connection.driver.dataTypeDefaults[column.type]
            && this.connection.driver.dataTypeDefaults[column.type].precision !== null
            && this.connection.driver.dataTypeDefaults[column.type].precision !== undefined)
            return this.connection.driver.dataTypeDefaults[column.type].precision === precision;

        return false;
    }

    /**
     * Checks if column scale is by default.
     */
    protected isDefaultColumnScale(table: Table, column: TableColumn, scale: number): boolean {
        // if table have metadata, we check if length is specified in column metadata
        if (this.connection.hasMetadata(table.name)) {
            const metadata = this.connection.getMetadata(table.name);
            const columnMetadata = metadata.findColumnWithDatabaseName(column.name);
            if (columnMetadata && columnMetadata.scale !== null && columnMetadata.scale !== undefined)
                return false;
        }

        if (this.connection.driver.dataTypeDefaults
            && this.connection.driver.dataTypeDefaults[column.type]
            && this.connection.driver.dataTypeDefaults[column.type].scale !== null
            && this.connection.driver.dataTypeDefaults[column.type].scale !== undefined)
            return this.connection.driver.dataTypeDefaults[column.type].scale === scale;

        return false;
    }

    /**
     * Executes sql used special for schema build.
     */
    protected async executeQueries(upQueries: string|string[], downQueries: string|string[]): Promise<void> {
        if (typeof upQueries === "string")
            upQueries = [upQueries];
        if (typeof downQueries === "string")
            downQueries = [downQueries];

        this.sqlInMemory.upQueries.push(...upQueries);
        this.sqlInMemory.downQueries.push(...downQueries);

        // if sql-in-memory mode is enabled then simply store sql in memory and return
        if (this.sqlMemoryMode === true)
            return Promise.resolve() as Promise<any>;

        await PromiseUtils.runInSequence(upQueries, upQuery => this.query(upQuery));
    }

}