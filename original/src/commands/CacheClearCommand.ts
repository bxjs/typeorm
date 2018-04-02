import {createConnection} from "../index";
import {ConnectionOptionsReader} from "../connection/ConnectionOptionsReader";
import {Connection} from "../connection/Connection";
const chalk = require("chalk");

/**
 * Clear cache command.
 */
export class CacheClearCommand {

    command = "cache:clear";
    describe = "Clears all data stored in query runner cache.";

    builder(yargs: any) {
        return yargs
            .option("connection", {
                alias: "c",
                default: "default",
                describe: "Name of the connection on which run a query."
            })
            .option("config", {
                alias: "f",
                default: "ormconfig",
                describe: "Name of the file with connection configuration."
            });
    }

    async handler(argv: any) {

        let connection: Connection|undefined = undefined;
        try {
            const connectionOptionsReader = new ConnectionOptionsReader({ root: process.cwd(), configName: argv.config });
            const connectionOptions = await connectionOptionsReader.get(argv.connection);
            Object.assign(connectionOptions, {
                subscribers: [],
                synchronize: false,
                migrationsRun: false,
                dropSchema: false,
                logging: ["schema"]
            });
            connection = await createConnection(connectionOptions);

            if (!connection.queryResultCache)
                return console.log(chalk.black.bgRed("Cache is not enabled. To use cache enable it in connection configuration."));

            await connection.queryResultCache.clear();
            console.log(chalk.green("Cache was successfully cleared"));

            if (connection) await connection.close();

        } catch (err) {
            if (connection) await (connection as Connection).close();

            console.log(chalk.black.bgRed("Error during cache clear:"));
            console.error(err);
            process.exit(1);
        }
    }

}