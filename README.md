# terra-wallet
terra blockchain wallet library

# How to run Terra-Core LCD
ref: https://github.com/terra-project/core/blob/develop/docs/guide/light-client.md

# Create New Address
curl -X POST -isu terra:terra-password http://127.0.0.1:8080/address/new

# Show Address List
curl -X GET -isu terra:terra-password http://127.0.0.1:8080/address/list


# Query Transaction
curl -X GET -isu terra:terra-password http://127.0.0.1:8080/txs\?page\=1\&limit\=10\&events\='message.action=send'

curl -X GET -isu terra:terra-password http://127.0.0.1:8080/txs\?page\=1\&limit\=10\&events\='message.action=send%26message.sender=terra12c5s58hnc3c0pjr5x7u68upsgzg2r8fwq5nlsy'

curl -X GET -isu terra:terra-password http://127.0.0.1:8080/txs\?page\=1\&limit\=10\&events\='message.action=send%26message.recipient=terra160untgd5az0n4g5su6j7a7nq4qgl3vw4zqy9uw'


# Send (from_address should exist in address list)
curl -X POST -isu terra:terra-password http://127.0.0.1:8080/send -d '{"from_address": "terra12c5s58hnc3c0pjr5x7u68upsgzg2r8fwq5nlsy", "to_address": "terra160untgd5az0n4g5su6j7a7nq4qgl3vw4zqy9uw", "amount": "10000000", "denom": "mluna", "memo": "faucet"}' -H 'Content-Type: application/json'

# Get Block
curl -X GET -isu terra:terra-password http://127.0.0.1:8080/block/latest
curl -X GET -isu terra:terra-password http://127.0.0.1:8080/block/1


# Get coins from faucet
https://faucet.terra.money
