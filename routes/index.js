const { Account, Wallet } = require('@harmony-js/account')
const { HttpProvider, Messenger } = require('@harmony-js/network')
const { ChainID, ChainType, Unit } = require('@harmony-js/utils')
const { Harmony } = require('@harmony-js/core')
const { apiAddress, requestConfigs } = require('../constants')
const axios = require('axios').default

const {
  generatePrivateKey,
  getPubkeyFromPrivateKey,
} = require('@harmony-js/crypto');

var express = require('express')
const res = require('express/lib/response')
var router = express.Router()

// get account balance
router.get('/account/balance/:address', function (req, res) {
  const { address } = req.params

  const account = new Account(
    address,
    new Messenger(
      new HttpProvider(apiAddress),
      ChainType.Harmony,
    ),
    ChainID.HmyTestnet,
  )
  account.getBalance().then(response => {
    res.json(response)
  })
})

// create new wallet
router.get('/wallet/new', function (req, res) {
  const privateKey = generatePrivateKey();

  const wallet = new Wallet(
    new Messenger(
      new HttpProvider(apiAddress),
      ChainType.Harmony,
      ChainID.RootstockMainnet,
    ),
  );

  const account = wallet.addByPrivateKey(privateKey)
  account.privateKey

  return res.json({
    accountAddress: account.address,
    privateKey: account.privateKey,
    publicKey: account.publicKey,
    accountBech32Address: account.bech32Address,
  })
})

// get list of in transactions of an address
router.get('/wallet/in-transactions/:address', function (req, res) {
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
})

// get balance of an address
router.get('/wallet/balance/:address', function (req, res) {
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
})

// create a new transaction
router.post('/tx/new', function (req) {
  const { to, gasLimit, amount, gasPrice } = req.body;
  const privateKey = process.env.PRIVATE_KEY;

  const hmy = new Harmony(
    apiAddress,
    {
      chainType: ChainType.Harmony,
      chainId: ChainID.HmyMainnet,
    },
  );

  const txn = hmy.transactions.newTx({
    to,
    value: new Unit(amount).asOne().toWei(),
    gasLimit,
    shardID: 0,
    toShardID: 0,
    gasPrice: new hmy.utils.Unit(gasPrice).asGwei().toWei(),
    data: '0x',
  });

  hmy.wallet.addByPrivateKey(privateKey)
  hmy.wallet.signTransaction(txn).then(signedTransaction => {
    signedTransaction.sendTransaction().then(([, hash]) => {
      res.json({
        result: { hash}
      })
    })
  })
});

module.exports = router
