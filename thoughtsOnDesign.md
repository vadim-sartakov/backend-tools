## Middleware functions VS class

It couldn't be plain functions, it should be a class.
Because crud methods should be able to call each other. e.g. to return entry after deletion but apply security schema to the returned value.

## Projection structure.

There are few options:

- Mongoose - style: "id name", "-id -name". Pros: simple, easy to write. Cons: ambiguous definition(should check type mixing), hard to process in code. Because one can't easily tell if it's exclusive or inclusive projection.
- Sequelize - style: ['id', 'name'], { exclude: [] }.
- Custom: ['id', 'name'], { exclusive: true, projection: ['id', name] }.

## Abstraction layers.

Obviously, there are two levels: controller and crud database wrapper. Question: what should be done on different levels?
We should handle:
- General method security (if user allowed to execute this particular method - getOne or updateOne)
- validation on POST and PUT
- transform entry-level security filter and security projection to the database query

```javascript
import { CrudRouter } from 'backend-tools';

const crudRouter = new CrudRouter();
```

## Permissions handling level.

One of main questions: where to transform evaluated user permissions (projection and filter) to query parameters? Controller or CrudModel?