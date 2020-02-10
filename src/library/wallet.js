// refered from https://raw.githubusercontent.com/luniehq/lunie/develop/app/src/renderer/scripts/wallet.js

"use strict"

const bip32 = require(`bip32`)
const bip39 = require(`bip39`)
const bech32 = require(`bech32`)
const secp256k1 = require(`secp256k1`)
const sha256 = require("crypto-js/sha256")
const ripemd160 = require("crypto-js/ripemd160")
const CryptoJS = require("crypto-js")

const hdPathTerra = `m/44'/330'/0'/0/` // key controlling Luna allocation


class Wallet {
  static async deriveMasterKey(mnemonic) {
    // throws if mnemonic is invalid
    bip39.validateMnemonic(mnemonic)

    const seed = await bip39.mnemonicToSeed(mnemonic)
    const masterKey = bip32.fromSeed(seed)
    return masterKey
  }

  static deriveKeypair(masterKey, index = '0') {
    const terraHD = masterKey.derivePath(hdPathTerra + index)
    const privateKey = terraHD.privateKey
    const publicKey = secp256k1.publicKeyCreate(privateKey, true)

    return {
      privateKey,
      publicKey
    }
  }

  static bech32ify(address, prefix) {
    const words = bech32.toWords(address)
    return bech32.encode(prefix, words)
  }

  static standardRandomBytesFunc (size) {
    /* istanbul ignore if: not testable on node */
    if (window.crypto) {
      let key = ``
      let keyContainer = new Uint32Array(size/4)
      keyContainer = window.crypto.getRandomValues(keyContainer)
      for (let keySegment = 0; keySegment < keyContainer.length; keySegment++) {
        key += keyContainer[keySegment].toString(16) // Convert int to hex
      }
      return key
    } else {
      return CryptoJS.lib.WordArray.random(size).toString()
    }
  }

  static async generateWalletFromSeed(mnemonic) {
    const masterKey = await Wallet.deriveMasterKey(mnemonic)
    const { privateKey, publicKey } = Wallet.deriveKeypair(masterKey)
    const terraAddress = Wallet.createTerraAddress(publicKey)
    return {
      privateKey: privateKey.toString(`hex`),
      publicKey: publicKey.toString(`hex`),
      terraAddress
    }
  }

  static generateSeed(randomBytesFunc = Wallet.standardRandomBytesFunc) {
    const randomBytes = Buffer.from(randomBytesFunc(32), `hex`)
    if (randomBytes.length !== 32) throw Error(`Entropy has incorrect length`)
    const mnemonic = bip39.entropyToMnemonic(randomBytes.toString(`hex`))

    return mnemonic
  }

  static generateWallet(randomBytesFunc = Wallet.standardRandomBytesFunc) {
    const mnemonic = Wallet.generateSeed(randomBytesFunc)
    return Wallet.generateWalletFromSeed(mnemonic)
  }

  // NOTE: this only works with a compressed public key (33 bytes)
  static createTerraAddress(publicKey) {
    const message = CryptoJS.enc.Hex.parse(publicKey.toString(`hex`))
    const hash = ripemd160(sha256(message)).toString()
    const address = Buffer.from(hash, `hex`)
    const terraAddress = Wallet.bech32ify(address, `terra`)

    return terraAddress
  }

  // Transactions often have amino decoded objects in them {type, value}.
  // We need to strip this clutter as we need to sign only the values.
  static prepareSignBytes(jsonTx) {
    if (Array.isArray(jsonTx)) {
      return jsonTx.map(Wallet.prepareSignBytes)
    }

    // string or number
    if (typeof jsonTx !== `object`) {
      return jsonTx
    }

    const sorted = {}
    Object.keys(jsonTx)
      .sort()
      .forEach(key => {
        if (jsonTx[key] === undefined || jsonTx[key] === null) return

        sorted[key] = Wallet.prepareSignBytes(jsonTx[key])
      })
    return sorted
  }

  /*
  The SDK expects a certain message format to serialize and then sign.

  type StdSignMsg struct {
    ChainID       string      `json:"chain_id"`
    AccountNumber uint64      `json:"account_number"`
    Sequence      uint64      `json:"sequence"`
    Fee           auth.StdFee `json:"fee"`
    Msgs          []sdk.Msg   `json:"msgs"`
    Memo          string      `json:"memo"`
  }
  */
  static createSignMessage(
    jsonTx,
    { sequence, account_number, chain_id }
  ) {
    // sign bytes need amount to be an array
    const fee = {
      amount: jsonTx.fee.amount || [],
      gas: jsonTx.fee.gas
    }

    return JSON.stringify(
      Wallet.prepareSignBytes({
        fee,
        memo: jsonTx.memo,
        msgs: jsonTx.msg, // weird msg vs. msgs
        sequence,
        account_number,
        chain_id
      })
    )
  }

  // produces the signature for a message (returns Buffer)
  static signWithPrivateKey(signMessage, privateKey) {
    const signHash = Buffer.from(sha256(signMessage).toString(), `hex`)
    const { signature } = secp256k1.ecdsaSign(signHash, Buffer.from(privateKey, `hex`))
    return Buffer.from(signature)
  }

  static createSignature(
    signature,
    sequence,
    account_number,
    publicKey
  ) {
    return {
      signature: signature.toString(`base64`),
      account_number,
      sequence,
      pub_key: {
        type: `tendermint/PubKeySecp256k1`, // TODO: allow other keytypes
        value: publicKey.toString(`base64`)
      }
    }
  }

  // main function to sign a jsonTx using the local keystore wallet
  // returns the complete signature object to add to the tx
  static sign(jsonTx, wallet, requestMetaData) {
    const { sequence, account_number } = requestMetaData;
    const signMessage = Wallet.createSignMessage(jsonTx, requestMetaData);
    const signatureBuffer = Wallet.signWithPrivateKey(signMessage, wallet.privateKey);
    const pubKeyBuffer = Buffer.from(wallet.publicKey, `hex`);
    return Wallet.createSignature(
      signatureBuffer,
      sequence,
      account_number,
      pubKeyBuffer
    )
  }

  // adds the signature object to the tx
  static createSignedTx(tx, signature) {
    return Object.assign({}, tx, {
      signatures: [signature]
    })
  }

  // the broadcast body consists of the signed tx and a return type
  // returnType can be block (inclusion in block), async (right away), sync (after checkTx has passed)
  static createBroadcastBody(signedTx, returnType = `block`) {
    return JSON.stringify({
      tx: signedTx,
      mode: returnType
    })
  }
}


module.exports = Wallet;
