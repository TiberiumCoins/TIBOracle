let { getSigHash } = require('coins')
let { sign, publicKeyCreate} = require('secp256k1')
let fs = require('fs')
let { post } = require('axios')
let TwitchBot = require('twitch-bot')

let BotConfig = require('./bot')
let privkeyHex = fs.readFileSync('./privkey')
let privkey = Buffer.from(privkeyHex.toString(), 'hex')

let oneTIB = 1e8
let founderAddress = 'BFaoFeHNCcrczFyvaEWpZ7EBAbNEewGzC'
let founderPercent = 1

let Bot = new TwitchBot(BotConfig);

let AddressBook = require('./address-book.json')

Bot.on('join', () => {
    console.log("Joined channel!")
    Bot.on('message', chatter => {
	    if (chatter.message.startsWith("!address ")) {
			var address = chatter.message.replace("!address ", "");
			if (address.length == 0) Bot.say(chatter.display_name + " No adress found.");
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
			if (AdressBook[chatter.user_id]) Bot.say(chatter.display_name + " your key: " + AddressBook[chatter.user_id]);
			else Bot.say(chattr.display_name + " you haven't registered any key.");
		}
	});

	Bot.on('subscription', event => {
		if (AdressBook[event.user_id]) {
			sendTo(AdressBook[event.user_id], 5);
			Bot.say(event.display_name + " Thanks for subbing! You won 5 TIBs!");
		}
	});
});

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
