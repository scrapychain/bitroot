import type { PageContent } from "@/types/content";

/* ---------------------------------------------------------------------------
 * BEGINNER: generate a key pair and derive an address. Rust uses the
 * secp256k1, sha2 and ripemd crates; C uses OpenSSL EC_KEY and BIGNUM.
 * ------------------------------------------------------------------------- */
const rustBeginner = `// Add to Cargo.toml:
//   secp256k1 = { version = "0.27", features = ["rand"] }
//   sha2   = "0.10"
//   ripemd = "0.1"
use secp256k1::Secp256k1;
use secp256k1::rand::rngs::OsRng;

fn generate_keypair_demo() {
    let secp = Secp256k1::new();

    // Generate a cryptographically secure private key.
    // OsRng uses the OS random source:
    // /dev/urandom on Linux, CryptGenRandom on Windows.
    let (secret_key, public_key) =
        secp.generate_keypair(&mut OsRng);

    // Private key: 32 bytes of random data.
    let privkey_bytes: [u8; 32] = secret_key.secret_bytes();
    println!("Private key: {:02x?}", &privkey_bytes[..8]);
    // Never print a real private key. Demonstration only.

    // Public key: 65 bytes uncompressed, 33 bytes compressed.
    let uncompressed = public_key.serialize_uncompressed();
    let compressed   = public_key.serialize();
    println!("compressed:   {} bytes", compressed.len());   // 33
    println!("uncompressed: {} bytes", uncompressed.len()); // 65

    // public_key = private_key * G, where G is the
    // secp256k1 generator point. This multiplication is
    // one-way: easy to compute, impossible to reverse.
}

// From public key to Bitcoin address core.
use sha2::{Sha256, Digest};
use ripemd::Ripemd160;

fn pubkey_to_address_core(pubkey_compressed: &[u8; 33]) -> [u8; 20] {
    let step1 = Sha256::digest(pubkey_compressed); // SHA-256
    let step2 = Ripemd160::digest(step1);          // RIPEMD-160
    step2.into()
    // 20 bytes. Base58Check encoding turns this into
    // the readable address 1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf.
}`;

const cBeginner = `/* OpenSSL key pair generation on secp256k1.
 * Compile: gcc demo.c -o demo -lssl -lcrypto */
#include <openssl/ec.h>
#include <openssl/bn.h>
#include <openssl/sha.h>
#include <openssl/ripemd.h>
#include <stdint.h>
#include <stdio.h>

void generate_keypair_demo(void) {
    /* Create a key on the secp256k1 curve */
    EC_KEY *key = EC_KEY_new_by_curve_name(NID_secp256k1);
    EC_KEY_generate_key(key);

    /* Private key as a 32-byte big-endian integer */
    const BIGNUM *priv = EC_KEY_get0_private_key(key);
    uint8_t priv_bytes[32] = {0};
    BN_bn2binpad(priv, priv_bytes, 32);
    printf("Private key (first 8 bytes): ");
    for (int i = 0; i < 8; i++) printf("%02x", priv_bytes[i]);
    printf("...\\n");
    /* Never print a real private key. Demonstration only. */

    /* Compressed public key, 33 bytes */
    uint8_t pub_compressed[33];
    EC_POINT_point2oct(
        EC_KEY_get0_group(key),
        EC_KEY_get0_public_key(key),
        POINT_CONVERSION_COMPRESSED,
        pub_compressed, 33, NULL);
    /* pub_compressed[0] is 0x02 or 0x03 (even/odd y) */
    /* pub_compressed[1..32] is the x coordinate      */
    printf("Public key prefix: %02x\\n", pub_compressed[0]);

    EC_KEY_free(key);
}

void pubkey_to_hash160(const uint8_t pubkey[33],
                       uint8_t out[20]) {
    uint8_t sha_out[32];
    SHA256(pubkey, 33, sha_out);   /* SHA-256    */
    RIPEMD160(sha_out, 32, out);   /* RIPEMD-160 */
    /* 20 bytes: the Bitcoin address core */
}`;

