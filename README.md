# Backend tools
Set of useful middlewares, plugins and tools to build backend applications with Node.js. All implementations use Express and mongoose internally.

## Basic utils

### Logger
Combines together "winston" and "debug" libraries. Provides convinient and ready to use logger factory.
    
```javascript
import { createLogger } from "backend-tools";
const logger = createLogger("server");
```

Function accepts logger label and returns winston logger with suitable decorators and formatters. It already has 2 transports: both console and file. Logs directory specified with `LOG_PATH` environment variable, default is `./log` directory. Directory creates automatically if it's absent.
To determine the level of Logger "debug" library is used. So environment variable `DEBUG` is taking in count.

### Middleware
#### Common
Array of commonly used middlewares, which can be placed in front of your middleware chain
```javascript
import { commonMiddlewars } from "backend-tools";
commonMiddlewares === [
    helmet(),
    cookieParser(),
    bodyParser.urlencoded({ extended: true }),
    bodyParser.json()
];
```

#### Not found
Basic json response of status `404` and body `{ message: "Not found" }`. Should be placed in the end of the middleware chain. Logger could be passed to constructor. It should have `warn` method. Logger from current library can be used.
```javascript
import express from "express";
import { notFound } from "backend-tools";

const app = express();
app.use(notFound())
```

#### Internal error
Default error handler. Same as `notFound` middleware, but with status code 500 and response containing error message. Logger also can be passed to the constructor.
```javascript
import { internalError } from "backend-tools";

const app = express();
app.use(internalError())
```

### Crud router
Creates CRUD Express `Route` object which is ready to bind to your app.
Model wrapper should be passed to the router constructor. There is implemented `MongooseCrudModel` for `MongoDB`

Each model method has `permissions` parameter. It is the object of `getPermissions` function of `shared-tools` package and it's not required.
Model should have following methods:

|Method                                             |Description|
|---------------------------------------------------|-----------------------------------------|
|`getAll({ page, size, filter, sort }, permissions)`| Retrieves entry according to options.   |
|`count(filter, permissions)`                       | Counts entries                          |
|`addOne(payload, permissions)`                     | Create entry                            |
|`getOne(filter, permissions)`                      | Retrieve one entry by id filter. `{ id: "1" }`|
|`updateOne(filter, payload, permissions)`          | Update one entry by id filter.          |
|`deleteOne(filter, permissions)`                   | Delete one entry by id filter.          |

```javascript
import express from "express";
import mongoose, { Schema } from "mongoose";
import { crudRouter, MongooseCrudModel } from "backend-tools";

const userSchema = new Schema({ firstName: String, lastName: String });
User = mongoose.model("User", userSchema);

const Route = crudRouter(new MongooseCrudModel(User));

const app = express();
app.use("/users", Route);
```

#### Get all
Result list is paginated. To traverse the list `page` and `size` query parameters should be used. Links to paging actions returned with `Link` response header. `X-Total-Count` response header used to indicate overall entries count.

`filter` parameter can be passed with plain filter object. To encode parameter value it would be more convinient to use `querystring` library.

`sort` parameter also could be specified. Similarly to `filter` it will be passed to database. Encoding is also preferable with `querystring`