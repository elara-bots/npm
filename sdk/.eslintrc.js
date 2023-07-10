module.exports = {
    "env": {
        "node": true,
        "es2021": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "overrides": [
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "plugins": [
        "@typescript-eslint"
    ],
    "rules": {
        "@typescript-eslint/no-empty-function": 0,
        "no-extra-semi": 0,
        "no-async-promise-executor": 0,
        "no-warning-comments": "warn",
        "no-empty": 0,
        "semi": ["error", "always"],
        "curly": ["error", "all"],
        "@typescript-eslint/no-var-requires": 0,
        "object-shorthand": "error",
    }
};