import type { PageContent } from "@/types/content";

/* ---------------------------------------------------------------------------
 * BEGINNER: XOR, the simplest symmetric cipher. Rust uses iterator chains and
 * Vec; C does the in-place byte loop with explicit lengths.
 * ------------------------------------------------------------------------- */
const rustBeginner = `// XOR: the simplest cipher.
// XOR encryption: same operation for encrypt and decrypt.
// key XOR plaintext  = ciphertext
// key XOR ciphertext = plaintext
// This is the foundation all stream ciphers build on.

fn xor_encrypt(plaintext: &[u8], key: &[u8]) -> Vec<u8> {
    plaintext.iter()
        .zip(key.iter().cycle()) // repeat key if shorter
        .map(|(&p, &k)| p ^ k)   // XOR each byte
        .collect()
    // XOR is the logic gate from page 4.
    // AES is XOR applied with much more structure.
}

fn xor_decrypt(ciphertext: &[u8], key: &[u8]) -> Vec<u8> {
    xor_encrypt(ciphertext, key) // identical: XOR is self-inverse
    // XOR twice with the same key returns the original.
    // This symmetry is what makes XOR useful for encryption.
}

fn main() {
    let message = b"Send 1 BTC to Bob";
    let key     = b"secret_key_12345!";

    let encrypted = xor_encrypt(message, key);
    let decrypted = xor_decrypt(&encrypted, key);

    assert_eq!(decrypted, message);
    println!("Encrypted: {:02x?}", &encrypted[..8]);
    // completely unrecognisable without the key

    // XOR cipher weakness: if the key repeats it is breakable.
    // AES solves this with proper key scheduling.
    // Never use raw XOR for real encryption.
}`;

const cBeginner = `#include <stdint.h>
#include <stdio.h>
#include <string.h>

/* XOR cipher: foundation of stream encryption.
 * Symmetric: same key and operation for both directions.
 * Weakness: trivially broken if the key is short or repeating.
 * AES is what you use in production. */

void xor_crypt(const uint8_t *in,  uint8_t *out,
               size_t len,
               const uint8_t *key, size_t key_len) {
    for (size_t i = 0; i < len; i++)
        out[i] = in[i] ^ key[i % key_len];
        /* XOR: the same gate from page 4.
         * Bit by bit. Every byte. Every message.
         * AES: XOR with key scheduling, S-boxes, MixColumns.
         * But the core operation is still this. */
}

int main(void) {
    const char *msg     = "Send 1 BTC to Bob";
    const char *key     = "secret_key_12345!";
    size_t      msg_len = strlen(msg);

    uint8_t encrypted[64] = {0};
    uint8_t decrypted[64] = {0};

    xor_crypt((const uint8_t*)msg, encrypted,
              msg_len, (const uint8_t*)key, strlen(key));
    xor_crypt(encrypted, decrypted,
              msg_len, (const uint8_t*)key, strlen(key));

    printf("Decrypted: %s\\n", (char*)decrypted);
    /* Should match the original.
     * XOR twice with the same key returns the original.
     * This self-inverse property is fundamental. */
    return 0;
}`;

/* ---------------------------------------------------------------------------
 * INTERMEDIATE: address hashing, commitments, and Diffie-Hellman. Rust uses
 * the sha2 and ripemd crates; C uses OpenSSL and an explicit modular exponent.
 * ------------------------------------------------------------------------- */
const rustInter = `// Add to Cargo.toml:
//   sha2   = "0.10"
//   ripemd = "0.1"
use sha2::{Sha256, Digest};
use ripemd::Ripemd160;

// Bitcoin address derivation from a public key.
// Real Bitcoin uses secp256k1 ECDSA to make the key.
// This shows the hashing steps only.
fn hash160(public_key: &[u8]) -> [u8; 20] {
    // Step 1: SHA-256 of the public key
    let sha256_hash = Sha256::digest(public_key);

    // Step 2: RIPEMD-160 of the SHA-256 hash
    let ripemd_hash = Ripemd160::digest(sha256_hash);

    ripemd_hash.into()
    // 20 bytes: the core of a Bitcoin address.
    // This is what gets Base58Check encoded.
}

// Commitment scheme: prove you knew a value
// before revealing it.
fn commit(secret: &[u8]) -> [u8; 32] {
    Sha256::digest(secret).into()
    // publish this. reveal the secret later.
    // anyone verifies: SHA256(secret) == commitment.
    // this is how pay-to-public-key-hash works:
    // publish the hash of the public key,
    // reveal the public key when spending.
}

fn verify_commitment(secret: &[u8],
                     commitment: &[u8; 32]) -> bool {
    let hash: [u8; 32] = Sha256::digest(secret).into();
    hash == *commitment
}

// XOR as the building block of stream ciphers.
// Rust: explicit types, bounds-checked iteration.
fn xor_stream(data: &[u8], keystream: &[u8]) -> Vec<u8> {
    assert_eq!(data.len(), keystream.len(),
        "keystream must be as long as data");
    data.iter().zip(keystream).map(|(d, k)| d ^ k).collect()
    // AES-CTR generates the keystream from key + nonce,
    // then XORs with plaintext. This is the final step.
}`;

