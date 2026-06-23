import type { PageContent } from "@/types/content";

/* ---------------------------------------------------------------------------
 * BEGINNER: sign, verify, and watch a tampered message fail. Rust uses the
 * secp256k1 crate; C uses OpenSSL ECDSA_sign / ECDSA_verify.
 * ------------------------------------------------------------------------- */
const rustBeginner = `// Add to Cargo.toml:
//   secp256k1 = { version = "0.27", features = ["rand"] }
//   sha2 = "0.10"
use secp256k1::{Secp256k1, Message};
use secp256k1::rand::rngs::OsRng;
use sha2::{Sha256, Digest};

fn sign_and_verify_demo() {
    let secp = Secp256k1::new();
    let (private_key, public_key) =
        secp.generate_keypair(&mut OsRng);

    let message = b"Send 1 BTC to Alice";

    // Step 1: hash the message. Bitcoin uses double SHA-256.
    let hash1 = Sha256::digest(message);
    let hash2 = Sha256::digest(hash1);
    let msg = Message::from_digest_slice(&hash2)
        .expect("32 bytes");

    // Step 2: sign with the private key. The crate generates
    // a deterministic RFC 6979 nonce k internally, so there is
    // no nonce to reuse and no RNG to break at signing time.
    let signature = secp.sign_ecdsa(&msg, &private_key);
    println!("Signature: {} bytes",
             signature.serialize_der().len()); // 71-72

    // Step 3: verify with the public key. No private key needed.
    let valid = secp.verify_ecdsa(&msg, &signature, &public_key);
    println!("Valid: {}", valid.is_ok());

    // Now tamper with the message and verify again.
    let tampered = b"Send 100 BTC to Alice";
    let t1 = Sha256::digest(tampered);
    let t2 = Sha256::digest(t1);
    let t_msg = Message::from_digest_slice(&t2).unwrap();

    let tampered_valid =
        secp.verify_ecdsa(&t_msg, &signature, &public_key);
    println!("Tampered valid: {}", tampered_valid.is_ok()); // false
    // One changed digit. Verification fails completely.
    // That is the integrity guarantee in action.
}`;

const cBeginner = `/* Compile: gcc sign.c -o sign -lssl -lcrypto */
#include <openssl/ec.h>
#include <openssl/ecdsa.h>
#include <openssl/obj_mac.h>
#include <openssl/sha.h>
#include <string.h>
#include <stdio.h>

void sign_and_verify_demo(void) {
    EC_KEY *key = EC_KEY_new_by_curve_name(NID_secp256k1);
    EC_KEY_generate_key(key);

    const char *message = "Send 1 BTC to Alice";

    /* Step 1: double SHA-256 (Bitcoin standard) */
    uint8_t hash1[32], hash2[32];
    SHA256((const uint8_t*)message, strlen(message), hash1);
    SHA256(hash1, 32, hash2);

    /* Step 2: sign. ECDSA_sign generates the nonce k
     * internally. It must be unique on every call. */
    uint8_t  sig[72];
    unsigned sig_len = sizeof sig;
    ECDSA_sign(0, hash2, 32, sig, &sig_len, key);
    printf("Signature: %u bytes\\n", sig_len);

    /* Step 3: verify */
    int valid = ECDSA_verify(0, hash2, 32, sig, sig_len, key);
    printf("Valid: %d\\n", valid); /* 1 = valid */

    /* Tamper with the message */
    const char *tampered = "Send 100 BTC to Alice";
    uint8_t t1[32], t2[32];
    SHA256((const uint8_t*)tampered, strlen(tampered), t1);
    SHA256(t1, 32, t2);

    int tampered_valid =
        ECDSA_verify(0, t2, 32, sig, sig_len, key);
    printf("Tampered valid: %d\\n", tampered_valid); /* 0 */
    /* One changed character. The signature no longer matches. */

    EC_KEY_free(key);
}`;

