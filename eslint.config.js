import js from "@eslint/js";

export default [
    js.configs.recommended,
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "script",
            globals: {
                // Browser globals
                document: "readonly",
                window: "readonly",
                console: "readonly",
                localStorage: "readonly",
                navigator: "readonly",
                confirm: "readonly",
                alert: "readonly",
                setTimeout: "readonly",
                setInterval: "readonly",
                clearTimeout: "readonly",
                clearInterval: "readonly",
                // ES6+ globals
                JSON: "readonly",
                Set: "readonly",
                Map: "readonly",
                Promise: "readonly",
                URL: "readonly",
                ArrayBuffer: "readonly",
                // data/wishes.js globals
                people: "readonly",
                wishesByPerson: "readonly"
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-console": "off",
            "no-undef": "error",
            "eqeqeq": ["error", "always"],
            "no-var": "error",
            "prefer-const": "warn"
        }
    }
];
