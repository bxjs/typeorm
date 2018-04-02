import {Driver} from "../Driver";
import {ConnectionIsNotSetError} from "../../error/ConnectionIsNotSetError";
import {DriverPackageNotInstalledError} from "../../error/DriverPackageNotInstalledError";
import {DriverUtils} from "../DriverUtils";
import {MysqlQueryRunner} from "./MysqlQueryRunner";
import {ObjectLiteral} from "../../common/ObjectLiteral";
import {ColumnMetadata} from "../../metadata/ColumnMetadata";
import {DateUtils} from "../../util/DateUtils";
import {PlatformTools} from "../../platform/PlatformTools";
import {Connection} from "../../connection/Connection";
import {RdbmsSchemaBuilder} from "../../schema-builder/RdbmsSchemaBuilder";
import {MysqlConnectionOptions} from "./MysqlConnectionOptions";
import {MappedColumnTypes} from "../types/MappedColumnTypes";
import {ColumnType} from "../types/ColumnTypes";
import {DataTypeDefaults} from "../types/DataTypeDefaults";
import {TableColumn} from "../../schema-builder/table/TableColumn";
import {MysqlConnectionCredentialsOptions} from "./MysqlConnectionCredentialsOptions";
import {EntityMetadata} from "../../metadata/EntityMetadata";
import {OrmUtils} from "../../util/OrmUtils";

/**
 * Organizes communication with MySQL DBMS.
 */
export class MysqlDriver implements Driver {

    // -------------------------------------------------------------------------
    // Public Properties
    // -------------------------------------------------------------------------

    /**
     * Connection used by driver.
     */
    connection: Connection;

    /**
     * Mysql underlying library.
     */
    mysql: any;

    /**
     * Connection pool.
     * Used in non-replication mode.
     */
    pool: any;

    /**
     * Pool cluster used in replication mode.
     */
    poolCluster: any;

    // -------------------------------------------------------------------------
    // Public Implemented Properties
    // -------------------------------------------------------------------------

    /**
     * Connection options.
     */
    options: MysqlConnectionOptions;

    /**
     * Master database used to perform all write queries.
     */
    database?: string;

    /**
     * Indicates if replication is enabled.
     */
    isReplicated: boolean = false;

    /**
     * Indicates if tree tables are supported by this driver.
     */
    treeSupport = true;

    /**
     * Gets list of supported column data types by a driver.
     *
     * @see https://www.tutorialspoint.com/mysql/mysql-data-types.htm
     * @see https://dev.mysql.com/doc/refman/5.7/en/data-types.html
     */
    supportedDataTypes: ColumnType[] = [
        "int",
        "tinyint",
        "smallint",
        "mediumint",
        "bigint",
        "float",
        "double",
        "dec",
        "decimal",
        "numeric",
        "date",
        "datetime",
        "timestamp",
        "time",
        "year",
        "char",
        "varchar",
        "nvarchar",
        "blob",
        "text",
        "tinyblob",
        "tinytext",
        "mediumblob",
        "mediumtext",
        "longblob",
        "longtext",
        "enum",
        "json",
        "binary",
        "geometry",
        "point",
        "linestring",
        "polygon",
        "multipoint",
        "multilinestring",
        "multipolygon",
        "geometrycollection"
    ];

    /**
     * Gets list of spatial column data types.
     */
    spatialTypes: ColumnType[] = [
        "geometry",
        "point",
        "linestring",
        "polygon",
        "multipoint",
        "multilinestring",
        "multipolygon",
        "geometrycollection"
    ];

    /**
     * Gets list of column data types that support length by a driver.
     */
    withLengthColumnTypes: ColumnType[] = [
        "char",
        "varchar",
        "nvarchar",
        "binary"
    ];

    /**
     * Gets list of column data types that support precision by a driver.
     */
    withPrecisionColumnTypes: ColumnType[] = [
        "decimal",
        "float",
        "double",
        "time",
        "datetime",
        "timestamp"
    ];

    /**
     * Gets list of column data types that supports scale by a driver.
     */
    withScaleColumnTypes: ColumnType[] = [
        "decimal",
        "float",
        "double",
    ];

    /**
     * Gets list of column data types that supports UNSIGNED and ZEROFILL attributes.
     */
    unsignedAndZerofillTypes: ColumnType[] = [
        "int",
        "smallint",
        "tinyint",
        "mediumint",
        "bigint",
        "decimal",
        "float",
        "double"
    ];

