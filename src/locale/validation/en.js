export default {
    default: 'Validation failed',
    required: '`{{fieldName}}` is required',
    unique: '`{{fieldName}}` is not unique',
    enum: '`{{value}}` is not a valid enum value for path `{{fieldName}}`.',
    regexp: '`{{fieldName}}` is invalid',
    minlength: '`{{fieldName}}` (`{{value}}`) is shorter than the minimum allowed length ({{minLength}}).',
    maxlength: '`{{fieldName}}` (`{{value}}`) is longer than the maximum allowed length ({{maxLength}}).',
    min: '`{{fieldName}}` ({{value}}) is less than minimum allowed value ({{min}}).',
    max: '`{{fieldName}}` ({{value}}) is more than maximum allowed value ({{max}}).'
};