export default {
    general: {
        default: 'Ошибка проверки `{{fieldName}}` значение `{{value}}`',
        required: '{{fieldName}} не заполнено',
        unique: '{{fieldName}} не уникально'
    },
    Number: {
        min: '`{{fieldName}}` ({{value}}) меньше минимального значения ({{min}}).',
        max: '`{{fieldName}}` ({{value}}) больше максимального значения ({{max}}).'
    },
    Date: {
        min: '`{{fieldName}}` ({{value}}) меньше минимальной даты ({{min}}).',
        max: '`{{fieldName}}` ({{value}}) больше максимальное даты ({{max}}).'
    },
    String: {
        enum: '`{value}` неверное значение перечисления `{{fieldName}}`.',
        match: '{{fieldName}} is invalid',
        minlength: '`{{fieldName}}` (`{{value}}`) меньше допустимой длины ({{minLength}}).',
        maxlength: '`{{fieldName}}` (`{{value}}`) больше допустимой длины ({{maxLength}}).'
    }
};