const cInter = `#include <stdint.h>
#include <string.h>
#include <openssl/sha.h>
#include <openssl/ripemd.h>
/* compile: cc dh.c -lcrypto */

/* Bitcoin HASH160: SHA256 then RIPEMD160.
 * The core of every P2PKH address. */
void hash160(const uint8_t *pubkey, size_t len,
             uint8_t out[20]) {
    uint8_t sha_out[32];
    SHA256(pubkey, len, sha_out);
    RIPEMD160(sha_out, 32, out);
    /* 20-byte output. Base58Check encode it
     * to produce a Bitcoin address like
     * 1A1zP1eP5QGefi2DMPTfTL5SLmv7Divf. */
}

/* Commitment: publish the hash, reveal later.
 * Used in P2PKH, sealed-bid auctions, and
 * zero-knowledge protocols. */
int verify_commitment(const uint8_t *secret, size_t len,
                      const uint8_t commitment[32]) {
    uint8_t h[32];
    SHA256(secret, len, h);
    return memcmp(h, commitment, 32) == 0;
    /* returns 1 when the secret matches the commitment */
}

/* Simplified Diffie-Hellman with small numbers.
 * NOT cryptographically secure. Concept only.
 * Real DH uses 2048-bit or larger primes. */
uint64_t mod_pow(uint64_t base, uint64_t exp,
                 uint64_t mod) {
    uint64_t result = 1;
    base %= mod;
    while (exp > 0) {
        if (exp & 1) result = result * base % mod;
        exp >>= 1;
        base = base * base % mod;
    }
    return result;
}

void diffie_hellman_demo(void) {
    uint64_t g = 5, p = 23; /* public parameters */
    uint64_t a = 6;         /* Alice private */
    uint64_t b = 15;        /* Bob private   */

    uint64_t A = mod_pow(g, a, p); /* Alice sends 8  */
    uint64_t B = mod_pow(g, b, p); /* Bob sends   19 */

    uint64_t alice_secret = mod_pow(B, a, p); /* = 2 */
    uint64_t bob_secret   = mod_pow(A, b, p); /* = 2 */
    (void)alice_secret; (void)bob_secret;
    /* both equal 2: shared secret established.
     * eavesdropper saw g=5, p=23, A=8, B=19,
     * and cannot compute 2 without a or b. */
}`;

/* ---------------------------------------------------------------------------
 * ADVANCED: real ECDSA signing and verification. Rust uses the secp256k1
 * crate; C uses OpenSSL's EC_KEY and ECDSA_sign / ECDSA_verify.
 * ------------------------------------------------------------------------- */
const rustAdv = `// Add to Cargo.toml:
//   secp256k1 = { version = "0.27", features = ["rand"] }
//   sha2      = "0.10"
use secp256k1::{Secp256k1, Message};
use secp256k1::rand::rngs::OsRng;
use sha2::{Sha256, Digest};

fn bitcoin_sign_verify() {
    let secp = Secp256k1::new();

    // Generate a key pair. In real Bitcoin the private
    // key is cryptographically secure random bytes.
    let (private_key, public_key) =
        secp.generate_keypair(&mut OsRng);

    let tx_data = b"Send 1 BTC to Alice at address 1Alice...";

    // Bitcoin signs the double-SHA256 of the transaction.
    let hash1 = Sha256::digest(tx_data);
    let hash2 = Sha256::digest(hash1);
    let msg   = Message::from_digest_slice(&hash2).unwrap();

    // Sign with the private key. 71-72 bytes DER encoded.
    // This goes into the scriptSig of the input.
    let signature = secp.sign_ecdsa(&msg, &private_key);

    // Verify with the public key.
    // This is what every Bitcoin node does.
    let valid = secp.verify_ecdsa(&msg, &signature, &public_key);
    assert!(valid.is_ok());
    println!("Signature valid: {}", valid.is_ok());

    // 33-byte compressed public key. hash160 of this,
    // then Base58Check, gives the Bitcoin address.
    let _pubkey_bytes = public_key.serialize();
}`;