    /**
     * ORM has special columns and we need to know what database column types should be for those columns.
     * Column types are driver dependant.
     */
    mappedDataTypes: MappedColumnTypes = {
        createDate: "datetime",
        createDatePrecision: 6,
        createDateDefault: "CURRENT_TIMESTAMP(6)",
        updateDate: "datetime",
        updateDatePrecision: 6,
        updateDateDefault: "CURRENT_TIMESTAMP(6)",
        version: "int",
        treeLevel: "int",
        migrationId: "int",
        migrationName: "varchar",
        migrationTimestamp: "bigint",
        cacheId: "int",
        cacheIdentifier: "varchar",
        cacheTime: "bigint",
        cacheDuration: "int",
        cacheQuery: "text",
        cacheResult: "text",
    };

    /**
     * Default values of length, precision and scale depends on column data type.
     * Used in the cases when length/precision/scale is not specified by user.
     */
    dataTypeDefaults: DataTypeDefaults = {
        "varchar": { length: 255 },
        "char": { length: 1 },
        "binary": { length: 1 },
        "decimal": { precision: 10, scale: 0 },
        "float": { precision: 12 },
        "double": { precision: 22 }
    };

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(connection: Connection) {
        this.connection = connection;
        this.options = connection.options as MysqlConnectionOptions;
        this.isReplicated = this.options.replication ? true : false;

        // load mysql package
        this.loadDependencies();

        this.database = this.options.replication ? this.options.replication.master.database : this.options.database;

        // validate options to make sure everything is set
        // todo: revisit validation with replication in mind
        // if (!(this.options.host || (this.options.extra && this.options.extra.socketPath)) && !this.options.socketPath)
        //     throw new DriverOptionNotSetError("socketPath and host");
        // if (!this.options.username)
        //     throw new DriverOptionNotSetError("username");
        // if (!this.options.database)
        //     throw new DriverOptionNotSetError("database");
        // todo: check what is going on when connection is setup without database and how to connect to a database then?
        // todo: provide options to auto-create a database if it does not exist yet
    }

    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------

    /**
     * Performs connection to the database.
     */
    async connect(): Promise<void> {

        if (this.options.replication) {
            this.poolCluster = this.mysql.createPoolCluster(this.options.replication);
            this.options.replication.slaves.forEach((slave, index) => {
                this.poolCluster.add("SLAVE" + index, this.createConnectionOptions(this.options, slave));
            });
            this.poolCluster.add("MASTER", this.createConnectionOptions(this.options, this.options.replication.master));

        } else {
            this.pool = await this.createPool(this.createConnectionOptions(this.options, this.options));
        }
    }

    /**
     * Makes any action after connection (e.g. create extensions in Postgres driver).
     */
    afterConnect(): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Closes connection with the database.
     */
    async disconnect(): Promise<void> {
        if (!this.poolCluster && !this.pool)
            return Promise.reject(new ConnectionIsNotSetError("mysql"));

        if (this.poolCluster) {
            return new Promise<void>((ok, fail) => {
                this.poolCluster.end((err: any) => err ? fail(err) : ok());
                this.poolCluster = undefined;
            });
        }
        if (this.pool) {
            return new Promise<void>((ok, fail) => {
                this.pool.end((err: any) => {
                    if (err) return fail(err);
                    this.pool = undefined;
                    ok();
                });
            });
        }
    }

    /**
     * Creates a schema builder used to build and sync a schema.
     */
    createSchemaBuilder() {
        return new RdbmsSchemaBuilder(this.connection);
    }

    /**
     * Creates a query runner used to execute database queries.
     */
    createQueryRunner(mode: "master"|"slave" = "master") {
        return new MysqlQueryRunner(this, mode);
    }

    /**
     * Replaces parameters in the given sql with special escaping character
     * and an array of parameter names to be passed to a query.
     */
    escapeQueryWithParameters(sql: string, parameters: ObjectLiteral, nativeParameters: ObjectLiteral): [string, any[]] {
        const escapedParameters: any[] = Object.keys(nativeParameters).map(key => nativeParameters[key]);
        if (!parameters || !Object.keys(parameters).length)
            return [sql, escapedParameters];

        const keys = Object.keys(parameters).map(parameter => "(:(\\.\\.\\.)?" + parameter + "\\b)").join("|");
        sql = sql.replace(new RegExp(keys, "g"), (key: string) => {
            let value: any;
            if (key.substr(0, 4) === ":...") {
                value = parameters[key.substr(4)];
            } else {
                value = parameters[key.substr(1)];
            }

            if (value instanceof Function) {
                return value();

            } else {
                escapedParameters.push(value);
                return "?";
            }
        }); // todo: make replace only in value statements, otherwise problems
        return [sql, escapedParameters];
    }

    /**
     * Escapes a column name.
     */
    escape(columnName: string): string {
        return "`" + columnName + "`";
    }

