export const notEmptyArray = [array => array.length && array.length > 0, "{PATH} must not be empty"];

export const validateField = (fieldName, regexp, message) => value => {
    if (!value || value.length === 0) return `${fieldName} is required`;
    if (!value.match(regexp)) return message;
};

export const validateUsername = (regexp, message) => validateField("username", regexp);

export const validatePassword = (regexp, message) => password => {
    if (!password || password.length === 0) return "Password is required";
    if (!password.match(regexp)) return message;
};