/* ---------------------------------------------------------------------------
 * INTERMEDIATE: the private-to-public relationship and ECDH. Rust uses the
 * secp256k1 crate and its ecdh module; C uses EC_POINT_mul and ECDH_compute_key.
 * ------------------------------------------------------------------------- */
const rustInter = `use secp256k1::{Secp256k1, SecretKey, PublicKey};

// G is the generator. Private key k gives public key k*G.
fn explore_key_relationship() {
    let secp = Secp256k1::new();

    // Private key 1: the simplest possible. Never use for real Bitcoin.
    let mut one = [0u8; 32];
    one[31] = 1;
    let privkey_one = SecretKey::from_slice(&one).unwrap();

    // Public key for k=1 is G itself, the generator point.
    let pubkey_one = PublicKey::from_secret_key(&secp, &privkey_one);
    println!("k=1 public key (=G): {:02x?}", &pubkey_one.serialize()[..4]);

    // Private key 2: public key is 2*G = G + G (point doubling).
    let mut two = [0u8; 32];
    two[31] = 2;
    let privkey_two = SecretKey::from_slice(&two).unwrap();
    let pubkey_two  = PublicKey::from_secret_key(&secp, &privkey_two);
    println!("k=2 public key (=2G): {:02x?}", &pubkey_two.serialize()[..4]);
    // 2G looks unrelated to G. Adding G to itself produces a
    // mathematically related but visually unrelated point.
}

// ECDH: two parties derive the same shared secret
// without ever transmitting it.
// Used in TLS for every HTTPS connection,
// and in Bitcoin stealth addresses.
fn ecdh_demo() {
    use secp256k1::ecdh::SharedSecret;
    use secp256k1::rand::rngs::OsRng;

    let secp = Secp256k1::new();
    let (alice_priv, alice_pub) = secp.generate_keypair(&mut OsRng);
    let (bob_priv,   bob_pub)   = secp.generate_keypair(&mut OsRng);

    // Alice: a * B = a*(b*G) = (a*b)*G
    // Bob:   b * A = b*(a*G) = (a*b)*G
    let alice_shared = SharedSecret::new(&bob_pub,   &alice_priv);
    let bob_shared   = SharedSecret::new(&alice_pub, &bob_priv);

    assert_eq!(alice_shared.as_ref(), bob_shared.as_ref());
    println!("Shared secret established without transmitting it.");
    // An eavesdropper saw A and B but cannot compute (a*b)*G.
}`;

