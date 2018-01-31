let { getSigHash } = require('coins')
let { sign, publicKeyCreate} = require('secp256k1')
let fs = require('fs')
let { post } = require('axios')

let privkeyHex = fs.readFileSync('./privkey')
let privkey = Buffer.from(privkeyHex.toString(), 'hex')

let oneTIB = 1e8
let founderAddress = 'BFaoFeHNCcrczFyvaEWpZ7EBAbNEewGzC'
let founderPercent = 1

function sendTo(address, amount) {
    signAndSendTx(generateTx(address, amount))
}

function generateTx(address, amount) {
    amount = amount * oneTIB
    let founderAmount = (amount * founderPercent / 100);
    let finalAmount = amount + founderAmount;
    return {
	from: [
	    {
		type: 'oracleTx',
		amount: finalAmount
	    }
	],
	to: [
	    {
		address: address,
		amount: amount
	    },
	    {
		address: founderAddress,
		amount: founderAmount
	    }
	]
    }
}

function signAndSendTx(tx) {
  let sigHash = getSigHash(tx)
  tx.from[0].signature = sign(sigHash, privkey).signature
  console.log(tx)
  post('http://localhost:3000/txs', tx)
    .then((res) => console.log(res.data.result))
}

console.log("PubKey: " + publicKeyCreate(privkey).toString('hex'))

sendTo("BFaoFeHNCcrczFyvaEWpZ7EBAbNEewGzC", 150)
