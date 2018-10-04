# Backend tools
Set of useful middlewares, plugins and tools to build backend applications with Node.js. All implementations use Express and mongoose internally.

## Basic utils

### Logger
Combines together "winston" and "debug" libraries. Provides convinient and ready to use logger factory.
    
```javascript
import { createLogger } from "backend-tools";
const logger = createLogger("server");
```

Function returns winston logger with suitable decorators and formatters. It already has 2 transports: both console and file. Logs saved to "./log" directory. Directory creates automatically if it's absent.
To determine the level of Logger "debug" library is used. So environment variable DEBUG is taking in count.

### Crud router
Creates CRUD Express `Route` object which is ready to bind to your app.

```javascript
import express from "express";
import mongoose, { Schema } from "mongoose";
import { crudRouter } from "backend-tools";

const userSchema = new Schema({ firstName: String, lastName: String });
User = mongoose.model("User", userSchema);

const Route = crudRouter(User);

const app = express();
app.use("/users", Route);
```

#### Get all
Result list is paginated. To traverse the list `page` and `size` query parameters should be used. Links to paging actions returned with `Link` response header. `X-Total-Count` response header used to indicate overall entries count.

`filter` parameter can be passed with `MongoDB` filter object. To encode parameter value it would be more convinient to use `querystring` library.

`sort` parameter also could be specified. Similarly to `filter` it will be passed to `MongoDB` as `sort` object. Encoding is also preferable with `querystring`

## Mongoose plugins

### Autopopulate
Uses "mongoose-autopopulate" internally but with the idea to not populate fields which are not currently selected in the query and provides ability to set this plugin globally only once.

```javascript
import mongoose, { Schema } from "mongoose";
import { autopopulate } from "backend-tools";

// Defining schemas
const roleSchema = new Schema({ key: String, description: String }, { populateProjection: "key" });
const departmentSchema = new Schema({ name: String, address: String }, { populateProjection: "name" });
const userSchema = new Schema({ roles: [{ type: Schema.Types.ObjectId, ref: "Role" }]

// Adding plugin
mongoose.plugin(autopopulate);

// Creating models
Role = mongoose.model("Role", roleSchema);
Department = mongoose.model("Department", departmentSchema);
User = mongoose.model("User", userSchema);

// Querying
User.findOne().select("firstName roles").then(result => {
    /* result will not contain department field, though it's autopopulatable. Also Role will be populated with only "key" field.*/
});
```

### Security
Model level security can be defined as option of schema. Security object contains keys as roles and each role contains object with the following structure:

```javascript
{
    ROLE_ONE_KEY: {
        create: true,
        read: { where: user => ({ user.department }), projection: "firstName" }
    }
}
```

Example
```javascript
import mongoose, { Schema } from "mongoose";

const userSchema = new Schema({ firstName: String, lastName: String }, {
    security: {
        "USER": { create: {  } }
    }
});

User = connection.model("User", userSchema);
```

By default middleware prohibits all actions unless opposite were defined in schema security options.

System role `ADMIN` will permit any requested access and `ADMIN_READ` role will permit any `read` access.

### i18n