    /**
     * Build full table name with database name, schema name and table name.
     * E.g. "myDB"."mySchema"."myTable"
     */
    buildTableName(tableName: string, schema?: string, database?: string): string {
        return database ? `${database}.${tableName}` : tableName;
    }

    /**
     * Prepares given value to a value to be persisted, based on its column type and metadata.
     */
    preparePersistentValue(value: any, columnMetadata: ColumnMetadata): any {
        if (columnMetadata.transformer)
            value = columnMetadata.transformer.to(value);

        if (value === null || value === undefined)
            return value;

        if (columnMetadata.type === Boolean) {
            return value === true ? 1 : 0;

        } else if (columnMetadata.type === "date") {
            return DateUtils.mixedDateToDateString(value);

        } else if (columnMetadata.type === "time") {
            return DateUtils.mixedDateToTimeString(value);

        } else if (columnMetadata.type === "json") {
            return JSON.stringify(value);

        } else if (columnMetadata.type === "timestamp" || columnMetadata.type === "datetime" || columnMetadata.type === Date) {
            return DateUtils.mixedDateToDate(value);

        } else if (columnMetadata.type === "simple-array") {
            return DateUtils.simpleArrayToString(value);

        } else if (columnMetadata.type === "simple-json") {
            return DateUtils.simpleJsonToString(value);
        }

        return value;
    }

    /**
     * Prepares given value to a value to be persisted, based on its column type or metadata.
     */
    prepareHydratedValue(value: any, columnMetadata: ColumnMetadata): any {
        if (value === null || value === undefined)
            return value;

        if (columnMetadata.type === Boolean) {
            value = value ? true : false;

        } else if (columnMetadata.type === "datetime" || columnMetadata.type === Date) {
            value = DateUtils.normalizeHydratedDate(value);

        } else if (columnMetadata.type === "date") {
            value = DateUtils.mixedDateToDateString(value);

        } else if (columnMetadata.type === "json") {
            value = typeof value === "string" ? JSON.parse(value) : value;

        } else if (columnMetadata.type === "time") {
            value = DateUtils.mixedTimeToString(value);

        } else if (columnMetadata.type === "simple-array") {
            value = DateUtils.stringToSimpleArray(value);

        } else if (columnMetadata.type === "simple-json") {
            value = DateUtils.stringToSimpleJson(value);
        }

        if (columnMetadata.transformer)
            value = columnMetadata.transformer.from(value);

        return value;
    }

    /**
     * Creates a database type from a given column metadata.
     */
    normalizeType(column: { type: ColumnType, length?: number|string, precision?: number|null, scale?: number }): string {
        if (column.type === Number || column.type === "integer") {
            return "int";

        } else if (column.type === String || column.type === "nvarchar") {
            return "varchar";

        } else if (column.type === Date) {
            return "datetime";

        } else if ((column.type as any) === Buffer) {
            return "blob";

        } else if (column.type === Boolean) {
            return "tinyint";

        } else if (column.type === "numeric" || column.type === "dec") {
            return "decimal";

        } else if (column.type === "uuid") {
            return "varchar";

        } else if (column.type === "simple-array" || column.type === "simple-json") {
            return "text";

        } else {
            return column.type as string || "";
        }
    }

    /**
     * Normalizes "default" value of the column.
     */
    normalizeDefault(columnMetadata: ColumnMetadata): string {
        const defaultValue = columnMetadata.default;

        if (typeof defaultValue === "number") {
            return "" + defaultValue;

        } else if (typeof defaultValue === "boolean") {
            return defaultValue === true ? "1" : "0";

        } else if (typeof defaultValue === "function") {
            return defaultValue();

        } else if (typeof defaultValue === "string") {
            return `'${defaultValue}'`;

        } else {
            return defaultValue;
        }
    }

    /**
     * Normalizes "isUnique" value of the column.
     */
    normalizeIsUnique(column: ColumnMetadata): boolean {
        return column.entityMetadata.indices.some(idx => idx.isUnique && idx.columns.length === 1 && idx.columns[0] === column);
    }

    /**
     * Returns default column lengths, which is required on column creation.
     */
    getColumnLength(column: ColumnMetadata|TableColumn): string {
        if (column.length)
            return column.length.toString();

        switch (column.type) {
            case String:
            case "varchar":
            case "nvarchar":
                return "255";
            case "uuid":
                return "36";
            default:
                return "";
        }
    }