const cAdv = `#include <openssl/ec.h>
#include <openssl/ecdsa.h>
#include <openssl/obj_mac.h>
#include <openssl/sha.h>
#include <stdint.h>
#include <string.h>
#include <stdio.h>
/* compile: cc sign.c -lssl -lcrypto */

/* Bitcoin-style ECDSA signing using OpenSSL.
 * Curve: NID_secp256k1, Bitcoin's curve. */
void bitcoin_sign_verify(void) {
    EC_KEY *key = EC_KEY_new_by_curve_name(NID_secp256k1);
    EC_KEY_generate_key(key);

    const char *tx = "Send 1 BTC to Alice at 1Alice...";

    /* Double SHA-256, Bitcoin's standard */
    uint8_t hash1[32], hash2[32];
    SHA256((const uint8_t*)tx, strlen(tx), hash1);
    SHA256(hash1, 32, hash2);

    /* Sign: produces a DER-encoded ECDSA signature */
    uint8_t  sig_buf[72];
    unsigned sig_len = sizeof sig_buf;
    ECDSA_sign(0, hash2, 32, sig_buf, &sig_len, key);
    printf("Signature length: %u bytes\\n", sig_len);
    /* 71-72 bytes typically.
     * This exact format goes into the scriptSig. */

    /* Verify: what every Bitcoin node does */
    int valid = ECDSA_verify(0, hash2, 32,
                             sig_buf, sig_len, key);
    printf("Valid: %d\\n", valid); /* 1 = valid */

    /* Compressed public key, 33 bytes */
    uint8_t pubkey[33];
    const EC_POINT *pub = EC_KEY_get0_public_key(key);
    EC_POINT_point2oct(EC_KEY_get0_group(key), pub,
                       POINT_CONVERSION_COMPRESSED,
                       pubkey, 33, NULL);
    /* hash160(pubkey) is the Bitcoin address core */

    EC_KEY_free(key);
}`;