const cInter = `/* Compile: gcc keys.c -o keys -lssl -lcrypto */
#include <openssl/ec.h>
#include <openssl/bn.h>
#include <openssl/ecdh.h>
#include <openssl/obj_mac.h>
#include <stdint.h>
#include <string.h>
#include <stdio.h>

/* public_key = private_key * G.
 * Forward: O(log k) steps. Reverse: O(2^128). */
void explore_key_relationship(void) {
    EC_GROUP *group = EC_GROUP_new_by_curve_name(NID_secp256k1);
    BN_CTX   *ctx   = BN_CTX_new();
    BIGNUM   *k     = BN_new();
    EC_POINT *pub   = EC_POINT_new(group);
    uint8_t   compressed[33];

    /* k = 1: public key is G itself */
    BN_set_word(k, 1);
    EC_POINT_mul(group, pub, k, NULL, NULL, ctx);
    EC_POINT_point2oct(group, pub, POINT_CONVERSION_COMPRESSED,
                       compressed, 33, ctx);
    printf("k=1 public key prefix: %02x\\n", compressed[0]);
    /* These 33 bytes are the generator point G. */

    /* k = 2: public key is G + G = 2G */
    BN_set_word(k, 2);
    EC_POINT_mul(group, pub, k, NULL, NULL, ctx);
    EC_POINT_point2oct(group, pub, POINT_CONVERSION_COMPRESSED,
                       compressed, 33, ctx);
    printf("k=2 public key prefix: %02x\\n", compressed[0]);
    /* Different x coordinate. Visually unrelated to G. */

    BN_free(k);
    EC_POINT_free(pub);
    BN_CTX_free(ctx);
    EC_GROUP_free(group);
}

/* ECDH: shared secret derivation.
 * Used in TLS and Bitcoin stealth addresses. */
void ecdh_demo(void) {
    EC_GROUP *group = EC_GROUP_new_by_curve_name(NID_secp256k1);

    EC_KEY *alice = EC_KEY_new();
    EC_KEY_set_group(alice, group);
    EC_KEY_generate_key(alice);

    EC_KEY *bob = EC_KEY_new();
    EC_KEY_set_group(bob, group);
    EC_KEY_generate_key(bob);

    uint8_t alice_secret[32], bob_secret[32];
    ECDH_compute_key(alice_secret, 32,
                     EC_KEY_get0_public_key(bob), alice, NULL);
    ECDH_compute_key(bob_secret, 32,
                     EC_KEY_get0_public_key(alice), bob, NULL);

    printf("Secrets match: %d\\n",
           memcmp(alice_secret, bob_secret, 32) == 0); /* 1 */

    EC_KEY_free(alice);
    EC_KEY_free(bob);
    EC_GROUP_free(group);
}`;

/* ---------------------------------------------------------------------------
 * ADVANCED: HD wallets. Rust uses the bitcoin crate's BIP-32 types; C shows
 * the raw HMAC-SHA512 child-derivation step that BIP-32 is built on.
 * ------------------------------------------------------------------------- */
const rustAdv = `// Add to Cargo.toml: bitcoin = "0.31"
use bitcoin::bip32::{Xpriv, DerivationPath};
use bitcoin::{Network, CompressedPublicKey, Address};
use std::str::FromStr;

fn hd_wallet_demo() {
    // 64-byte seed. Real wallets derive it from a BIP-39
    // mnemonic. This all-zero seed is for testing only.
    let seed = [0u8; 64];

    // Master extended private key: the root of the tree.
    let master = Xpriv::new_master(Network::Bitcoin, &seed)
        .expect("valid seed");

    let secp = bitcoin::secp256k1::Secp256k1::new();

    // First external address: m/44'/0'/0'/0/0
    let path  = DerivationPath::from_str("m/44'/0'/0'/0/0").unwrap();
    let child = master.derive_priv(&secp, &path).unwrap();
    let pubkey = CompressedPublicKey(child.private_key.public_key(&secp));
    let address = Address::p2pkh(pubkey, Network::Bitcoin);
    println!("Address: {}", address);
    // Deterministic: same seed + same path = same address,
    // on any device, in any wallet software.

    // The 1000th address: m/44'/0'/0'/0/999
    let path999 = DerivationPath::from_str("m/44'/0'/0'/0/999").unwrap();
    let _child999 = master.derive_priv(&secp, &path999).unwrap();
    // Back up 12 words, recover every address in the tree.
    // The tree from the trees page is your key structure.
}`;

const cAdv = `/* BIP-32 child key derivation: the HMAC-SHA512 step.
 * A full HD wallet needs a BIP-32 library
 * (libwally-core, or bitcoin-core/secp256k1).
 * Compile: gcc bip32.c -o bip32 -lcrypto */
#include <openssl/hmac.h>
#include <openssl/evp.h>
#include <stdint.h>
#include <string.h>

/* Derive a non-hardened child at index i.
 *   IL || IR = HMAC-SHA512(key = chaincode,
 *                          data = parent_pubkey || index)
 *   child_privkey   = (IL + parent_privkey) mod n
 *   child_chaincode = IR */
void derive_child_key(
    const uint8_t parent_pubkey[33],
    const uint8_t parent_chaincode[32],
    uint32_t      index,
    uint8_t       out_il[32],  /* add to parent privkey mod n */
    uint8_t       out_ir[32]   /* child chain code            */
) {
    uint8_t data[37];
    memcpy(data, parent_pubkey, 33);
    data[33] = (index >> 24) & 0xFF;  /* big-endian index */
    data[34] = (index >> 16) & 0xFF;
    data[35] = (index >>  8) & 0xFF;
    data[36] =  index        & 0xFF;

    uint8_t  out[64];
    unsigned out_len = 64;
    HMAC(EVP_sha512(), parent_chaincode, 32,
         data, 37, out, &out_len);

    memcpy(out_il, out,      32); /* left 32 bytes  */
    memcpy(out_ir, out + 32, 32); /* right 32 bytes */
    /* Repeat for every node in the HD wallet tree. */
}`;

