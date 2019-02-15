# Backend tools
Set of useful middlewares, plugins and tools to build backend applications with Node.js. All implementations use Express and mongoose internally.

## Basic utils

### Middleware

#### Security
Reads permissions of the current user from `res.locals` and checks current request method against security schema. For example, if user doesn't have "read" permission and "GET" request is exceuting, middleware will end response with `403` status code. For passed requests, permission result is placed in the `res.locals.permissions` property for further processing.

##### Example
```javascript
const schema = {
    "USER": {
        create: true,
        read: true,
        update: true,
    },
    "MODERATOR": {
        delete: true
    }
}

const user = { roles: ["USER"] };

// Authenticating all requests
app.use((req, res, next) => {
    res.locals.user = user;
    next();
})
app.use("/secured", security(schema));

request(app).get("/secured").expect(200); // `res.locals.permissions` is set to evaluated permissions
request(app).delete("/secured").expect(403, { message: "Access is denied" });
```

#### Validation
Uses `validate` utility of `common-tools` package. It check data validity against constraints
```javascript
const constraints = { field: required() };
app.post("/resource", validator(constraints));
request(app).post("/resource").send({}).expect(403, {
    message: "Validation failed",
    errors: { "field": "Value is required" }
})
```

#### Common
Array of commonly used middlewares, which can be placed in front of your middleware chain
```javascript
commonMiddlewares === [
    helmet(),
    cookieParser(),
    bodyParser.urlencoded({ extended: true }),
    bodyParser.json()
];
```

#### Unauthorized
Checks current user in `res.locals.user`. If there is no any, throws `401` error with `{ message: "Unathorized" }`

#### Not found
Basic json response of status `404` and body `{ message: "Not found" }`. Should be placed in the end of the middleware chain. Logger could be passed to constructor. It should have `warn` method. Logger from current library can be used.
```javascript
const app = express();
app.use(notFound());
request(app).get("/resource").expect(404, { message: "Not found" })
```

#### Internal error
Default error handler. Same as `notFound` middleware, but with status code 500 and response containing error message. Logger also can be passed to the constructor.
```javascript
app.use(internalError());
app.use((req, res) => {
    throw new Error("Failure");
});
request(app).get("/").expect(500, { message: "Failure" })
```

### Crud router
Creates CRUD Express `Route` object which is ready to bind to your app.
Model wrapper should be passed to the router constructor.

Each model method has `permissions` parameter. It is the object of `getPermissions` function of `common-tools` package and it's not required.
Model should have following methods:

|Method                                             |Description|
|---------------------------------------------------|-----------------------------------------|
|getAll({ page, size, filter, sort }, permissions)| Retrieves entry according to options.   |
|count(filter, permissions)                       | Counts entries                          |
|addOne(payload, permissions)                     | Create entry                            |
|getOne(filter, permissions)                      | Retrieve one entry by id filter. `{ id: "1" }|
|updateOne(filter, payload, permissions)          | Update one entry by id filter.          |
|deleteOne(filter, permissions)`                  | Delete one entry by id filter.          |

Crud controller integrated with `security` and `validation` middlewares.
Just provide required schemas to the crud controller constructor.

### Mongo crud model
The default implementation for `MongoDB` is mongoose-based class `MongooseCrudModel`. Excerpt projection and default populatable fields could specified in constructor options.
```javascript
const Model = mongoose.model("Model");
const options = {
    excerptProjection: { field: 1 },
    // Key is path and value is projection
    populate: { user: { firstName: 1, lastName: 1 } },
    // If query filter contains 'search' filter property, then following fields will be used during full-text search. 
    search: "email"
};
const model = new MongooseCrudModel(Model, options);
```

##### Full example

```javascript
import express from "express";
import mongoose, { Schema } from "mongoose";
import { crudRouter, MongooseCrudModel } from "backend-tools";

const userSchema = new Schema({ firstName: String, lastName: String });
User = mongoose.model("User", userSchema);

const model = new MongooseCrudModel(User);
const routerOptions = {
    securitySchema: { /*...*/ },
    validationSchema: { /*...*/ }
};

const Route = crudRouter(model, routerOptions);

const app = express();
app.use("/users", Route);
```

#### Pagination
Get all entries result list is paginated. To traverse the list `page` and `size` query parameters should be used. Links to paging actions returned with `Link` response header. `X-Total-Count` response header used to indicate overall entries count.

`filter` parameter can be passed with plain filter object. To encode parameter value it would be more convinient to use `querystring` library.

`sort` parameter also could be specified. Similarly to `filter` it will be passed to database. Encoding is also preferable with `querystring`