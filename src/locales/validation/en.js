export default {
    default: 'Validation failed for field `{PATH}` with value `{VALUE}`',
    required: '`{PATH}` is required',
    unique: '`{PATH}` is not unique',
    enum: '`{VALUE}` is not a valid enum value for path `{PATH}`.',
    regexp: '{PATH} is invalid',
    minlength: '`{PATH}` (`{VALUE}`) is shorter than the minimum allowed length ({MINLENGTH}).',
    maxlength: '`{PATH}` (`{VALUE}`) is longer than the maximum allowed length ({MAXLENGTH}).',
    min: '`{PATH}` ({VALUE}) is less than minimum allowed value ({MIN}).',
    max: '`{PATH}` ({VALUE}) is more than maximum allowed value ({MAX}).'
};