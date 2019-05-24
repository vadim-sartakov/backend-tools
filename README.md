# Backend tools
Set of useful middlewares, plugins and tools to build backend applications with Node.js.

## Basic utils

### Middleware

#### Security
Reads permissions of the current user from `res.locals` and checks binded access modifiers against security schema. For passed requests, permission result is placed in the `res.locals.permissions` property for further processing. Debug logger with prefix `middleware:security` is using.

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
const dummyMiddleware = (req, res, next) => next());

// Authenticating all requests
app.use((req, res, next) => {
    res.locals.user = user;
    next();
})
app.get("/secured", security(schema, "read"), dummyMiddleware);
app.delete("/secured", security(schema, "read", "delete"), dummyMiddleware);

request(app).get("/secured").expect(200); // `res.locals.permissions` is set to evaluated permissions
// Since user is of role "USER", and they don't have 'delete' permission according to schema, access is denied.
request(app).delete("/secured").expect(403, { message: "Access is denied" });
```

#### Validation
Uses `validate` utility of `common-tools` package. It check data validity against constraints. Debug logger with prefix `middleware:validator` is using.
```javascript
const constraints = { field: required() };
app.post("/resource", validator(constraints));
request(app).post("/resource").send({}).expect(403, {
    message: "Validation failed",
    errors: { "field": "Value is required" }
})
```

#### Common middlewares
Array of commonly used middlewares, which can be placed in front of your middleware chain.
```javascript
commonMiddlewares = [
    helmet(),
    cookieParser(),
    bodyParser.urlencoded({ extended: true }),
    bodyParser.json()
];
```

#### Unauthorized
Checks current user in `res.locals.user`. If there is no any, throws `401` error with `{ message: "Unathorized" }`. Debug logger with prefix `middleware:unauthorized` is using.

#### Not found
Basic json response of status `404` and body `{ message: "Not found" }`. Should be placed in the end of the middleware chain. Logger could be passed to constructor. It should have `warn` method. Logger from current library can be used. Debug logger with prefix `middleware:notFound` is using.
```javascript
const app = express();
app.use(notFound());
request(app).get("/resource").expect(404, { message: "Not found" })
```

#### Internal error
Default error handler. Same as `notFound` middleware, but with status code 500 and response containing error message. Logger also can be passed to the constructor. Debug logger with prefix `middleware:internalError` is using.
```javascript
app.use(internalError());
app.use((req, res) => {
    throw new Error("Failure");
});
request(app).get("/").expect(500, { message: "Failure" })
```

### Graph find mongoose plugin
Allows to query related Model instances utilizing mongodb pipelines. Relying to mongoose populatable references definition types, it uses lookup to join instances instead of separate queries. It makes possible to filter documents based on joined instances values.

Plugin adds `graphFind(options)` and `gprahFindOne(options)` static methods to model.

Supports the following options:
- skip
- limit
- projection
- filter
- sort
- maxDepth - defaults to 1. `true` will load whole tree.

Plugin relies on projection to determine whether the related instance should be joined or not.

#### Initializing
```javascript
const childSchema = new Schema({ field: String }, options);
const exampleSchema = new Schema({
    field: String,
    child: { type: Schema.Types.ObjectId, ref: "Child" } // Same definition as for populate
});

exampleSchema.plugin(graphFindPlugin);

const ChildModel = mongoose.model("Child", childSchema);
const ExampleModel = mongoose.model("Example", exampleSchema);

// graphFind and gprahFindOne are now static methods of ExampleModel
```

Options are typical mongoose schema options, it could also include:
- searchFields - fields which be used in full-text search, e.g. `['field', 'child.field']`
- maxDepth - maximum graph loading depth

### Crud router
Creates CRUD Express `Route` object which is ready to bind to your app.
It binds crud actions to related HTTP methods and paths:

- getAll - `GET '/'`
- addOne - `POST '/'`
- getOne - `GET '/:id'`
- updateOne - `PUT '/:id'`
- deleteOne - `GET '/:id'`

It already has many convinient features like pagination, filtering, sorting, validation and security.

#### Initializing
```javascript
const crudModel = new MongooseCrudModel(modelArgs);
const crudRouter = new CrudRouter(crudModel, options);
const app = express();
app.use("/users", crudRouter.router); // Now application has CRUD routes '/users' and '/users/:id'
```

`CrudRouter` has preconfigured router properties (`rootRouter` and `idRouter`) which can be used to further extend middleware chains.

#### Crud model
One could easily define custom crud model. The following methods are required:

- getAll({ page, size, filter, projection, sort, search })
- count(filter)
- addOne(payload)
- getOne(filter, projection)
- updateOne(filter, payload)
- deleteOne(filter)

Argument objects (filter, projection, sort) should be crud-model compatible.

There is predefined `MongooseCrudModel` which based on `graphFind` plugin. All related argument objects (filter, projection, sort) expected to be mongoose-compatible.

#### CrudRouter options:
```javascript
defaultOptions = {
  securitySchema,
  validationSchema,
  idProperty, // persistent instances id property (default: '_id' - common for mongo crud models)
  returnValue, // Whether return value or not on create, update and delete, default: false
  getAll: {
    defaultProjection,
    defaultPageSize // default: 20
  },
  addOne: {},
  getOne: {
      defaultProjection
  },
  updateOne: {},
  deleteOne: {}
}
```

#### Pagination, sorting, filtering, search
`getAll` action result list is paginated. To traverse the list `page` and `size` query parameters should be used. Links to paging actions returned with `Link` response header. `X-Total-Count` response header used to indicate overall entries count.

`filter` parameter can be passed with plain filter object. To encode parameter value it would be more convinient to use `querystring` library.

`sort` parameter also could be specified. Similarly to `filter` it will be passed to database. Encoding is also preferable with `querystring`

`search` is passing down to crud model assuming the model knows how to handle the full-text search query.

Example query is valid (should be url-encoded): `/users?page=1&size=20&filter={"id":"1"}&sort={"order":"1"}`