/* ---------------------------------------------------------------------------
 * INTERMEDIATE: why nonce reuse is fatal, and why deterministic nonces fix it.
 * Rust shows the safe library path; C confirms two signs produce different r.
 * ------------------------------------------------------------------------- */
const rustInter = `use secp256k1::{Secp256k1, SecretKey, Message};
use sha2::{Sha256, Digest};

// EDUCATION ONLY. Never implement signing by hand.
// The secp256k1 crate uses RFC 6979 deterministic nonces
// internally, so it is NOT vulnerable to nonce reuse.
fn nonce_reuse_is_fatal() {
    println!("If k repeats across two signatures:");
    println!("  s1 = k^-1 (z1 + r*d) mod n");
    println!("  s2 = k^-1 (z2 + r*d) mod n");
    println!("Same k means the same r. Subtract:");
    println!("  s1 - s2 = k^-1 (z1 - z2) mod n");
    println!("  k = (z1 - z2) * (s1 - s2)^-1 mod n");
    println!("Then recover the private key:");
    println!("  d = (s1*k - z1) * r^-1 mod n");
    println!("Two signatures. Basic algebra. Key gone.");

    // The safe library path: same private key, two
    // different messages, two different nonces internally.
    let secp = Secp256k1::new();
    let private_key = SecretKey::from_slice(&[1u8; 32]).unwrap();

    let h1 = Sha256::digest(b"message one");
    let h2 = Sha256::digest(b"message two");
    let m1 = Message::from_digest_slice(&h1).unwrap();
    let m2 = Message::from_digest_slice(&h2).unwrap();

    // RFC 6979 derives k from the private key and the
    // message hash. Different messages, different k.
    let _sig1 = secp.sign_ecdsa(&m1, &private_key);
    let _sig2 = secp.sign_ecdsa(&m2, &private_key);
    println!("Two messages, two safe nonces, no randomness to break.");
}`;

const cInter = `/* Compile: gcc nonce.c -o nonce -lssl -lcrypto */
#include <openssl/ec.h>
#include <openssl/ecdsa.h>
#include <openssl/bn.h>
#include <openssl/sha.h>
#include <stdio.h>
#include <string.h>

/* Sign two different messages and confirm the signatures
 * use different r values. Since r = (k*G).x, two different
 * r values prove two different nonces k were used.
 * Equal r across different messages would be the exact bug
 * that broke Sony in 2010 and Android wallets in 2013. */
void verify_safe_signing(EC_KEY *key) {
    const char *msg1 = "transaction one";
    const char *msg2 = "transaction two";

    uint8_t h1[32], h2[32];
    SHA256((const uint8_t*)msg1, strlen(msg1), h1);
    SHA256((const uint8_t*)msg2, strlen(msg2), h2);

    ECDSA_SIG *sig1 = ECDSA_do_sign(h1, 32, key);
    ECDSA_SIG *sig2 = ECDSA_do_sign(h2, 32, key);

    const BIGNUM *r1, *s1, *r2, *s2;
    ECDSA_SIG_get0(sig1, &r1, &s1);
    ECDSA_SIG_get0(sig2, &r2, &s2);

    int same_r = BN_cmp(r1, r2) == 0;
    printf("Same r (danger if 1): %d\\n", same_r);
    /* With a correctly seeded OpenSSL this prints 0. */

    ECDSA_SIG_free(sig1);
    ECDSA_SIG_free(sig2);
}

/* The lesson: never write your own nonce generation.
 * Always use a vetted, audited library that follows
 * RFC 6979 deterministic nonces. */`;

/* ---------------------------------------------------------------------------
 * ADVANCED: Schnorr signatures and aggregation. Rust uses sign_schnorr; C
 * shows the fixed 64-byte structure and the linear verification equation.
 * ------------------------------------------------------------------------- */
