const {
  networks,
  payments,
  initEccLib,
  Psbt,
  script,
  opcodes,
} = require("bitcoinjs-lib");
const { ECPairFactory } = require("ecpair");
const tinysecp = require("tiny-secp256k1");

initEccLib(tinysecp);
const ECPAIR = ECPairFactory(tinysecp);

function main() {
  const network = networks.regtest;

  const keypair = ECPAIR.fromPrivateKey(
    Buffer.from("CsMcDrrhqtvvH7TFjOXrPw5U5RM31BDY5v6H5dxyzwI=", "base64"),
  );

  const pubKeyXonly = keypair.publicKey.subarray(1, 33);

  // https://docs.ordinals.com/inscriptions.html
  const stacks = [
    pubKeyXonly,
    opcodes.OP_CHECKSIG,
    opcodes.OP_FALSE,
    opcodes.OP_IF,
    Buffer.from("ord", "utf8"),
    1,
    1,
    Buffer.from("text/plain;charset=utf-8", "utf8"),
    0,
    Buffer.from("Hello mom <3", "utf8"),
    opcodes.OP_ENDIF,
  ];

  const p2pkScript = script.compile(stacks);

  const scriptTree = {
    output: p2pkScript,
    version: 192,
  };

  const p2tr = payments.p2tr({
    internalPubkey: pubKeyXonly,
    scriptTree,
    network,
  });

  // commit address
  console.log({ p2trAdress: p2tr.address });

  const p2pkRedeem = {
    output: p2pkScript,
    redeemVersion: 192,
  };
  const p2pkP2tr = payments.p2tr({
    internalPubkey: pubKeyXonly,
    scriptTree,
    redeem: p2pkRedeem,
    network,
  });

  const utxoValue = 1 * 10 ** 8; // value in sats (1 btc is 10 ** 8 or 100000000)
  const fee = 1000; // need to calculate fee & adjust it with current priority

  const p2pkPsbt = new Psbt({ network });
  p2pkPsbt.addInput({
    hash: "9624e0fe93bea0858439e5096a8febd173d330d85260f16af84b22818e12af8f", // this is a tx id that has utxo
    index: 1, // vout index from tx
    witnessUtxo: {
      value: utxoValue,
      script: p2pkP2tr.output,
    },
    tapLeafScript: [
      {
        leafVersion: p2pkRedeem.redeemVersion,
        script: p2pkRedeem.output,
        controlBlock: p2pkP2tr.witness[p2pkP2tr.witness.length - 1],
      },
    ],
  });
  
  p2pkPsbt.addOutput({
    address: "bcrt1pktqtrefk5euxf3q7qkvhcpfvuh32acy20rkfxq3we7a96t8pzymspxz0wg", // wallet target
    value: utxoValue - fee, // total spend - the fee
  });
  
  p2pkPsbt.signInput(0, keypair);
  p2pkPsbt.finalizeAllInputs();
  
  const tx = p2pkPsbt.extractTransaction();
  const txHex = tx.toHex();

  console.log({ txHex });
}

main();
