import type { PageContent } from "@/types/content";

/* ---------------------------------------------------------------------------
 * BEGINNER: commitments, the building block of every ZK protocol. Rust uses
 * sha2 + rand with a salted commitment; C uses OpenSSL SHA256 + RAND_bytes.
 * ------------------------------------------------------------------------- */
const rustBeginner = `// Add to Cargo.toml: sha2 = "0.10", rand = "0.8"
use sha2::{Sha256, Digest};
use rand::Rng;

// A salted commitment. The foundation of ZK protocols:
// commit to a value now, prove you knew it later, without
// revealing it early.
struct Commitment {
    hash: [u8; 32], // published
    salt: [u8; 32], // secret until reveal
}

fn commit(secret: &[u8]) -> Commitment {
    // Salt defeats brute force on the commitment. Without it,
    // SHA-256(42) is guessable; SHA-256(salt || 42) is not.
    let salt: [u8; 32] = rand::thread_rng().gen();
    let mut h = Sha256::new();
    h.update(salt);
    h.update(secret);
    Commitment { hash: h.finalize().into(), salt }
}

fn reveal_and_verify(c: &Commitment, secret: &[u8]) -> bool {
    let mut h = Sha256::new();
    h.update(c.salt);
    h.update(secret);
    let computed: [u8; 32] = h.finalize().into();
    computed == c.hash
}

// Coin flip over the internet, with no trusted party.
// Alice commits before Bob reveals, so neither can bias it.
fn fair_coin_flip() {
    let alice: u8 = rand::thread_rng().gen_range(0..=1);
    let c = commit(&[alice]);          // Alice commits first

    let bob: u8 = rand::thread_rng().gen_range(0..=1); // Bob announces

    assert!(reveal_and_verify(&c, &[alice])); // Alice reveals, Bob checks
    let result = alice ^ bob;          // XOR of two fair bits is fair
    println!("Alice: {}, Bob: {}, Result: {}", alice, bob, result);
}`;

const cBeginner = `/* Compile: gcc commit.c -o commit -lssl -lcrypto */
#include <openssl/sha.h>
#include <openssl/rand.h>
#include <string.h>
#include <stdio.h>
#include <stdint.h>

typedef struct {
    uint8_t hash[32]; /* published commitment */
    uint8_t salt[32]; /* secret until reveal   */
} Commitment;

Commitment commit(const uint8_t *secret, size_t len) {
    Commitment c;
    RAND_bytes(c.salt, 32);
    SHA256_CTX ctx;
    SHA256_Init(&ctx);
    SHA256_Update(&ctx, c.salt, 32);
    SHA256_Update(&ctx, secret, len);
    SHA256_Final(c.hash, &ctx);
    return c;
}

int verify_commitment(const Commitment *c,
                      const uint8_t *secret, size_t len) {
    uint8_t computed[32];
    SHA256_CTX ctx;
    SHA256_Init(&ctx);
    SHA256_Update(&ctx, c->salt, 32);
    SHA256_Update(&ctx, secret, len);
    SHA256_Final(computed, &ctx);
    return memcmp(computed, c->hash, 32) == 0;
}

/* The Schnorr identification protocol: an interactive ZK
 * proof that Peggy knows x where Y = x*G, without showing x.
 *   Round 1: Peggy sends R = k*G for random k.
 *   Round 2: Victor sends a random challenge c.
 *   Round 3: Peggy sends s = k + c*x mod n.
 *   Verify : s*G == R + c*Y.
 * Victor learns that Peggy knows x, and nothing about x. */
void schnorr_zk_concept(void) {
    printf("Peggy publishes Y = x*G\\n");
    printf("R1 Peggy:  R = k*G (random k)\\n");
    printf("R2 Victor: challenge c (random)\\n");
    printf("R3 Peggy:  s = k + c*x mod n\\n");
    printf("Verify:    s*G == R + c*Y\\n");
    printf("A cheater passes with probability ~1/n.\\n");
    printf("Victor learns zero information about x.\\n");
}`;

