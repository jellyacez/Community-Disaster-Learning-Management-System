const { betterAuth } = require("better-auth");
const pool = require("../config/db");

const auth = betterAuth({
    database: pool,
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: {
        enabled: true
    }
});

module.exports = { auth };
