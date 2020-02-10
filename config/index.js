'use strict';

module.exports = {
    DEBUG: true,

    PROVIDER: "http://127.0.0.1:1317",

    TITLE: "Terra Wallet",
    PORT: 8080,

    CHAIN_ID: "chain-id",

    MASTER_MNEMONIC: "mnemonic",
    BLOCK_TIME: 5000,

    TRANSACTION_CHECK_PAGE_SIZE: 10,

    BOOTSTRAP_HEIGHT: 0,

    DEFAULT_DENOM: "uluna",
    DENOM: ["uluna", "usdr", "ukrw", "uusd", "ucny", "ugbp", "ueur"],
    FEES: [{
        "denom": "uluna",
        "amount": "1",
    }],

    BASIC_AUTH_ID: "terra",
    BASIC_AUTH_PASSWORD: "terra-password"
};