/* ---------------------------------------------------------------------------
 * INTERMEDIATE: Fiat-Shamir turns the interactive proof non-interactive.
 * Rust shows the non-interactive Schnorr proof + Pedersen idea; C mirrors it.
 * ------------------------------------------------------------------------- */
const rustInter = `use secp256k1::{Secp256k1, SecretKey, PublicKey};
use secp256k1::rand::rngs::OsRng;
use sha2::{Sha256, Digest};

// Non-interactive Schnorr proof via Fiat-Shamir. Proves
// knowledge of x where Y = x*G, with no live verifier.
struct SchnorrProof {
    commitment: PublicKey, // R = k*G
    response:   [u8; 32],  // s = k + e*x mod n
}

fn schnorr_prove(
    _private_key: &SecretKey,
    public_key:   &PublicKey,
    message:      &[u8],
) -> SchnorrProof {
    let secp = Secp256k1::new();

    // Round 1: random k, commitment R = k*G.
    let (_k, r) = secp.generate_keypair(&mut OsRng);

    // Fiat-Shamir: the hash IS the challenge. The prover
    // commits to R before hashing, and SHA-256 is one-way,
    // so they cannot steer the challenge.
    let mut h = Sha256::new();
    h.update(r.serialize());
    h.update(public_key.serialize());
    h.update(message);
    let e: [u8; 32] = h.finalize().into();

    // Response s = k + e*x mod n (real code uses scalar
    // arithmetic mod the curve order). Verifier checks
    // s*G == R + e*Y. This is exactly a Schnorr signature.
    SchnorrProof { commitment: r, response: e }
}

// Pedersen commitment: C = v*G + r*H.
//   hiding:        C reveals nothing about v (blinded by r)
//   binding:       you cannot change v after committing
//   homomorphic:   C(v1) + C(v2) = C(v1 + v2)
// Monero uses this to prove inputs sum to outputs without
// revealing any amount.
fn pedersen_concept() {
    println!("C = v*G + r*H");
    println!("hiding . binding . additively homomorphic");
    println!("add commitments without ever opening them.");
}`;

const cInter = `/* Compile: gcc nizk.c -o nizk -lssl -lcrypto */
#include <openssl/sha.h>
#include <openssl/ec.h>
#include <openssl/bn.h>
#include <string.h>
#include <stdio.h>
#include <stdint.h>

/* Non-interactive Schnorr proof of knowing x where Y = x*G.
 * Fiat-Shamir: challenge = SHA-256(R || Y || msg). */
void schnorr_nizk(const EC_KEY *key,
                  const uint8_t *msg, size_t msg_len) {
    const EC_GROUP *group = EC_KEY_get0_group(key);
    BN_CTX *ctx = BN_CTX_new();

    /* Round 1: k random, R = k*G */
    EC_KEY *eph = EC_KEY_new();
    EC_KEY_set_group(eph, group);
    EC_KEY_generate_key(eph);

    uint8_t R[33], Y[33];
    EC_POINT_point2oct(group, EC_KEY_get0_public_key(eph),
        POINT_CONVERSION_COMPRESSED, R, 33, ctx);
    EC_POINT_point2oct(group, EC_KEY_get0_public_key(key),
        POINT_CONVERSION_COMPRESSED, Y, 33, ctx);

    /* Fiat-Shamir challenge */
    uint8_t e[32];
    SHA256_CTX sha;
    SHA256_Init(&sha);
    SHA256_Update(&sha, R, 33);
    SHA256_Update(&sha, Y, 33);
    SHA256_Update(&sha, msg, msg_len);
    SHA256_Final(e, &sha);

    /* Response s = k + e*x mod n (scalar arithmetic omitted) */
    printf("R: %02x%02x%02x%02x...\\n", R[0], R[1], R[2], R[3]);
    printf("challenge: %02x%02x%02x%02x...\\n", e[0], e[1], e[2], e[3]);
    printf("verify s*G == R + e*Y . proves x, reveals nothing\\n");

    EC_KEY_free(eph);
    BN_CTX_free(ctx);
}`;