const rustAdv = `// Add to Cargo.toml:
//   secp256k1 = { version = "0.27", features = ["rand"] }
use secp256k1::{Secp256k1, Keypair, Message};
use secp256k1::schnorr::Signature;
use secp256k1::rand::rngs::OsRng;
use sha2::{Sha256, Digest};

fn schnorr_demo() {
    let secp = Secp256k1::new();

    // BIP-340 uses x-only public keys: 32 bytes, not 33.
    let keypair = Keypair::new(&secp, &mut OsRng);
    let (xonly_pubkey, _parity) = keypair.x_only_public_key();

    let message = b"Send 1 BTC to Alice via Taproot";
    let hash = Sha256::digest(message);
    let msg = Message::from_digest_slice(&hash).unwrap();

    // BIP-340 Schnorr signing, deterministic nonce per spec.
    let signature: Signature = secp.sign_schnorr(&msg, &keypair);
    println!("Schnorr signature: {} bytes",
             signature.as_ref().len()); // 64, always
    // ECDSA is 71-72 bytes DER. Schnorr is a fixed 64.

    let valid = secp.verify_schnorr(&signature, &msg, &xonly_pubkey);
    println!("Valid: {}", valid.is_ok());
}

// Conceptual MuSig: Alice and Bob combine into one key
// and one signature. Real MuSig2 needs coefficient
// weighting to stop rogue-key attacks. Use a vetted
// implementation (the musig2 crate) in production.
fn musig_concept() {
    let secp = Secp256k1::new();
    let _alice = Keypair::new(&secp, &mut OsRng);
    let _bob   = Keypair::new(&secp, &mut OsRng);
    println!("Q_agg = Q_a + Q_b, s_agg = s_a + s_b.");
    println!("On-chain it looks like a single signer.");
}`;

const cAdv = `/* BIP-340 Schnorr is not in standard OpenSSL.
 * Bitcoin Core uses libsecp256k1's Schnorr module
 * (secp256k1_schnorrsig_sign32). This shows the
 * structure and why aggregation is sound. */
#include <stdint.h>
#include <stdio.h>

/* Schnorr signature: (R, s).
 * R: 32-byte x-only point. s: 32-byte scalar.
 * Total: 64 bytes, fixed, always.
 * ECDSA's DER-encoded (r, s) is variable, 71-72 bytes. */
typedef struct {
    uint8_t R[32];
    uint8_t s[32];
} SchnorrSig;

/* Verification equation: s*G == R + e*Q
 * where e = SHA256(R || Q || message).
 *
 * This is LINEAR in Q and R. That linearity is what
 * makes key and signature aggregation work, and it is
 * the core reason Bitcoin added Schnorr beside ECDSA. */
void explain_schnorr_linearity(void) {
    printf("Schnorr verify: s*G == R + e*Q\\n");
    printf("Linear in Q and R, so aggregates balance:\\n");
    printf("  Q_agg = Q_a + Q_b\\n");
    printf("  R_agg = R_a + R_b\\n");
    printf("  s_agg = s_a + s_b\\n");
    printf("Then s_agg*G == R_agg + e*Q_agg still holds.\\n");
}`;

