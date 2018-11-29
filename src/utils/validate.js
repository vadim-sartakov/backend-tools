import { ValidationError } from "../error";

export const validate = validationSchema => {

    const validationError = new ValidationError();
    validationError.errors = {};

    return validationError;

};