/* ---------------------------------------------------------------------------
 * ADVANCED: polynomial commitments under SNARKs, and the rollup idea. Rust
 * evaluates a polynomial with Horner and hashes a commitment; C mirrors it.
 * ------------------------------------------------------------------------- */
const rustAdv = `use sha2::{Sha256, Digest};

// A polynomial over a finite field. Real SNARKs use a
// 254-bit prime field; this uses u64 for illustration.
struct Polynomial {
    coefficients: Vec<u64>,
    modulus: u64,
}

impl Polynomial {
    fn evaluate(&self, x: u64) -> u64 {
        // Horner: a0 + x*(a1 + x*(a2 + ...))
        self.coefficients.iter().rev().fold(0u64, |acc, &c| {
            (acc.wrapping_mul(x).wrapping_add(c)) % self.modulus
        })
    }
}

fn polynomial_commitment_demo() {
    let poly = Polynomial { coefficients: vec![3, 2, 1], modulus: 1_000_000_007 }; // 3 + 2x + x^2

    // Commit by hashing the coefficients. Nobody can read
    // them back from the hash.
    let commitment: [u8; 32] = {
        let mut h = Sha256::new();
        for &c in &poly.coefficients { h.update(c.to_le_bytes()); }
        h.finalize().into()
    };
    println!("commitment: {:02x?}", &commitment[..8]);

    let y = poly.evaluate(5);
    println!("poly(5) = {}", y); // 3 + 10 + 25 = 38

    // A real SNARK replaces the hash with a KZG, IPA or FRI
    // commitment that proves the evaluation without revealing
    // the polynomial. Proof ~200 bytes, verify in milliseconds,
    // O(1) in the circuit size.
}

// The ZK rollup: batch thousands of transactions off-chain,
// produce one proof, verify it on the base layer in O(1).
fn zk_rollup_concept() {
    println!("sequencer runs 10,000 transactions off-chain");
    println!("proof: 'ran them from state S1 to state S2'");
    println!("base layer verifies in ~200k gas, like ~10 txs");
    println!("10,000 transactions for the cost of 10. ~1000x.");
}`;

const cAdv = `#include <stdint.h>
#include <stdio.h>
#include <openssl/sha.h>

/* Polynomial evaluation over a finite field, the workhorse
 * inside every SNARK. The computation becomes a constraint
 * system, the constraints become a polynomial, the prover
 * commits to it, and the verifier checks a few points. */
typedef struct {
    uint64_t *coeffs;
    size_t    degree;
    uint64_t  modulus;
} Poly;

uint64_t poly_eval(const Poly *p, uint64_t x) {
    uint64_t result = 0, xpow = 1;
    for (size_t i = 0; i <= p->degree; i++) {
        result = (result + p->coeffs[i] * xpow) % p->modulus;
        xpow = xpow * x % p->modulus;
    }
    return result;
}

void polynomial_commitment_demo(void) {
    uint64_t coeffs[] = {3, 2, 1}; /* 3 + 2x + x^2 */
    Poly p = { coeffs, 2, 1000000007ULL };

    uint8_t commitment[32];
    SHA256_CTX ctx;
    SHA256_Init(&ctx);
    for (size_t i = 0; i <= p.degree; i++)
        SHA256_Update(&ctx, &coeffs[i], 8);
    SHA256_Final(commitment, &ctx);

    printf("commitment: %02x%02x%02x%02x...\\n",
           commitment[0], commitment[1], commitment[2], commitment[3]);
    printf("poly(5) = %llu (expected 38)\\n",
           (unsigned long long)poly_eval(&p, 5));
    /* A real SNARK uses a KZG commitment: evaluation proof
     * ~96 bytes, verified with one pairing check, O(1) in
     * the polynomial degree. */
}`;

