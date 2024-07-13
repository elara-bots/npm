module.exports = {
    "env": {
        "node": true,
        "ES2021": true
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
        "@typescript-eslint/ban-ts-comment": 0,
        "semi": ["error", "always"],
        "curly": ["error", "all"],
        "@typescript-eslint/no-var-requires": 0,
        "object-shorthand": "error",
        "no-warning-comments": "warn",
    },
    "ignorePatterns": [
        "dist/*",
        "docs/*",
        "node_modules/*"
    ]
};