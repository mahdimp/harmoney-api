const { Wallet } = require('@harmony-js/account')
const { HttpProvider, Messenger } = require('@harmony-js/network')
const { ChainID, ChainType, Unit } = require('@harmony-js/utils')
const { Harmony } = require('@harmony-js/core')
const { apiAddress, requestConfigs } = require('../constants')
const axios = require('axios').default

const {
  generatePrivateKey,
} = require('@harmony-js/crypto')

var express = require('express')
var router = express.Router()

// create new wallet
router.get('/wallet/new', function (req, res) {
  try {
    const privateKey = generatePrivateKey()
    const wallet = new Wallet(
      new Messenger(
        new HttpProvider(apiAddress),
        ChainType.Harmony,
        ChainID.RootstockMainnet,
      ),
    )
    const account = wallet.addByPrivateKey(privateKey)
    account.privateKey
    return res.json({
      accountAddress: account.address,
      privateKey: account.privateKey,
      publicKey: account.publicKey,
      accountBech32Address: account.bech32Address,
    })
  } catch (e) {
    const error = getError(e)
    return res.json({
      error
    })
  }
})

// get list of in transactions of an address
router.get('/wallet/in-transactions/:address', function (req, res) {
  try {
    const { address } = req.params
    const payload = {
      "jsonrpc": "2.0",
      "id": 1,
      "method": "hmyv2_getTransactionsHistory",
      "params": [
        {
          "address": address,
          "pageIndex": 0,
          "pageSize": 10,
          "fullTx": true,
          "txType": "RECEIVED",
          "order": "DESC"
        }
      ]
    }
    axios.post(apiAddress, payload, requestConfigs)
      .then(function (response) {
        const { transactions } = response.data.result || []
        res.json({
          result: {
            transactions
          }
        })
      })
  } catch (e) {
    const error = getError(e)
    return res.json({
      error
    })
  }
})

// get balance of an address
router.get('/wallet/balance/:address', function (req, res) {
  try {
    const { address } = req.params
    const payload = {
      "id": "1",
      "jsonrpc": "2.0",
      "method": "hmyv2_getBalance",
      "params": [
        address
      ]
    }
    axios.post(apiAddress, payload, requestConfigs).then(response => {
      const { result } = response.data
      const balance = (+result > 0) ? (+result / 1000000000000000000) : 0
      res.json({
        result: {
          balance
        }
      })
    })
  } catch (e) {
    const error = getError(e)
    return res.json({
      error,
    })
  }
})

// create a new transaction
router.post('/tx/new', async function (req, res) {
  try {
    const { to, amount, privateKey } = req.body
    const hmy = new Harmony(
      apiAddress,
      {
        chainType: ChainType.Harmony,
        chainId: ChainID.HmyMainnet,
      },
    )
    const txn = hmy.transactions.newTx({
      to,
      value: new Unit(amount).asOne().toWei(),
      shardID: 0,
      toShardID: 0,
      gasLimit: new Unit(210000).asWei().toWei(),
      gasPrice: new Unit(100).asGwei().toWei(),
      data: '0x',
    })
    hmy.wallet.addByPrivateKey(privateKey)
    const signed = await hmy.wallet.signTransaction(txn)
    const [transaction, hash] = await signed.sendTransaction()
    const confirmed = await transaction.confirm(hash, 20, 1000)
    if (confirmed) {
      res.json({
        hash,
      })
    }
    else {
      res.json({
        error: 'Transaction not sent'
      })
    }
  }
  catch (e) {
    const error = getError(e)
    res.json({
      error
    })
  }
})

function getError(e) {
  return (e instanceof Error) ? e.message : e
}

module.exports = router

