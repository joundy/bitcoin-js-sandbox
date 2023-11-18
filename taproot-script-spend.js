const {
  networks,
  payments,
  initEccLib,
  Psbt,
  script,
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

  const p2pkScriptAsm = `${pubKeyXonly.toString("hex")} OP_CHECKSIG`;
  const p2pkScript = script.fromASM(p2pkScriptAsm);

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

  const utxoValue = 10 * 10 ** 8; // value in sats (1 btc is 10 ** 8 or 100000000)
  const fee = 1000; // need to calculate fee & adjust it with current priority

  const p2pkPsbt = new Psbt({ network });
  p2pkPsbt.addInput({
    hash: "aca688d22f54426b8052ebffb0f6db025f6b2aa949259c7f5de41b25b105fbe8", // this is a tx id that has utxo
    index: 0, // vout index from tx
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
