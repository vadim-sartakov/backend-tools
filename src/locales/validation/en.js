export default {
    general: {
        default: 'Validation failed for field `{{fieldName}}` with value `{{value}}`',
        required: '{{fieldName}} is required',
        unique: '{{fieldName}} is not unique'
    },
    Number: {
        min: '`{{fieldName}}` ({{value}}) is less than minimum allowed value ({{min}}).',
        max: '`{{fieldName}}` ({{value}}) is more than maximum allowed value ({{max}}).'
    },
    Date: {
        min: '`{{fieldName}}` ({{value}}) is before minimum allowed value ({{min}}).',
        max: '`{{fieldName}}` ({{value}}) is after maximum allowed value ({{max}}).'
    },
    String: {
        enum: '`{value}` is not a valid enum value for path `{{fieldName}}`.',
        match: '{{fieldName}} is invalid',
        minlength: '`{{fieldName}}` (`{{value}}`) is shorter than the minimum allowed length ({{minLength}}).',
        maxlength: '`{{fieldName}}` (`{{value}}`) is longer than the maximum allowed length ({{maxLength}}).'
    }
};