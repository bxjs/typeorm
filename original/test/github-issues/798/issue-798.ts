import "reflect-metadata";
import * as assert from "assert";
import {createConnection, getConnectionOptions} from "../../../src/index";
import {Connection} from "../../../src/connection/Connection";

describe("github issues > #798 sqlite: 'database' path in ormconfig.json is not relative", () => {
    let connection: Connection;
    const oldCwd = process.cwd();

    before(function () {
        process.chdir("..");
    });

    after(function () {
        process.chdir(oldCwd);
    });

    afterEach(() => {
        if (connection && connection.isConnected) {
            connection.close();
        }
    });

    it("should find the sqlite database if the cwd is changed", async function () {
        const options = await getConnectionOptions("sqlite");
        connection = await createConnection(options);

        assert.strictEqual(connection.isConnected, true);
    });

});