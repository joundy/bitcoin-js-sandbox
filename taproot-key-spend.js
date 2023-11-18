const { networks, payments, initEccLib, Psbt } = require("bitcoinjs-lib");
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

  const p2tr = payments.p2tr({
    pubkey: pubKeyXonly,
    network,
  });

  const psbt = new Psbt({ network });

  const utxoValue = 10 * 10 ** 8; // value in sats (1 btc is 10 ** 8 or 100000000)
  const fee = 150; // need to calculate fee & adjust it with current priority

  psbt.addInput({
    hash: "c1e7473ffac52bb6165f5fd5775ee5d87433eed43b5eb8170e79908c8a8c945e", // this is a tx id that has utxo
    index: 0, // vout index from tx
    witnessUtxo: {
      value: utxoValue,
      script: p2tr.output,
    },
    tapInternalKey: pubKeyXonly,
  });

  psbt.addOutput({
    address: "bcrt1pktqtrefk5euxf3q7qkvhcpfvuh32acy20rkfxq3we7a96t8pzymspxz0wg", // wallet target
    value: utxoValue - fee, // total spend - the fee
  });

  psbt.signInput(0, keypair);
  psbt.finalizeAllInputs();

  const tx = psbt.extractTransaction();
  const txHex = tx.toHex()

  console.log({ txHex });
}

main();
