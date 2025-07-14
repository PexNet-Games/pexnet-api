const swaggerAutogen = require("swagger-autogen")();

swaggerAutogen("../../swagger_output.json", ["src/app.ts"]);