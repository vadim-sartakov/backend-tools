import bindRoutes from '../controller/userController';

const initialize = app => {
    bindRoutes(app);
}

export default initialize;