export const digitalSignatures: PageContent = {
  slug: "digital-signatures",
  hexLabel: "0x1D",
  category: "cryptography",
  hero: {
    eyebrow: "root.system / 0x1D / signatures",
    title: `Two signatures.<br><span class="highlight">That is all it takes.</span>`,
    lede: `Sign a message with your private key. Anyone with your public key can verify it. Nobody can forge it. Nobody can deny it. That is the promise of a digital signature. But the promise has one condition, and breaking that one condition gives up your private key. It has already happened twice: once to Sony, once to Bitcoin users. This page is the one number you must never reuse.`,
    narrativeHtml: `<p>In 2010 Sony shipped a firmware update for the PlayStation 3.</p>
<p>Every update was signed. ECDSA, the same algorithm Bitcoin uses. The signature proved the update genuinely came from Sony.</p>
<p>Hackers found something strange. Every single signature Sony ever produced used the exact same random number, the number that is supposed to be different every single time.</p>
<p>With two signatures and that one mistake, the hackers derived Sony's private signing key. Forever.</p>
<p>Every PS3 ever sold could now run unsigned firmware. Sony could not revoke it. Could not fix it remotely. The key was gone.</p>
<p>In 2013 the same mistake happened again. An early Android Bitcoin wallet had a broken random number generator. It reused the same random value across transactions. Attackers who noticed extracted private keys, and swept real wallets in minutes.</p>
<p>Same bug. Different company. Same consequence.</p>
<p>A digital signature is not just math. It has exactly one ingredient that must be perfect every single time. A random number. Used once. Never twice. Or the private key is gone.</p>
<p>This page shows you why.</p>`,
  },
  levels: [
    /* =================================================================
       LEVEL 01 . BEGINNER
       ================================================================= */
    {
      level: "beginner",
      number: "01",
      title: "What a signature actually **proves**",
      blocks: [
        {
          kind: "prose",
          html: `<p>A digital signature is not encryption. This confuses people constantly. Encryption hides a message. A signature proves who sent it and that it was not altered. Different problem, different tool.</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "AUTHENTICATION",
              value: "it came from the key holder",
              desc: "Only the holder of the private key can produce a valid signature, and anyone with the public key can confirm it. No private key, no valid signature.",
            },
            {
              label: "INTEGRITY",
              value: "it was not altered",
              desc: "Change one bit of the message and the signature no longer verifies. The hash inside the signature stops matching the message. There is no partial credit.",
            },
            {
              label: "NON-REPUDIATION",
              value: "the signer cannot deny it",
              desc: "Only that private key could have produced that exact signature for that exact message. This is why digital signatures carry legal weight in many countries.",
            },
          ],
        },
        { kind: "diagram", name: "signature-flow" },
        {
          kind: "prose",
          html: `<p><strong>Sign</strong> takes the message and your private key, hashes the message with SHA-256, then signs the hash. The output is the signature alone, 71 to 72 bytes for ECDSA, 64 for Schnorr, regardless of message size. The message travels beside the signature, never inside it.</p>
<p><strong>Verify</strong> takes the message, the signature and the public key, recomputes the SHA-256 hash, and checks the signature against it. If the message changed, the hash changed and it fails. If a different private key signed it, it fails. Only the exact original message signed by the exact matching key verifies as true.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// signing is not encryption",
          body: `Encryption makes a message unreadable, reversible only with the right key. Signing leaves the message fully readable and only proves who produced it. You can sign a public announcement so everyone knows it is genuinely yours; you cannot meaningfully encrypt one, because everyone is supposed to read it. Same key pair, opposite goals.`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBeginner, label: "sign.rs" },
            c: { language: "c", code: cBeginner, label: "sign.c" },
          },
        },
        { kind: "widget", name: "signature-tamper" },
      ],
    },
    /* =================================================================
       LEVEL 02 . INTERMEDIATE
       ================================================================= */
    {
      level: "intermediate",
      number: "02",
      title: "How ECDSA actually **works**",
      blocks: [
        {
          kind: "prose",
          html: `<p>You already know the public key is private_key times G. Here is how signing uses it. Write d for the private key, z for the message hash, n for the curve order.</p>
<p><strong>Sign(d, z).</strong> Generate a random number k with 1 &le; k &le; n-1, the single most important number in the algorithm. Compute the point R = k times G, and let r = R.x mod n. Then compute s = k inverse times (z + r times d) mod n. The signature is the pair (r, s).</p>
<p><strong>Verify(Q, z, (r, s)).</strong> Compute w = s inverse mod n, then u1 = z times w and u2 = r times w. Compute the point P = u1 times G + u2 times Q. The signature is valid when P.x mod n equals r.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// a worked example with small numbers (illustrative, not secure)",
          body: `Take the toy curve y² = x³ + 2x + 2 mod 17, generator G = (5, 1), order n = 19. Let the private key d = 7, so the public key Q = 7G = (0, 6). Sign a hash z = 10 with nonce k = 3. Then R = 3G = (10, 6), so r = 10. And s = 3⁻¹ times (10 + 10·7) mod 19 = 13 times 80 mod 19 = 13 times 4 = 14. The signature is (10, 14). To verify: w = 14⁻¹ = 15, u1 = 10·15 mod 19 = 17, u2 = 10·15 mod 19 = 17, and P = 17G + 17Q = 17G + 5G = 22G = 3G = (10, 6). P.x mod 19 = 10 = r. Valid.`,
        },
        { kind: "heading", text: "Why k must never repeat" },
        {
          kind: "prose",
          html: `<p>This is the most important section on the page. Suppose the same k is used for two signatures (r, s1) and (r, s2) on messages with hashes z1 and z2. Because k is the same, r is the same in both.</p>`,
        },
        { kind: "diagram", name: "nonce-reuse-attack" },
        {
          kind: "prose",
          html: `<p>Both signatures share the relation s = k inverse times (z + r times d). Subtracting them cancels the r times d term: s1 - s2 = k inverse times (z1 - z2). That solves directly for the nonce, k = (z1 - z2) times (s1 - s2) inverse mod n. With k in hand, rearrange a single signature to get the private key: d = (s1 times k - z1) times r inverse mod n. Two signatures and basic modular algebra. The private key is gone.</p>`,
        },
        {
          kind: "callout",
          variant: "warn",
          title: "// this is exactly what happened",
          body: `Sony PS3, 2010: every firmware signature used an identical k. Two signed files were enough to recover Sony's signing key permanently, and it could not be revoked. Android Bitcoin wallet, 2013: a flaw in Android's SecureRandom produced repeated or predictable values, so many transactions shared a nonce. Attackers recovered private keys and swept the affected wallets within minutes of spotting it. Same bug, twice, with the same outcome.`,
        },
        {
          kind: "prose",
          html: `<p><strong>The fix: deterministic nonces (RFC 6979).</strong> Instead of generating k from a random source that might be broken, derive it from the private key and the message hash: k = HMAC_DRBG(private_key, message_hash). The same private key and message always produce the same k, but k is still unique per distinct message, and an attacker without the private key cannot predict or influence it. No randomness is needed at signing time, so there is no RNG left to break. This is what modern Bitcoin signing libraries use by default.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustInter, label: "nonce.rs" },
            c: { language: "c", code: cInter, label: "nonce.c" },
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
      title: "Schnorr signatures and **Taproot**",
      blocks: [
        {
          kind: "prose",
          html: `<p>ECDSA has been Bitcoin's signature scheme since 2009. In 2021 Bitcoin activated Taproot, adding Schnorr signatures (BIP-340). ECDSA was not broken. Schnorr is simply better at one thing: it is linear. Schnorr signatures can be added together, where ECDSA signatures cannot.</p>
<p><strong>Sign(d, z).</strong> Pick a nonce k (deterministic, per BIP-340), compute R = k times G, then e = SHA256(R || public_key || message), and s = k + e times d mod n. The signature is (R, s). <strong>Verify</strong> recomputes e and checks s times G == R + e times Q. That verification equation is linear in Q and R, and that is the whole trick.</p>`,
        },
        { kind: "diagram", name: "schnorr-aggregation" },
        {
          kind: "prose",
          html: `<p>Because the equation is linear, signatures and keys aggregate. In MuSig, several signers combine their public keys into one aggregate key and their partial signatures into one signature. Three people jointly controlling funds with ECDSA show a visible 3-of-3 multisig script: larger, more expensive, and obviously multisig to anyone watching. With Schnorr MuSig the three keys become one key and the three signatures become one signature, indistinguishable on-chain from a single person spending normally. Same 64 bytes, same fee, full privacy about the structure.</p>
<p>Real MuSig2 weights each key with a coefficient to prevent rogue-key attacks, so combine keys with a vetted implementation rather than naive addition. The concept, though, is exactly the linearity above: add the keys, add the nonce points, add the signatures, and the verification equation still balances.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustAdv, label: "schnorr.rs" },
            c: { language: "c", code: cAdv, label: "schnorr.c" },
          },
        },
        { kind: "heading", text: "Signatures inside every Bitcoin transaction" },
        {
          kind: "prose",
          html: `<p>Every transaction you have sent or received was secured by exactly this. Two mechanisms shape how the signing is applied in practice.</p>`,
        },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "SIGHASH FLAGS",
              value: "what the signature commits to",
              desc: "SIGHASH_ALL (default) signs every input and output, so nothing can change after signing. SIGHASH_NONE signs only the inputs, SIGHASH_SINGLE signs one matching output, and SIGHASH_ANYONECANPAY lets more inputs be added later. The last two power CoinJoin and crowdfund-style transactions.",
            },
            {
              label: "PSBT (BIP-174)",
              value: "many signers, one transaction",
              desc: "A Partially Signed Bitcoin Transaction passes between signers, possibly offline, on different devices. A hardware wallet signs its part and hands the PSBT on; once enough signatures exist, the complete transaction is broadcast. This is how multisig wallets, exchanges and corporate treasuries actually sign.",
            },
          ],
        },
        {
          kind: "callout",
          variant: "warn",
          title: "// the signature is the entire security model",
          body: `A Bitcoin transaction asks no authority for permission. It checks no identity database, no phone number, no bank. It checks exactly one thing: does this signature verify against the public key that controls this output? If yes, it is valid, and the network has no opinion about who you are. That is what trustless means in practice: not the absence of trust, but the replacement of trust with verifiable mathematics, answering one question without anyone's permission. Did the person who controls this money agree to this transaction? The signature is the answer.`,
        },
      ],
    },
  ],
  connections: {
    title: "Where digital signatures appear in ScrapyBytes",
    introHtml: `<p>A signature is the lock on every door in Bitcoin, and it is built from pieces you already know. Here is where this page reaches back.</p>`,
    items: [
      {
        slug: "public-key-cryptography",
        text: `This page is built entirely on the previous one. The private key, public key and elliptic curve point multiplication explained there are the exact ingredients the signing and verification equations use here.`,
      },
      {
        slug: "hashing",
        text: `Every signature signs a hash, not a message: SHA-256 first, then ECDSA or Schnorr. The one-way property from the hashing page is inherited, so you cannot work backward from a signature to a message that was never signed.`,
      },
      {
        slug: "big-o",
        text: `Recovering a key from a reused nonce is trivial algebra; recovering it otherwise is O(2^128). The entire security model lives in that gap, and the Big O page is why the gap is permanent.`,
      },
      {
        slug: "binary",
        text: `A signature is bits: 71 to 72 bytes for ECDSA, 64 for Schnorr. Every value in the signing equation is a 256-bit number stored as binary. The binary page is the raw material.`,
      },
      {
        slug: "blockchain",
        text: `Every transaction input carries a signature, and every node verifies every one before accepting a block. Remove signatures and anyone could spend anyone's coins. This page is the lock on every door the blockchain page described.`,
      },
      {
        slug: "memory",
        text: `A private key in memory during signing is the most sensitive moment in a transaction's life. Hardware wallets sign inside a secure element so the key never touches general-purpose memory malware could read.`,
      },
      {
        slug: "networking",
        text: `A signed transaction broadcasts across the peer network, and every receiving node verifies the signature independently before relaying it. There is no central signature authority; each node checks the math itself.`,
      },
      {
        slug: "distributed-systems",
        text: `Nodes do not trust each other, they trust verifiable signatures. A forged transaction is mathematically detectable by any honest node without trusting the sender, which is part of how Bitcoin answers the Byzantine Generals Problem.`,
      },
      {
        slug: "recursion",
        text: `PSBT signing across parties is conceptually recursive: each signer adds a signature and passes the partial structure on, with the base case being enough signatures to broadcast.`,
      },
    ],
  },
  nextUp: {
    eyebrow: "next up / 0x1E",
    title: "Open the SHA-256 black box: 64 rounds of XOR gates and bit rotations.",
    href: "/hash-deep-dive",
    label: "hash functions deep dive",
    variant: "cyan",
  },
};
