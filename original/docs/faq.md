# FAQ

* [How do I change a column name in the database?](#how-do-i-change-a-column-name-in-the-database)
* [How can I set value of default some function, for example `NOW()`?](#how-can-i-set-value-of-default-some-function-for-example-now)
* [How to do validation?](#how-to-do-validation)
* [What does "owner side" in relations mean or why we need to put `@JoinColumn` and `@JoinTable` decorators?](#what-does-owner-side-in-a-relations-mean-or-why-we-need-to-use-joincolumn-and-jointable)
* [How do I add extra columns into many-to-many (junction) table?](#how-do-i-add-extra-columns-into-many-to-many-junction-table)
* [How to use TypeORM with dependency injection tool?](#how-to-use-typeorm-with-a-dependency-injection-tool)
* [How to handle outDir TypeScript compiler option?](#how-to-handle-outdir-typescript-compiler-option)
* [How to use TypeORM with ts-node?](#how-to-use-typeorm-with-ts-node)
* [How to use Webpack for the backend](#how-to-use-webpack-for-the-backend)


## How do I update a database schema?

One of the main responsibilities of TypeORM is to keep your database tables in sync with your entities.
There are two ways that help you achieve this:

* Use `synchronize: true` in your connection options:
    
    ```typescript
    import {createConnection} from "typeorm";
    
    createConnection({
        synchronize: true
    });
    ```

    This option automatically syncs your database tables with the given entities each time you run this code. 
    This option is perfect during development, but in production you may not want this option to be enabled.

* Use command line tools and run schema sync manually in the command line:
    
    ```
    typeorm schema:sync
    ```
    
    This command will execute schema synchronization. 
    Note, to make command line tools work, you must create an ormconfig.json file.

Schema sync is extremely fast. 
If you are considering the disable synchronize option during development because of performance issues, 
first check how fast it is.

## How do I change a column name in the database?

By default, column names are generated from property names.
You can simply change it by specifying a `name` column option:

```typescript
@Column({ name: "is_active" })
isActive: boolean;
```

## How can I set the default value to some function, for example `NOW()`?

`default` column option supports a function. 
If you are passing a function which returns a string,
it will use that string as a default value without escaping it.
For example: 

```typescript
@Column({ default: () => "NOW()" })
date: Date;
```

## How to do validation?

Validation is not part of TypeORM because validation is a separate process
not really related to what TypeORM does.
If you want to use validation use [class-validator](https://github.com/pleerock/class-validator) - it works perfectly with TypeORM.

## What does "owner side" in a relations mean or why we need to use `@JoinColumn` and `@JoinTable`?

Let's start with `one-to-one` relation.
Let's say we have two entities: `User` and `Photo`:

```typescript
@Entity()
export class User {
    
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    name: string;
    
    @OneToOne()
    photo: Photo;
    
}
```

```typescript
@Entity()
export class Photo {
    
    @PrimaryGeneratedColumn()
    id: number;
    
    @Column()
    url: string;
    
    @OneToOne()
    user: User;
    
}
```

This example does not have a `@JoinColumn` which is incorrect.
Why? Because to make a real relation, we need to create a column in the database.
We need to create a column `userId` in `photo` or `photoId` in `user`.
But which column should be created - `userId` or `photoId`?
TypeORM cannot decide for you. 
To make a decision, you must use `@JoinColumn` on one of the sides.
If you put `@JoinColumn` in `Photo` then a column called `userId` will be created in the `photo` table.
If you put `@JoinColumn` in `User` then a column called `photoId` will be created in the `user` table.
The side with `@JoinColumn` will be called the "owner side of the relationship".
The other side of the relation, without `@JoinColumn`, is called the "inverse (non-owner) side of relationship".

It is the same in a `@ManyToMany` relation. You use `@JoinTable` to show the owner side of the relation.

In `@ManyToOne` or `@OneToMany` relations, `@JoinColumn` is not necessary because 
both decorators are different, and the table where you put the `@ManyToOne` decorator will have the relational column. 

`@JoinColumn` and `@JoinTable` decorators can also be used to specify additional
join column / junction table settings, like join column name or junction table name. 

## How do I add extra columns into many-to-many (junction) table?

It's not possible to add extra columns into a table created by a many-to-many relation.
You'll need to create a separate entity and bind it using two many-to-one relations with the target entities
(the effect will be same as creating a many-to-many table), 
and add extra columns in there.

## How to use TypeORM with a dependency injection tool?

In TypeORM you can use service containers. Service containers allow you to inject custom services in some places, like in subscribers or custom naming strategies. For example, you can get access to ConnectionManager from any place using a service container.

Here is an example for how you can set up typedi service containers with TypeORM. Note: you can setup any service container with TypeORM.

```typescript
import {useContainer, createConnection} from "typeorm";
import {Container} from "typedi";

// its important to setup container before you start to work with TypeORM
useContainer(Container);
createConnection({/* ... */});
```

## How to handle outDir TypeScript compiler option?

When you are using the `outDir` compiler option, don't forget to copy assets and resources your app is using into the output directory.
Otherwise, make sure to setup correct paths to those assets.

One important thing to know is that when you remove or move entities, the old entities are left untouched inside the ouput directory.
For example, you create a `Post` entity and rename it to `Blog`,
you no longer have `Post.ts` in your project. However, `Post.js` is left inside the output directory.
Now, when TypeORM reads entities from your output directory, it sees two entities - `Post` and `Blog`.
This may be a source of bugs. 
That's why when you remove and move entities with `outDir` enabled, it's strongly recommended to remove your output directory and recompile the project again. 

## How to use TypeORM with ts-node?

You can prevent compiling files each time using [ts-node](https://github.com/TypeStrong/ts-node).
If you are using ts-node, you can specify `ts` entities inside your connection options:

```
{
    entities: ["src/entity/*.ts"],
    subscribers: ["src/subscriber/*.ts"]
}
```

Also, if you are compiling js files into the same folder where your typescript files are, 
make sure to use the `outDir` compiler option to prevent 
[this issue](https://github.com/TypeStrong/ts-node/issues/432). 

Also, if you want to use the ts-node CLI, you can execute TypeORM the following way:

```
ts-node ./node_modules/bin/typeorm schema:sync
```

## How to use Webpack for the backend?

Webpack produces warnings due to what it views as missing require statements -- require statements for all drivers supported by TypeORM. To suppress these warnings for unused drivers, you will need to edit your webpack config file.

```js
const FilterWarningsPlugin = require('webpack-filter-warnings-plugin');

module.exports = {
    ...
    plugins: [
        //ignore the drivers you don't want. This is the complete list of all drivers -- remove the suppressions for drivers you want to use.
        new FilterWarningsPlugin({
            exclude: [/mongodb/, /mssql/, /mysql/, /mysql2/, /oracledb/, /pg/, /pg-native/, /pg-query-stream/, /redis/, /sqlite3/]
        })
    ]
};
```