    /**
     * Creates column type definition including length, precision and scale
     */
    createFullType(column: TableColumn): string {
        let type = column.type;

        // used 'getColumnLength()' method, because MySQL requires column length for `varchar` and `nvarchar` data types
        if (this.getColumnLength(column)) {
            type += `(${this.getColumnLength(column)})`;

        } else if (column.precision !== null && column.precision !== undefined && column.scale !== null && column.scale !== undefined) {
            type += `(${column.precision},${column.scale})`;

        } else if (column.precision !== null && column.precision !== undefined) {
            type += `(${column.precision})`;
        }

        if (column.isArray)
            type += " array";

        return type;
    }

    /**
     * Obtains a new database connection to a master server.
     * Used for replication.
     * If replication is not setup then returns default connection's database connection.
     */
    obtainMasterConnection(): Promise<any> {
        return new Promise<any>((ok, fail) => {
            if (this.poolCluster) {
                this.poolCluster.getConnection("MASTER", (err: any, dbConnection: any) => {
                    err ? fail(err) : ok(this.prepareDbConnection(dbConnection));
                });

            } else if (this.pool) {
                this.pool.getConnection((err: any, dbConnection: any) => {
                    err ? fail(err) : ok(this.prepareDbConnection(dbConnection));
                });
            } else {
                fail(new Error(`Connection is not established with mysql database`));
            }
        });
    }

    /**
     * Obtains a new database connection to a slave server.
     * Used for replication.
     * If replication is not setup then returns master (default) connection's database connection.
     */
    obtainSlaveConnection(): Promise<any> {
        if (!this.poolCluster)
            return this.obtainMasterConnection();

        return new Promise<any>((ok, fail) => {
            this.poolCluster.getConnection("SLAVE*", (err: any, dbConnection: any) => {
                err ? fail(err) : ok(dbConnection);
            });
        });
    }

    /**
     * Creates generated map of values generated or returned by database after INSERT query.
     */
    createGeneratedMap(metadata: EntityMetadata, insertResult: any) {
        const generatedMap = metadata.generatedColumns.reduce((map, generatedColumn) => {
            let value: any;
            if (generatedColumn.generationStrategy === "increment" && insertResult.insertId) {
                value = insertResult.insertId;
            // } else if (generatedColumn.generationStrategy === "uuid") {
            //     console.log("getting db value:", generatedColumn.databaseName);
            //     value = generatedColumn.getEntityValue(uuidMap);
            }

            return OrmUtils.mergeDeep(map, generatedColumn.createValueMap(value));
        }, {} as ObjectLiteral);

        return Object.keys(generatedMap).length > 0 ? generatedMap : undefined;
    }

    /**
     * Differentiate columns of this table and columns from the given column metadatas columns
     * and returns only changed.
     */
    findChangedColumns(tableColumns: TableColumn[], columnMetadatas: ColumnMetadata[]): ColumnMetadata[] {
        return columnMetadatas.filter(columnMetadata => {
            const tableColumn = tableColumns.find(c => c.name === columnMetadata.databaseName);
            if (!tableColumn)
                return false; // we don't need new columns, we only need exist and changed

            // console.log("table:", columnMetadata.entityMetadata.tableName);
            // console.log("name:", tableColumn.name, columnMetadata.databaseName);
            // console.log("type:", tableColumn.type, this.normalizeType(columnMetadata));
            // console.log("length:", tableColumn.length, columnMetadata.length);
            // console.log("precision:", tableColumn.precision, columnMetadata.precision);
            // console.log("scale:", tableColumn.scale, columnMetadata.scale);
            // console.log("zerofill:", tableColumn.zerofill, columnMetadata.zerofill);
            // console.log("unsigned:", tableColumn.unsigned, columnMetadata.unsigned);
            // console.log("comment:", tableColumn.comment, columnMetadata.comment);
            // console.log("default:", tableColumn.default, columnMetadata.default);
            // console.log("default changed:", !this.compareDefaultValues(this.normalizeDefault(columnMetadata), tableColumn.default));
            // console.log("isPrimary:", tableColumn.isPrimary, columnMetadata.isPrimary);
            // console.log("isNullable:", tableColumn.isNullable, columnMetadata.isNullable);
            // console.log("isUnique:", tableColumn.isUnique, this.normalizeIsUnique(columnMetadata));
            // console.log("isGenerated:", tableColumn.isGenerated, columnMetadata.isGenerated);
            // console.log("==========================================");

            return tableColumn.name !== columnMetadata.databaseName
                || tableColumn.type !== this.normalizeType(columnMetadata)
                || tableColumn.length !== columnMetadata.length
                || tableColumn.precision !== columnMetadata.precision
                || tableColumn.scale !== columnMetadata.scale
                || tableColumn.zerofill !== columnMetadata.zerofill
                || tableColumn.unsigned !== columnMetadata.unsigned
                // || tableColumn.comment !== columnMetadata.comment // todo
                || !this.compareDefaultValues(this.normalizeDefault(columnMetadata), tableColumn.default)
                || tableColumn.isPrimary !== columnMetadata.isPrimary
                || tableColumn.isNullable !== columnMetadata.isNullable
                || tableColumn.isUnique !== this.normalizeIsUnique(columnMetadata)
                || (columnMetadata.generationStrategy !== "uuid" && tableColumn.isGenerated !== columnMetadata.isGenerated);
        });
    }

