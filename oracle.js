let { getSigHash } = require('coins')
let { sign, publicKeyCreate} = require('secp256k1')
let fs = require('fs')
let { post } = require('axios')
let TwitchBot = require('twitch-bot')

let BotConfig = require('./bot')
let privkeyHex = fs.readFileSync('./privkey')
let privkey = Buffer.from(privkeyHex.toString(), 'hex')
let { connect } = require('lotion')
let genesis = require('./genesis.json')
let config = require('./config.js')

let oneTIB = 1e8
let founderAddress = 'BFaoFeHNCcrczFyvaEWpZ7EBAbNEewGzC'
let founderPercent = 1

let Bot = new TwitchBot(BotConfig);

let AddressBook = require('./address-book.json')
let state = {};

async function main() {
	let nodes = config.peers.map((addr) => `ws://${addr}:46657`)

	let client = await connect(null, { genesis, nodes })

	state = await client.getState();

	setInterval(async function() {
		state = await client.getState();
	}, 5000);

	Bot.on('join', () => {
	    console.log("Joined channel!")
	});

	Bot.on('message', async chatter => {
	    if (chatter.message.startsWith("!address ")) {
			var address = chatter.message.replace("!address ", "");
			if (address.length == 0) Bot.say(chatter.display_name + " No address found.");
			else {
				AddressBook[chatter.user_id] = address;
				Bot.say(chatter.display_name + " Address registered!");
				fs.writeFile("./address-book.json", JSON.stringify(AddressBook), 'utf8', function (err) {
					if (err) {
						console.log("ERROR WHILE SAVING");
						console.log(err);
					}
				})
			}
		} else if (chatter.message.startsWith("!key")) {
			if (AddressBook[chatter.user_id]) Bot.say(chatter.display_name + " your key: " + AddressBook[chatter.user_id]);
			else Bot.say(chatter.display_name + " you haven't registered any key.");
		} else if (chatter.message.startsWith("!money")) {
			if (AddressBook[chatter.user_id]) {
				var money = state.accounts[AddressBook[chatter.user_id]];
				Bot.say(chatter.display_name + " your money: " + (money ? money.balance / 1e8 : 0) + " TIB");
			}
			else Bot.say(chatter.display_name + " you haven't registered any key.");
		}
	});

	Bot.on('subscription', event => {
		if (AddressBook[event.user_id]) {
			sendTo(AddressBook[event.user_id], 5);
			Bot.say(event.display_name + " Thanks for subbing! You won 5 TIBs!");
		}

		Bot.say("To celebrate this sub, everyone wins 0.001 TIBs!")
		for (var key in AddressBook) sendTo(AddressBook[key], 0.001);
	});
}

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
main().catch((err) => console.error(err.stack))