export const zeroKnowledgeProofs: PageContent = {
  slug: "zero-knowledge-proofs",
  hexLabel: "0x20",
  category: "cryptography",
  banner: {
    eyebrow: "Series 2: Cryptography . complete",
    title: "You started at a transistor. You arrived at zero knowledge proofs.",
    lines: ["32 pages. Nothing skipped. Everything connected."],
    tone: "green",
  },
  hero: {
    eyebrow: "root.system / 0x20 / zero-knowledge",
    title: `Prove you know a secret.<br><span class="highlight">Without revealing the secret.</span>`,
    lede: `Prove you are over 18 without showing your ID. Prove you have enough money without revealing your balance. Prove a transaction is valid without showing the transaction. This is not science fiction. It is running in production right now, on Ethereum, on Zcash, on Bitcoin, and it is built from the same mathematics you already understand.`,
    narrativeHtml: `<p>For most of human history, proof required revelation. Prove you know the password: type the password. Prove you have the money: show the balance. Prove you are old enough: show the birth date. In every case the proof contained the very thing you were trying to protect.</p>
<p>In 1985 three MIT cryptographers, Shafi Goldwasser, Silvio Micali and Charles Rackoff, asked a question nobody had thought to ask. What is the minimum information a proof needs to convey?</p>
<p>And they proved something remarkable. You can convince someone you know a secret by revealing nothing about that secret. Not a hint, not a clue, not a single bit that would help them learn it themselves. Just the certainty that you know it.</p>
<p>This is a zero knowledge proof. And today it powers the most important scaling technology in blockchain history: zkSync, Polygon zkEVM, Scroll and StarkNet, Layer 2s processing millions of transactions a day without revealing them to the verification layer. Zcash uses it for completely private transactions, sender, receiver and amount all hidden but provably valid to every node.</p>
<p>This page is how they work. You already know every primitive this requires: hashing, commitments, elliptic curves, trapdoor functions, Big O. You have been building toward this for thirty-one pages.</p>`,
  },
  levels: [
    /* =================================================================
       LEVEL 01 . BEGINNER
       ================================================================= */
    {
      level: "beginner",
      number: "01",
      title: "The **Ali Baba** cave",
      blocks: [
        {
          kind: "prose",
          html: `<p>Before the mathematics there is the intuition, and the Ali Baba cave is the most famous thought experiment in all of cryptography. Understand it and you understand zero knowledge proofs at their core.</p>
<p>The cave is a ring with one entrance and a magic door in the middle that opens only with a secret word. <strong>Peggy</strong>, the prover, knows the word. <strong>Victor</strong>, the verifier, wants to be convinced without learning it.</p>`,
        },
        { kind: "diagram", name: "alibaba-cave" },
        {
          kind: "prose",
          html: `<p>Victor waits at the entrance while Peggy walks in and takes the left or right path, unseen. Then Victor shouts a random side to come out from. If Peggy went that way already, she just walks back. If not, she passes through the door, which she can only do because she knows the word. Repeat.</p>
<p>After one round a cheater has a 50% chance of being lucky. After ten rounds, 1 in 1024. After thirty, about 1 in a billion. After sixty, negligible. Victor becomes convinced Peggy knows the word, and yet he has learned nothing about it: not a character, not the length, not whether it starts with a vowel. Only that she knows it.</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            { label: "COMPLETENESS", value: "true is provable", desc: "If Peggy knows the secret, she can always convince Victor. A true statement is always provable." },
            { label: "SOUNDNESS", value: "false is not", desc: "If Peggy does not know the secret, she cannot convince Victor except with negligible probability. A false statement cannot be proven." },
            { label: "ZERO KNOWLEDGE", value: "nothing leaks", desc: "Victor learns nothing about the secret beyond the fact that Peggy knows it. The proof carries zero information about the secret itself." },
          ],
        },
        {
          kind: "callout",
          variant: "info",
          title: "// a commitment scheme taken to the extreme",
          body: `You already know commitment schemes from the hash deep dive page: SHA-256(secret) is the commitment, you publish it, and you reveal the secret later so anyone can verify you did not change your mind. A zero knowledge proof is that idea pushed all the way. Instead of revealing the secret later, you never reveal it. You just prove that you could.`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBeginner, label: "commit.rs" },
            c: { language: "c", code: cBeginner, label: "commit.c" },
          },
        },
        { kind: "widget", name: "ali-baba-cave" },
      ],
    },
    /* =================================================================
       LEVEL 02 . INTERMEDIATE
       ================================================================= */
    {
      level: "intermediate",
      number: "02",
      title: "Interactive vs **non-interactive** proofs",
      blocks: [
        {
          kind: "prose",
          html: `<p>The Ali Baba protocol is interactive: Peggy and Victor must be online together, Victor generating fresh random challenges and Peggy responding. That is fine for two people, but a blockchain needs non-interactive proofs. Thousands of validators must verify the same proof, offline, at any time. The proof has to be a static artifact.</p>`,
        },
        { kind: "diagram", name: "fiat-shamir" },
        {
          kind: "prose",
          html: `<p>The <strong>Fiat-Shamir heuristic</strong> makes that possible with one move: replace Victor's random challenge with the output of a hash function. The challenge becomes SHA-256(commitment || public input). The prover computes it themselves, but cannot cheat, because they committed to the commitment R before hashing it, and SHA-256 is one-way, so they cannot pick R to steer the challenge. The verifier recomputes the same hash and checks the same equation. No interaction, no live verifier. The hash function plays Victor.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// you have been verifying ZK proofs all along",
          body: `Look at a Schnorr signature again with new eyes. Sign: pick random k, compute R = k·G, then e = SHA-256(R || public key || message), then s = k + e·d. Verify: s·G == R + e·Q. That is Fiat-Shamir applied to the proof "I know the private key d behind Q", revealing nothing about d. Every Schnorr signature you have ever verified was a non-interactive zero knowledge proof. You just did not know it had a name.`,
        },
        {
          kind: "prose",
          html: `<p><strong>Pedersen commitments</strong> are the other workhorse. A commitment to a value v is C = v·G + r·H, where G and H are public curve points and r is a secret random blinding factor. It is <strong>hiding</strong> (C reveals nothing about v, masked by r), <strong>binding</strong> (you cannot find a different v that gives the same C), and <strong>additively homomorphic</strong> (C(v1) + C(v2) = C(v1 + v2)). That last property is the magic: you can add commitments without opening them. Monero uses exactly this to prove that a transaction's input amounts sum to its output amounts, while every actual amount stays hidden.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustInter, label: "nizk.rs" },
            c: { language: "c", code: cInter, label: "nizk.c" },
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
      title: "zk-SNARKs, zk-STARKs, and **scaling blockchains**",
      blocks: [
        {
          kind: "prose",
          html: `<p>Schnorr proves one thing: "I know a secret." Real ZK systems prove far more: "I correctly ran this program on this input and got this output", without revealing the input. That needs a way to prove arbitrary computation.</p>
<p>The computation is turned into an arithmetic circuit of addition and multiplication gates over a finite field. Think of the gates from page four, but over field elements instead of single bits: AND becomes multiplication, XOR becomes addition mod 2. The prover demonstrates knowledge of inputs that satisfy every gate, without revealing them, by encoding the circuit as a polynomial, committing to it, and letting the verifier check a few random points. If the polynomial is right at random points, it is right everywhere with overwhelming probability.</p>`,
        },
        {
          kind: "grid",
          columns: 2,
          cards: [
            {
              label: "zk-SNARK",
              value: "tiny proof, trusted setup",
              desc: "Succinct Non-interactive ARgument of Knowledge. The proof is about 200 bytes and verifies in milliseconds no matter how big the computation. The cost: most SNARKs need a trusted setup ceremony, and anyone who keeps the toxic waste could forge proofs. Zcash ran a six-party ceremony where one honest participant is enough.",
            },
            {
              label: "zk-STARK",
              value: "no setup, quantum-safe",
              desc: "Scalable Transparent ARgument of Knowledge. No trusted setup and no toxic waste, with public randomness from a hash function, and it leans only on hashing so it is quantum resistant. The tradeoff is larger proofs, 50 to 100 KB versus a SNARK's 200 bytes. StarkNet and StarkEx use STARKs.",
            },
            {
              label: "PLONK",
              value: "universal setup",
              desc: "The most widely used SNARK construction today. One universal, updateable setup ceremony serves all circuits instead of one per application. Used by zkSync Era, Polygon zkEVM, Scroll and Aztec.",
            },
            {
              label: "RECURSION",
              value: "proofs of proofs",
              desc: "Recursive systems like Halo2 and Nova prove that another proof is valid, stacking proofs all the way down. The recursion page showed functions calling themselves; here a proof verifies a proof, and a single final proof can attest to an entire history.",
            },
          ],
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustAdv, label: "snark.rs" },
            c: { language: "c", code: cAdv, label: "snark.c" },
          },
        },
        { kind: "heading", text: "Zero knowledge in Bitcoin and its ecosystem" },
        {
          kind: "prose",
          html: `<p>Bitcoin does not use ZK proofs in its core consensus, not yet. But they are woven through the ecosystem around it, and they already run at scale next door on Ethereum.</p>`,
        },
        {
          kind: "grid",
          columns: 2,
          cards: [
            { label: "TAPROOT + MAST", value: "ZK-adjacent, live today", desc: "A coin can have many spending conditions stored in a Merkle tree. When you spend, you reveal only the one you used; the others stay private. You prove you satisfied one condition without revealing that the rest exist or what they are." },
            { label: "ZCASH", value: "fully private transactions", desc: "A Bitcoin fork where a shielded transaction hides sender, receiver and amount, yet is provably valid to every node. It uses a Groth16 zk-SNARK to prove the inputs exist and are unspent, inputs equal outputs, and the spender holds the keys. Proof ~200 bytes, verify ~3ms." },
            { label: "LIGHTNING + COVENANTS", value: "researched, not deployed", desc: "ZK routing could prove a Lightning payment was routed correctly without revealing the path. Proposed Bitcoin covenants could accept a ZK proof as a spending condition, enabling bridges, statechains and richer contracts. The tech is ready; Bitcoin consensus is conservative by design." },
            { label: "ZK ROLLUPS", value: "deployed at the largest scale", desc: "On Ethereum, zkSync, Polygon zkEVM, Scroll and StarkNet each process hundreds of thousands to millions of transactions a day, more than mainnet combined, by submitting one proof per batch." },
          ],
        },
        { kind: "diagram", name: "zk-rollup" },
        {
          kind: "callout",
          variant: "warn",
          title: "// mathematics is cheaper than trust",
          body: `A rollup collects 10,000 transactions, runs them off-chain, and submits one proof plus the new state root. Ethereum verifies it in roughly 200,000 gas, about the cost of ten plain transactions, even though the batch holds ten thousand. That is around a thousandfold compression, and the verifier never sees the transactions. This is the endgame for blockchain scaling: not sharding, not optimistic rollups, but zero knowledge proofs, because verifying a proof is cheaper than re-running the work or trusting someone who did.`,
        },
      ],
    },
  ],
  connections: {
    title: "Where zero knowledge appears in ScrapyBytes",
    introHtml: `<p>This page is the convergence point of the whole cryptography arc, and it reaches back across the entire curriculum.</p>`,
    items: [
      {
        slug: "digital-signatures",
        text: `A Schnorr signature is a zero knowledge proof: it proves knowledge of the private key without revealing it. The signatures page described the mechanism; this page names the framework it was always part of.`,
      },
      {
        slug: "hashing",
        text: `SHA-256 is everywhere in ZK: Fiat-Shamir uses it as the challenge, STARKs use it instead of elliptic curves, and commitments use it to commit. The hash deep dive page is the foundation of transparent ZK systems.`,
      },
      {
        slug: "big-o",
        text: `SNARK verification is O(1) in the circuit size: prove a million computations in 200 bytes, verify in milliseconds. The prover pays O(n), the verifier pays O(1), and that asymmetry is the entire value proposition.`,
      },
      {
        slug: "logic-gates",
        text: `ZK circuits are arithmetic circuits over a finite field: AND becomes multiplication, XOR becomes addition mod 2. The gate idea from page four generalises from single bits to field elements.`,
      },
      {
        slug: "public-key-cryptography",
        text: `SNARKs use elliptic curve pairings on pairing-friendly curves like BN254 and BLS12-381, built on the same point-multiplication foundation the public key page laid down.`,
      },
      {
        slug: "trees",
        text: `Merkle trees live inside ZK circuits: a ZK Merkle proof shows a value is in a tree without revealing which leaf or the path, exactly how Zcash handles note commitments. The trees page built the intuition; ZK makes it private.`,
      },
      {
        slug: "recursion",
        text: `Recursive SNARKs like Halo2 and Nova verify other SNARKs, proofs proving proofs all the way down. The recursion page showed functions calling themselves; this is the same idea with higher stakes.`,
      },
      {
        slug: "blockchain",
        text: `Zcash uses ZK for private transactions, rollups use it for 1000x scaling, Taproot uses ZK-adjacent Merkle conditions, and future covenants may use proofs as spending conditions. ZK is the future being built on the blockchain page's foundation.`,
      },
      {
        slug: "distributed-systems",
        text: `ZK proofs enable trustless bridges: prove state from chain A is valid on chain B with no committee or federation, just mathematics. The distributed systems page showed why trust is hard; ZK removes the need for it.`,
      },
      {
        slug: "binary",
        text: `Every ZK proof reduces to bits in the end. The circuit is arithmetic over a field, but the hardware underneath processes binary, the substrate the binary page described.`,
      },
      {
        slug: "sorting",
        text: `Circuits must be efficient: sorting inside a ZK circuit costs O(n log n) constraint gates, and every extra gate slows the prover. Circuit design is algorithm design where Big O matters inside the proof itself.`,
      },
      {
        slug: "networking",
        text: `A 200-byte proof travels to the verifiers over the network, where each one checks it independently. The networking page moved the packets; these may be the most computationally significant packets ever sent.`,
      },
    ],
  },
  closingHtml: `<div class="zk-closing">
<h3>Series 2: complete</h3>
<p>You started at a transistor. A single switch. On or off. 1 or 0.</p>
<p>You followed that switch through thirty-two pages. And you arrived here, at mathematics that lets you prove you know a secret without revealing a single bit of it. From transistors to zero knowledge proofs.</p>
<div class="zk-path">transistors → binary → logic gates → CPU → memory → OS → variables → pointers → compile vs runtime → arrays → linked lists → hashing → nodes → networking → distributed systems → CAP theorem → PACELC → blockchain → recursion → big O → sorting → searching → stacks and queues → trees → graphs → intro to cryptography → public key cryptography → digital signatures → hash functions deep dive → symmetric encryption → zero knowledge proofs</div>
<p>Every page earned the next one. Every concept built on the last. <strong>Nothing skipped. Nothing assumed. Nothing left unexplained.</strong></p>
<p>Series 3 is coming. Smart contracts. Ethereum. Proof of Stake. Consensus mechanisms. The engineering underneath the hype.</p>
</div>`,
  nextUp: {
    eyebrow: "series 3 . coming soon",
    title: "The engineering underneath blockchain: smart contracts, the EVM, and consensus mechanisms.",
    href: "#",
    label: "coming soon",
    variant: "magenta",
  },
};