export const cryptography: PageContent = {
  slug: "cryptography",
  hexLabel: "0x1C",
  category: "cryptography",
  banner: {
    eyebrow: "Series 2: Cryptography",
    title: "This page begins the cryptography arc.",
    lines: [
      "The first 27 pages went from transistors to graphs.",
      "Series 2 is the mathematics that makes Bitcoin secure.",
      "Starting from first principles.",
    ],
  },
  hero: {
    eyebrow: "root.system / 0x1C / cryptography",
    title: `Two strangers. No shared secret.<br><span class="highlight">Communicate privately anyway.</span>`,
    lede: `This sounds impossible. For most of human history it was. In 1976 two mathematicians solved it. That solution is the reason your bank details travel safely, the reason Bitcoin has no central authority, and the reason you can prove you own a coin without revealing your private key. This page is how it works.`,
    narrativeHtml: `<p>Imagine you want to send a secret message to someone you have never met.</p>
<p>You have never spoken. You share no secret. You have no secure channel. Every message you send can be read by everyone.</p>
<p>How do you communicate privately?</p>
<p>For thousands of years the answer was: you cannot. You need to meet first. Exchange a secret key. Then use that key to encrypt your messages.</p>
<p>But meeting is not always possible. And every meeting is a risk. Every key exchange is a vulnerability.</p>
<p>In 1976 Whitfield Diffie and Martin Hellman published a paper that changed everything. They proved that two strangers could establish a shared secret over a completely public channel.</p>
<p>Without ever meeting. Without ever exchanging a secret. With every eavesdropper watching. And still end up with a secret that only they knew.</p>
<p>This seems impossible. It is not. It is mathematics.</p>
<p>And once you understand it you understand the foundation of every secure system on Earth. Including Bitcoin.</p>
<p>A Bitcoin private key is a secret. A Bitcoin public key is derived from it. Proving you own Bitcoin requires a signature, and a signature proves you know the secret without revealing it.</p>
<p>Every Bitcoin transaction ever broadcast used what you are about to learn. This page is the beginning of that story.</p>`,
  },
  levels: [
    /* =================================================================
       LEVEL 01 . BEGINNER
       ================================================================= */
    {
      level: "beginner",
      number: "01",
      title: "The problem and the two **solutions**",
      blocks: [
        {
          kind: "prose",
          html: `<p>Cryptography solves one problem. How do two parties communicate privately even when others can see their messages. Everything else is a consequence of that question.</p>
<p>There are two fundamental approaches. One is thousands of years old. One is fifty years old. Both are essential.</p>`,
        },
        { kind: "diagram", name: "crypto-problem" },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "SYMMETRIC",
              value: "one key, both jobs",
              desc: "Encrypt and decrypt with the same key. The Caesar cipher shifts every letter by 3. The modern version is AES: XOR, S-boxes and rounds, all bitwise, the same XOR from the logic gates page. Fast, used for bulk data. The catch: how do two parties share the key? That is the key distribution problem.",
            },
            {
              label: "ASYMMETRIC",
              value: "two keys, different jobs",
              desc: "A public key you share with everyone, a private key you never share. Encrypt with the public key; only the private key decrypts. Anyone can send you a secret, only you can read it, with no prior key sharing. The public key is derived from the private one by a one-way function: O(2^256) to reverse, which the Big O page already called impossible.",
            },
            {
              label: "HASH FUNCTIONS",
              value: "one-way fingerprints",
              desc: "You know these from page 13: same input same output, tiny change completely different output, never reversible. In cryptography they do integrity checks, commitment schemes, key derivation, Bitcoin addresses, and they are what you actually sign. You sign the hash, not the data.",
            },
            {
              label: "DIGITAL SIGNATURES",
              value: "prove it without revealing it",
              desc: "Sign a message with your private key; anyone with your public key can verify it, and nobody can forge it. That proves authentication (you signed), integrity (it was not altered), and non-repudiation (you cannot deny it). Every Bitcoin transaction is signed this way.",
            },
          ],
        },
        {
          kind: "prose",
          html: `<p>The simplest place to start is symmetric encryption, and the simplest symmetric cipher is a single XOR. It is the same gate from page four, applied byte by byte.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBeginner, label: "xor.rs" },
            c: { language: "c", code: cBeginner, label: "xor.c" },
          },
        },
        { kind: "widget", name: "crypto-explorer" },
      ],
    },
    /* =================================================================
       LEVEL 02 . INTERMEDIATE
       ================================================================= */
    {
      level: "intermediate",
      number: "02",
      title: "How public key cryptography **works**",
      blocks: [
        {
          kind: "prose",
          html: `<p>Public key cryptography rests on one mathematical concept: a <strong>trapdoor function</strong>. Easy to compute in one direction. Computationally impossible to reverse. Unless you hold the trapdoor, which is the private key.</p>
<p>Three trapdoors are used in practice.</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "RSA",
              value: "integer factorisation",
              desc: "Multiplying two large primes is easy; factoring the product is not. A 2048-bit RSA modulus is a 617-digit number. Factoring it would take longer than the age of the universe.",
            },
            {
              label: "ECDSA",
              value: "elliptic curve discrete log",
              desc: "Multiplying a curve point by a scalar is easy; recovering the scalar from the result is not. 256-bit keys give the security of 3072-bit RSA. Smaller, faster. This is what Bitcoin uses.",
            },
            {
              label: "DIFFIE-HELLMAN",
              value: "shared secret, public channel",
              desc: "Each party picks a private number, exchanges a derived public value, and computes the same shared secret independently. Neither ever sends it. This solved the key distribution problem in 1976.",
            },
          ],
        },
        {
          kind: "prose",
          html: `<p>Diffie-Hellman is worth seeing with small numbers. Both sides agree on public parameters g = 5 and p = 23. Alice picks a private a, Bob picks a private b. Each sends g raised to their private number, mod p. Then each raises the other's value to their own private number. Both land on the same secret, and it never crossed the wire. Change a and b below and watch it hold.</p>`,
        },
        { kind: "widget", name: "dh-key-exchange" },
        {
          kind: "callout",
          variant: "info",
          title: "// the expensive step happens once",
          body: `Asymmetric maths is slow, so real systems use it only to agree on a key, then switch to fast symmetric AES for the actual data. Your HTTPS connection does exactly this: a Diffie-Hellman or elliptic-curve handshake establishes a shared key, and AES encrypts every byte after that. The expensive public key step runs once per session; everything else is the cheap XOR-based cipher from level one.`,
        },
        { kind: "heading", text: "Bitcoin key derivation" },
        {
          kind: "prose",
          html: `<p>A Bitcoin address is the end of a one-way chain that starts at the private key.</p>
<p>The <strong>private key</strong> is a random 256-bit number, 32 bytes, the secret. The <strong>public key</strong> is that private key multiplied by the secp256k1 generator point G, giving a point on the curve, 33 bytes compressed. That multiplication is the trapdoor: you cannot run it backwards. The <strong>address</strong> is the public key hashed by SHA-256 then RIPEMD-160 to 20 bytes, then Base58Check encoded.</p>`,
        },
        { kind: "diagram", name: "bitcoin-address-derivation" },
        {
          kind: "prose",
          html: `<p>Every arrow goes one direction only. You cannot get from the address back to the public key, and you cannot get from the public key back to the private key. The intermediate code shows the hashing half of that chain, plus the commitment scheme it powers.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustInter, label: "address.rs" },
            c: { language: "c", code: cInter, label: "address.c" },
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
      title: "Digital signatures and **Bitcoin transactions**",
      blocks: [
        {
          kind: "prose",
          html: `<p>A digital signature proves three things at once, without revealing your private key. <strong>Authentication:</strong> this message came from you. <strong>Integrity:</strong> the message was not modified. <strong>Non-repudiation:</strong> you cannot deny signing it.</p>
<p>The mechanism: hash the message, sign the hash with the private key, then publish the message, the signature and the public key. Anyone recomputes the hash and verifies it against the public key. If the message was altered, its hash no longer matches, verification fails, and the transaction is rejected.</p>
<p>Bitcoin uses ECDSA on the secp256k1 curve with 256-bit keys. Signatures are 71 to 72 bytes DER encoded. Every transaction input carries a scriptSig holding the DER signature and the compressed public key, and every node verifies the transaction hash against that signature and public key, then checks that the public key hashes to the address being spent. Any failure rejects the transaction.</p>`,
        },
        { kind: "heading", text: "secp256k1" },
        {
          kind: "prose",
          html: `<p>Bitcoin chose one specific elliptic curve, secp256k1, for its efficient arithmetic and absence of known weaknesses. The curve is y squared = x cubed + 7, modulo a 256-bit prime.</p>
<p>Points on the curve form a group with a generator point G, and every public key is private_key times G under elliptic curve point multiplication. Recovering the private key from the public key and G is the elliptic curve discrete logarithm problem: no known efficient algorithm, O(2^128) with the best known attacks.</p>
<p>The Big O page called O(2^256) impossible. O(2^128) is also impossible at any computational scale. That is why a 256-bit key is enough.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// Schnorr signatures and Taproot",
          body: `Bitcoin upgraded to Schnorr signatures with Taproot in 2021. Schnorr signatures are linear, which means they can be added together: a 3-of-3 multisig can look identical to a 1-of-1 on-chain. That is more private, uses less block space, and costs lower fees. Key aggregation lets Alice and Bob combine their public keys into one, producing a single signature for both, with nothing on the blockchain revealing that two keys were ever involved. This is the mathematics behind Lightning Network channel openings.`,
        },
        {
          kind: "prose",
          html: `<p>The code below is the real thing. Rust uses the secp256k1 crate, C uses OpenSSL. Both generate a key pair, sign the double-SHA256 of a transaction, and verify it exactly as a Bitcoin node would.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustAdv, label: "ecdsa.rs" },
            c: { language: "c", code: cAdv, label: "ecdsa.c" },
          },
        },
        { kind: "heading", text: "From private key to transaction: the full picture" },
        {
          kind: "prose",
          html: `<p>Everything on this page runs every time you send Bitcoin. Your wallet holds a private key, a random 256-bit number. From it, secp256k1 derives your public key, and SHA-256 then RIPEMD-160 derive your address. The address is all you share; nobody can recover the public key from it, and nobody can recover the private key from the public key.</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "RECEIVE",
              value: "only the address is seen",
              desc: "Someone sends to your address and the blockchain records that the address controls those coins. Your private key is never revealed. Your public key is not revealed either. Only the address.",
            },
            {
              label: "SEND",
              value: "sign with the private key",
              desc: "Your wallet builds a transaction and signs it with your private key. The signature proves you control the address. The transaction broadcasts across the peer network, the graph from the previous page.",
            },
            {
              label: "VERIFY",
              value: "every node, three checks",
              desc: "Each node double-SHA256s the transaction, runs ECDSA verify of the signature against the public key, and checks RIPEMD-160(SHA-256(public key)) equals the address. All three pass, the transaction is valid, miners include it.",
            },
          ],
        },
        {
          kind: "callout",
          variant: "warn",
          title: "// trust the mathematics, not the institution",
          body: `The private key never left your device. The network never saw it. But you proved you owned the coins without revealing the secret. This is what Diffie and Hellman unlocked in 1976: two strangers, no shared secret, private communication anyway. Prove ownership without revealing the secret. Transact without a central authority. The whole of Bitcoin's security rests on this, and the rest of Series 2 builds on it.`,
        },
      ],
    },
  ],
  connections: {
    title: "Where cryptography appears in ScrapyBytes",
    introHtml: `<p>Cryptography is not a new subject so much as the previous 27 pages aimed at one goal: secrecy and proof. Here is where it reaches back.</p>`,
    items: [
      {
        slug: "logic-gates",
        text: `XOR is the most important gate in cryptography: AES uses it every round, stream ciphers XOR keystream with plaintext, and SHA-256 is 64 rounds of XOR, AND, NOT and shifts. Cryptography is logic gates applied with purpose.`,
      },
      {
        slug: "hashing",
        text: `SHA-256 is in every Bitcoin operation: double SHA-256 for transaction IDs, SHA-256 for Merkle roots, SHA-256 then RIPEMD-160 for addresses. The hashing page gave the mechanism; this page is why one-way and avalanche make it secure.`,
      },
      {
        slug: "big-o",
        text: `Private key to public key is effectively O(1); the reverse is O(2^128) with the best known attacks. That gap is the security. The Big O page proved O(2^256) impossible, and O(2^128) is impossible too. Cryptography is weaponised Big O.`,
      },
      {
        slug: "binary",
        text: `Every private key is 256 random bits, every signature and ciphertext is bits. XOR is a gate on bits and AES is XOR with structure applied ten times. The binary page is the raw material.`,
      },
      {
        slug: "blockchain",
        text: `Every transaction uses ECDSA, every block header SHA-256, every address SHA-256 and RIPEMD-160, every Merkle root SHA-256. The blockchain page described the system; this page is the primitives that secure it.`,
      },
      {
        slug: "memory",
        text: `Private keys are 32 bytes, public keys 33, signatures 71, living on the stack or heap. Secure key handling means zeroing that memory after use: Rust drops and zeroes automatically, C needs an explicit memset.`,
      },
      {
        slug: "graphs",
        text: `The secp256k1 curve is a group, and the discrete logarithm problem is finding a path through it. Lightning aggregates keys across the payment channel graph. Cryptography and graph theory meet in the most important financial network built.`,
      },
      {
        slug: "networking",
        text: `Every HTTPS connection uses Diffie-Hellman to exchange a key, AES to encrypt, and ECDSA for certificates. The networking page sent the packets; cryptography is what makes them private and tamper-evident.`,
      },
      {
        slug: "distributed-systems",
        text: `Bitcoin's answer to the Byzantine Generals Problem leans on cryptography: signatures stop impersonation, hashes stop tampering, proof of work uses hash difficulty. The problem was the previous arc; this is a large part of the solution.`,
      },
      {
        slug: "pointers",
        text: `A private key is, in a sense, a pointer to your coins: whoever holds it controls them, and losing it loses them. A hardware wallet holds that pointer without ever letting it touch an internet-connected machine.`,
      },
      {
        slug: "recursion",
        text: `The Merkle commitments under every block are recursive hashing, and the modular arithmetic of signing recurses through the group structure. The cryptographic structures in Bitcoin are recursive at their core.`,
      },
      {
        slug: "sorting",
        text: `Cryptographic systems still run on ordinary data structures: certificate transparency logs are Merkle trees, key servers are sorted databases. Security does not replace engineering. It extends it.`,
      },
    ],
  },
  nextUp: {
    eyebrow: "next up / 0x1D",
    title: "The mathematics of public keys: elliptic curves, key pairs, and how Bitcoin generates addresses.",
    href: "/public-key-cryptography",
    label: "public key cryptography",
    variant: "cyan",
  },
};
