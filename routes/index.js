const { Account } = require('@harmony-js/account');
const { HttpProvider, Messenger } = require('@harmony-js/network');
const { ChainID, ChainType } = require('@harmony-js/utils');
const axios = require('axios').default;

var express = require('express');
var router = express.Router();

router.get('/account-balance/:address', function (req, res, next) {
  const { address } = req.params;
  const account = new Account(
    address,
    new Messenger(
      new HttpProvider('https://api.s0.b.hmny.io'),
      ChainType.Harmony,
    ),
    ChainID.HmyTestnet,
  );
  account.getBalance().then(response => {
    res.json(response);
  });
})

router.get('/wallet-balance/:address', function (req, res, next) {
  const { address } = req.params;

  const apiAddress = 'https://api.harmony.one/';
  const payload = {
    "id": "1",
    "jsonrpc": "2.0",
    "method": "hmyv2_getBalance",
    "params": [
      address
    ]
  };
  const requestConfig = {
    Headers: {
      'Content-Type': 'application/json',
    }
  }

  axios.post(apiAddress, payload, requestConfig).then(response => {
    const { result } = response.data;
    const balance = (+result > 0) ? (+result / 1000000000000000000) : 0;

    res.json({
      result: {
        balance: balance
      }
    });
  });
})

module.exports = router;