    /**
     * Returns true if driver supports RETURNING / OUTPUT statement.
     */
    isReturningSqlSupported(): boolean {
        return false;
    }

    /**
     * Returns true if driver supports uuid values generation on its own.
     */
    isUUIDGenerationSupported(): boolean {
        return false;
    }

    /**
     * Creates an escaped parameter.
     */
    createParameter(parameterName: string, index: number): string {
        return "?";
    }

    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------

    /**
     * Loads all driver dependencies.
     */
    protected loadDependencies(): void {
        try {
            this.mysql = PlatformTools.load("mysql");  // try to load first supported package
            /*
             * Some frameworks (such as Jest) may mess up Node's require cache and provide garbage for the 'mysql' module
             * if it was not installed. We check that the object we got actually contains something otherwise we treat
             * it as if the `require` call failed.
             *
             * @see https://github.com/typeorm/typeorm/issues/1373
             */
            if (Object.keys(this.mysql).length === 0) {
                throw new Error("'mysql' was found but it is empty. Falling back to 'mysql2'.");
            }
        } catch (e) {
            try {
                this.mysql = PlatformTools.load("mysql2"); // try to load second supported package

            } catch (e) {
                throw new DriverPackageNotInstalledError("Mysql", "mysql");
            }
        }
    }

    /**
     * Creates a new connection pool for a given database credentials.
     */
    protected createConnectionOptions(options: MysqlConnectionOptions, credentials: MysqlConnectionCredentialsOptions): Promise<any> {

        credentials = Object.assign(credentials, DriverUtils.buildDriverOptions(credentials)); // todo: do it better way

        // build connection options for the driver
        return Object.assign({}, {
            charset: options.charset,
            timezone: options.timezone,
            connectTimeout: options.connectTimeout,
            insecureAuth: options.insecureAuth,
            supportBigNumbers: options.supportBigNumbers !== undefined ? options.supportBigNumbers : true,
            bigNumberStrings: options.bigNumberStrings !== undefined ? options.bigNumberStrings : true,
            dateStrings: options.dateStrings,
            debug: options.debug,
            trace: options.trace,
            multipleStatements: options.multipleStatements,
            flags: options.flags
        }, {
            host: credentials.host,
            user: credentials.username,
            password: credentials.password,
            database: credentials.database,
            port: credentials.port,
            ssl: options.ssl
        }, options.extra || {});
    }

    /**
     * Creates a new connection pool for a given database credentials.
     */
    protected createPool(connectionOptions: any): Promise<any> {

        // create a connection pool
        const pool = this.mysql.createPool(connectionOptions);

        // make sure connection is working fine
        return new Promise<void>((ok, fail) => {
            // (issue #610) we make first connection to database to make sure if connection credentials are wrong
            // we give error before calling any other method that creates actual query runner
            pool.getConnection((err: any, connection: any) => {
                if (err)
                    return pool.end(() => fail(err));

                connection.release();
                ok(pool);
            });
        });
    }

    /**
     * Attaches all required base handlers to a database connection, such as the unhandled error handler.
     */
    private prepareDbConnection(connection: any): any {
        const { logger } = this.connection;
        /*
          Attaching an error handler to connection errors is essential, as, otherwise, errors raised will go unhandled and
          cause the hosting app to crash.
         */
        if (connection.listeners("error").length === 0) {
            connection.on("error", (error: any) => logger.log("warn", `MySQL connection raised an error. ${error}`));
        }
        return connection;
    }

    /**
     * Checks if "DEFAULT" values in the column metadata and in the database are equal.
     */
    protected compareDefaultValues(columnMetadataValue: string, databaseValue: string): boolean {
        if (typeof columnMetadataValue === "string" && typeof databaseValue === "string") {
            // we need to cut out "'" because in mysql we can understand returned value is a string or a function
            // as result compare cannot understand if default is really changed or not
            columnMetadataValue = columnMetadataValue.replace(/^'+|'+$/g, "");
            databaseValue = databaseValue.replace(/^'+|'+$/g, "");
        }

        return columnMetadataValue === databaseValue;
    }

}
