# Caching queries

You can cache results selected by these `QueryBuilder` methods: `getMany`, `getOne`, `getRawMany`, `getRawOne`  and `getCount`.

 You can also cache results selected by these `Repository` methods: `find`, `findAndCount`, `findByIds`, and `count`.

To enable caching you need to explicitly enable it in your connection options:

```typescript
{
    type: "mysql",
    host: "localhost",
    username: "test",
    ...
    cache: true
}
```

When you enable cache for the first time,
you must synchronize your database schema (using CLI, migrations or the `synchronize` connection option).

Then in `QueryBuilder` you can enable query cache for any query:

```typescript
const users = await connection
    .createQueryBuilder(User, "user")
    .where("user.isAdmin = :isAdmin", { isAdmin: true })
    .cache(true)
    .getMany();
```

Equivalent `Repository` query:
```typescript
const users = await connection
    .getRepository(User)
    .find({
        where: { isAdmin: true },
        cache: true
    });
```

This will execute a query to fetch all admin users and cache the results.
Next time you execute the same code, it will get all admin users from the cache.
Default cache lifetime is equal to `1000 ms`, e.g. 1 second.
This means the cache will be invalid 1 second after the query builder code is called.
In practice, this means that if users open the user page 150 times within 3 seconds, only three queries will be executed during this period.
Any users inserted during the 1 second cache window won't be returned to the user.

You can change cache time manually via `QueryBuilder`:

```typescript
const users = await connection
    .createQueryBuilder(User, "user")
    .where("user.isAdmin = :isAdmin", { isAdmin: true })
    .cache(60000) // 1 minute
    .getMany();
```

Or via `Repository`:

```typescript
const users = await connection
    .getRepository(User)
    .find({
        where: { isAdmin: true },
        cache: 60000
    });
```

Or globally in connection options:

```typescript
{
    type: "mysql",
    host: "localhost",
    username: "test",
    ...
    cache: {
        duration: 30000 // 30 seconds
    }
}
```

Also, you can set a "cache id" via `QueryBuilder`:

```typescript
const users = await connection
    .createQueryBuilder(User, "user")
    .where("user.isAdmin = :isAdmin", { isAdmin: true })
    .cache("users_admins", 25000)
    .getMany();
```

Or with `Repository`:
```typescript
const users = await connection
    .getRepository(User)
    .find({
        where: { isAdmin: true },
        cache: { 
            id: "users_admins",
            milisseconds: 25000
        }
    });
```

This gives you granular control of your cache,
for example, clearing cached results when you insert a new user:

```typescript
await connection.queryResultCache.remove(["users_admins"]);
```


By default, TypeORM uses a separate table called `query-result-cache` and stores all queries and results there.
If storing cache in a single database table is not effective for you, 
you can change the cache type to "redis" and TypeORM will store all cached records in redis instead.
Example:

```typescript
{
    type: "mysql",
    host: "localhost",
    username: "test",
    ...
    cache: {
        type: "redis",
        options: {
            host: "localhost",
            port: 6379
        }
    }
}
```

"options" are [redis specific options](https://github.com/NodeRedis/node_redis#options-object-properties). 

You can use `typeorm cache:clear` to clear everything stored in the cache.