export const publicKeyCryptography: PageContent = {
  slug: "public-key-cryptography",
  hexLabel: "0x1C",
  category: "cryptography",
  hero: {
    eyebrow: "root.system / 0x1C / public-key",
    title: `One key creates it.<br><span class="highlight">Only one key opens it.</span>`,
    lede: `A public key is a padlock you give to the world. A private key is the only key that opens it. Anyone can lock a message for you; only you can unlock it. Anyone can verify you signed something; only you could have signed it. This page is the mathematics behind that asymmetry, and how Bitcoin uses it to let you prove ownership of coins without ever revealing your secret.`,
    narrativeHtml: `<p>Imagine a padlock.</p>
<p>You manufacture thousands of them. All open. All identical. You hand them out freely, to everyone you might ever want to hear from.</p>
<p>Anyone who wants to send you a secret message puts it in a box, snaps your padlock shut, and sends the box. Nobody can open it. Not the sender. Not anyone who intercepts it. Only you, because only you have the key.</p>
<p>This is not an analogy. This is exactly how public key cryptography works. Your public key is the open padlock. Your private key is the key that opens it.</p>
<p>The padlock is derived from the key using mathematics. Easy to derive the padlock from the key. Computationally impossible to reverse. You already know this property from page 13: hash functions are one-way.</p>
<p>Public key cryptography uses a different one-way function. Not hashing. Something more powerful. Something that also lets you sign messages. The elliptic curve.</p>
<p>And the specific curve Bitcoin chose in 2009 is called secp256k1. This page explains what that means, and why it makes Bitcoin secure.</p>`,
  },
  levels: [
    /* =================================================================
       LEVEL 01 . BEGINNER
       ================================================================= */
    {
      level: "beginner",
      number: "01",
      title: "The **key pair**",
      blocks: [
        {
          kind: "prose",
          html: `<p>Every public key system starts with one operation: generate a key pair. Two numbers, mathematically linked. One you share, one you protect. The entire security of Bitcoin rests on how well you protect the private one.</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "PRIVATE KEY",
              value: "32 bytes . SECRET",
              desc: "A random 256-bit number, generated once, never transmitted, never shared. Lose it and your coins are gone forever. Leak it and your coins are gone immediately. This is the only thing that actually matters.",
            },
            {
              label: "PUBLIC KEY",
              value: "33 bytes . shareable",
              desc: "Derived from the private key, mathematically linked but not reversible. Share it freely, post it publicly, put it in your transactions. Knowing it tells an attacker nothing about your private key.",
            },
            {
              label: "ADDRESS",
              value: "20-byte core . public",
              desc: "Derived from the public key: hash160 then Base58Check. This is what you hand out to receive Bitcoin. Even shorter, even more opaque. Losing the address loses nothing. Losing the private key loses everything.",
            },
          ],
        },
        { kind: "diagram", name: "keypair-flow" },
        {
          kind: "prose",
          html: `<p>The padlock framing gives you the three things a key pair can do. Each uses the two keys differently.</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "ENCRYPT",
              value: "send a secret",
              desc: "Find the recipient's public key, the open padlock, and encrypt with it. Only their private key can decrypt. You cannot even decrypt your own message. Once locked, only the owner opens it.",
            },
            {
              label: "SIGN",
              value: "prove you wrote it",
              desc: "Sign with your private key. Anyone can verify with your public key. Verification proves you signed it, nobody can forge it because only the private key signs, and you cannot deny it because only you hold the key.",
            },
            {
              label: "VERIFY",
              value: "check a signature",
              desc: "Receive the message, signature and public key. Recompute the message hash, verify the signature against it. Valid or invalid. No private key needed: the public key alone is enough.",
            },
          ],
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBeginner, label: "keypair.rs" },
            c: { language: "c", code: cBeginner, label: "keypair.c" },
          },
        },
        { kind: "widget", name: "keypair-explorer" },
      ],
    },
    /* =================================================================
       LEVEL 02 . INTERMEDIATE
       ================================================================= */
    {
      level: "intermediate",
      number: "02",
      title: "The mathematics: RSA and **elliptic curves**",
      blocks: [
        { kind: "heading", text: "RSA, and why Bitcoin does not use it" },
        {
          kind: "prose",
          html: `<p>RSA was the first widely deployed public key system, and it still secures TLS certificates and SSH. Its trapdoor is integer factorisation. Choose two large primes p and q, and publish their product n. Recovering p and q from n is the hard part: for a 2048-bit modulus, n is a 617-digit number, and the best known factoring takes longer than the age of the universe.</p>
<p>The public key is (n, e) with e usually 65537. The private key is d, chosen so that e times d is congruent to 1 modulo (p-1)(q-1). Encrypt with message^e mod n, decrypt with ciphertext^d mod n. The maths guarantees only d reverses what e did.</p>
<p>Bitcoin does not use RSA. A 2048-bit RSA key is 256 bytes; a secp256k1 key is 32 bytes private, 33 bytes public, at the same security level. Eight times smaller, with much faster signatures. At millions of transactions a day, size and speed decide everything.</p>`,
        },
        { kind: "heading", text: "Elliptic curves" },
        {
          kind: "prose",
          html: `<p>An elliptic curve is the set of points satisfying y squared = x cubed + ax + b, modulo a prime p. Bitcoin's curve, secp256k1, is y squared = x cubed + 7, modulo p = 2^256 - 2^32 - 977, a 256-bit prime. Over the real numbers the curve is a single smooth shape, symmetric about the x-axis; over the prime field it is a scattering of points, but the smooth picture is the one to hold in your head.</p>`,
        },
        { kind: "diagram", name: "elliptic-curve" },
        {
          kind: "prose",
          html: `<p><strong>Point addition.</strong> Draw a line through two points on the curve. It meets the curve at a third point. Reflect that across the x-axis and you have the sum. <strong>Point doubling</strong> is the same trick with the tangent line at a single point, giving P + P = 2P.</p>
<p><strong>Scalar multiplication</strong> is repeated addition: k times G means adding G to itself k times. You never actually do k additions. Double-and-add computes k times G in O(log k), about 256 steps for a 256-bit k. Fast forward. But given kG and G, recovering k is the elliptic curve discrete logarithm problem, with no known polynomial algorithm and O(2^128) cost under the best attacks. The Big O page called O(2^256) impossible; O(2^128) is impossible too.</p>
<p>secp256k1's parameters are public. Everyone knows them. Your public key is simply your private key times this exact generator point G.</p>`,
        },
        {
          kind: "table",
          headers: ["Parameter", "Value (hex)"],
          rows: [
            ["p (field prime)", "FFFFFFFF...FFFFFFFE FFFFFC2F"],
            ["n (group order)", "FFFFFFFF...BAAEDCE6 AF48A03B BFD25E8C D0364141"],
            ["G.x (generator)", "79BE667E F9DCBBAC 55A06295 CE870B07..."],
            ["G.y (generator)", "483ADA77 26A3C465 5DA4FBFC 0E1108A8..."],
          ],
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustInter, label: "curve.rs" },
            c: { language: "c", code: cInter, label: "curve.c" },
          },
        },
      ],
    },
    /* =================================================================
       LEVEL 03 . ADVANCED
       ================================================================= */
    {
      level: "advanced",
      number: "03",
      title: "HD wallets, key derivation, and **address types**",
      blocks: [
        { kind: "heading", text: "HD wallets (BIP-32)" },
        {
          kind: "prose",
          html: `<p>A Hierarchical Deterministic wallet turns one seed into an unlimited number of key pairs, each derived deterministically. Back up the one seed and you recover every key. The seed is usually 12 or 24 words, a BIP-39 mnemonic encoding 128 or 256 bits of entropy.</p>
<p>From the seed comes a master private key, from it child keys, from each child grandchildren: a tree of key pairs, the structure straight off the trees page. The derivation path names a leaf. In m/44'/0'/0'/0/0, m is the master, 44' is the BIP-44 purpose, 0' is Bitcoin mainnet, 0' is account zero, 0 is the external chain, and the final 0 is the first address.</p>
<p><strong>Hardened</strong> derivation (the apostrophes) derives a child private key from the parent private key, and you cannot derive the child public key from the parent public key alone. More secure, used at the account level. <strong>Non-hardened</strong> derivation lets you derive child public keys from a parent public key, which is what makes watch-only wallets possible: derive every address without the private key ever present.</p>`,
        },
        { kind: "heading", text: "Bitcoin address types" },
        {
          kind: "prose",
          html: `<p>Three main address types use public keys differently. <strong>P2PKH</strong> (addresses starting with 1) is the original: coins lock to OP_DUP OP_HASH160 hash160(pubkey) OP_EQUALVERIFY OP_CHECKSIG, unlocked by a signature plus the public key. <strong>P2WPKH</strong> (bc1q) is SegWit, moving the signature into witness data, which is cheaper. <strong>P2TR</strong> (bc1p) is Taproot, using Schnorr signatures and key aggregation so that a multisig can look identical to a single key on-chain.</p>`,
        },
        { kind: "diagram", name: "address-types" },
        {
          kind: "table",
          headers: ["Format", "Prefix", "Signature", "Privacy", "Size"],
          rows: [
            ["P2PKH", "1", "ECDSA", "Low", "Largest"],
            ["P2WPKH", "bc1q", "ECDSA", "Medium", "Medium"],
            ["P2TR", "bc1p", "Schnorr", "High", "Smallest"],
          ],
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustAdv, label: "hd_wallet.rs" },
            c: { language: "c", code: cAdv, label: "bip32.c" },
          },
        },
        { kind: "heading", text: "Your private key: the complete lifecycle" },
        {
          kind: "prose",
          html: `<p>Bitcoin is designed so you can prove ownership of coins without trusting anyone: no bank, no identity document, no phone number. The whole model rests on one assumption, that you and only you know your private key.</p>`,
        },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "GENERATION",
              value: "256 bits of physical entropy",
              desc: "Your wallet draws from the OS random source: /dev/urandom, CryptGenRandom, SecRandomCopyBytes. Those gather hardware noise, keystroke timing, fan fluctuations, packet arrival times. Physical randomness becomes one 32-byte number, the most important you will ever own.",
            },
            {
              label: "DERIVATION",
              value: "one-way, deterministic",
              desc: "private_key times G gives the public key. SHA-256 then RIPEMD-160 then Base58Check gives the address. Every step is fast forward and impossible backward.",
            },
            {
              label: "SIGNING & VERIFICATION",
              value: "prove it with the public key",
              desc: "To spend, your wallet hashes the transaction, signs with the private key, and broadcasts transaction, signature and public key. Every node recomputes the hash, runs ECDSA verify against the public key, and checks hash160(pubkey) equals the address. Nobody ever needed your private key.",
            },
            {
              label: "PROTECTION",
              value: "the feature, not the bug",
              desc: "Lose the private key and the coins are locked on-chain forever: no support line, no password reset. A bank can freeze an account or be compelled to reverse a transfer. A private key cannot. The cost of that freedom is responsibility.",
            },
          ],
        },
        {
          kind: "callout",
          variant: "warn",
          title: "// your private key, your responsibility, your Bitcoin",
          body: `This is the asymmetry that is the entire point. Verification needs only the public key, so the network can confirm a transaction is yours without ever seeing your secret. The private key never left your device, and the system still proved you owned the coins. That is what every Bitcoin address, every signature, and the next page on digital signatures are built on.`,
        },
      ],
    },
  ],
  connections: {
    title: "Where public key cryptography appears in ScrapyBytes",
    introHtml: `<p>Key pairs touch nearly every layer below them. Here is where this page reaches back across the curriculum.</p>`,
    items: [
      {
        slug: "hashing",
        text: `The public key is hashed to make the address: SHA-256 then RIPEMD-160. The hashing page explained both; here they run in sequence to produce the 20-byte core of one Bitcoin address.`,
      },
      {
        slug: "big-o",
        text: `Private key to public key is O(log k); the reverse is O(2^128). That gap is the security of all Bitcoin. The Big O page proved O(2^256) impossible, and O(2^128) is impossible too. Every private key is protected by a Big O argument.`,
      },
      {
        slug: "trees",
        text: `An HD wallet is a tree of keys: the master key is the root, account keys are internal nodes, address keys are leaves. The trees page is the structure; BIP-32 is that structure applied to key management.`,
      },
      {
        slug: "recursion",
        text: `HD derivation walks the tree recursively: each node derives from its parent, one step per path element. m/44'/0'/0'/0/0 is five recursive derivations from a single seed.`,
      },
      {
        slug: "logic-gates",
        text: `Elliptic curve point multiplication is modular arithmetic, and modular arithmetic is addition, multiplication and bit operations: the same XOR and AND from page four, doing mathematics that took humans decades to develop.`,
      },
      {
        slug: "binary",
        text: `A private key is 256 bits, a compressed public key 264, a signature around 568. All binary, all the way down to the transistors holding the key in memory. The binary page is the physical substrate.`,
      },
      {
        slug: "memory",
        text: `Your private key is 32 bytes of memory, the most sensitive on your device. Hardware wallets keep it in a secure element that cannot be read externally even if the device is stolen.`,
      },
      {
        slug: "blockchain",
        text: `Every transaction is signed, every unspent output is locked to a public key hash, every input carries a signature, every node verifies them. Remove public key cryptography and anyone could spend anyone's coins. Bitcoin ceases to exist.`,
      },
      {
        slug: "networking",
        text: `Every TLS connection uses ECDH: the same elliptic curve maths, key pairs exchanged at connection start, a shared secret derived without transmitting it, then AES for the session. Every HTTPS request you make rests on these principles.`,
      },
      {
        slug: "distributed-systems",
        text: `Bitcoin nodes verify signatures without trusting each other. Each independently checks ECDSA(pubkey, sig, hash). No central authority, no trusted third party: mathematics replaces trust, which is the distributed systems problem solved.`,
      },
      {
        slug: "pointers",
        text: `An address is a pointer to coins in the UTXO set; the private key is the proof you own what it points at. Without the key, the pointer and the coins still exist, but the access does not.`,
      },
      {
        slug: "graphs",
        text: `The secp256k1 points form a group, and G generates the whole group by repeated addition. Lightning uses the same elliptic curve maths for channel funding and routing, where graphs and curves meet in Bitcoin's infrastructure.`,
      },
    ],
  },
  nextUp: {
    eyebrow: "next up / 0x1D",
    title: "Prove you signed it without revealing how: digital signatures, ECDSA, and Schnorr.",
    href: "/digital-signatures",
    label: "digital signatures",
    variant: "magenta",
  },
};
