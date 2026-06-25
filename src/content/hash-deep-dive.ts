import type { PageContent } from "@/types/content";

/* ---------------------------------------------------------------------------
 * BEGINNER: compare the hash family and watch the avalanche. Rust uses the
 * sha2 and ripemd crates; C uses OpenSSL SHA256 / RIPEMD160.
 * ------------------------------------------------------------------------- */
const rustBeginner = `// Add to Cargo.toml: sha2 = "0.10", ripemd = "0.10"
use sha2::{Sha256, Sha512, Digest};
use ripemd::Ripemd160;

fn hash_comparison() {
    let data = b"the same input on twelve pages";

    // SHA-256: 32-byte output.
    let sha256_out = Sha256::digest(data);
    println!("SHA-256   ({} bytes): {:02x?}", sha256_out.len(), &sha256_out[..4]);

    // Double SHA-256: Bitcoin's standard.
    let double_sha256 = Sha256::digest(sha256_out);
    println!("SHA-256d  ({} bytes): {:02x?}", double_sha256.len(), &double_sha256[..4]);

    // RIPEMD-160 of the SHA-256: the Hash160 in a Bitcoin address.
    let hash160 = Ripemd160::digest(sha256_out);
    println!("Hash160   ({} bytes): {:02x?}", hash160.len(), &hash160[..4]);

    // SHA-512: 64-byte output, used in BIP-32 HMAC-SHA512.
    let sha512_out = Sha512::digest(data);
    println!("SHA-512   ({} bytes): {:02x?}", sha512_out.len(), &sha512_out[..4]);

    // One bit changed: a completely different output.
    let mut modified = *data;
    modified[0] ^= 1; // flip one bit
    let sha256_modified = Sha256::digest(modified);

    let diff = sha256_out.iter()
        .zip(sha256_modified.iter())
        .filter(|(a, b)| a != b)
        .count();
    println!("Bytes different after a 1-bit change: {}/32", diff);
    // Typically 15 to 17 of 32 bytes. The avalanche effect from
    // page 13, which the intermediate section explains mechanically.
}`;

const cBeginner = `/* Compile: gcc hash.c -o hash -lssl -lcrypto */
#include <openssl/sha.h>
#include <openssl/ripemd.h>
#include <stdio.h>
#include <string.h>

void hash_comparison(void) {
    const char *data = "the same input on twelve pages";
    size_t      len  = strlen(data);

    /* SHA-256: 32 bytes */
    uint8_t sha256_out[32];
    SHA256((const uint8_t*)data, len, sha256_out);
    printf("SHA-256  (32): %02x%02x%02x%02x...\\n",
           sha256_out[0], sha256_out[1], sha256_out[2], sha256_out[3]);

    /* Double SHA-256: Bitcoin standard */
    uint8_t double_sha[32];
    SHA256(sha256_out, 32, double_sha);
    printf("SHA-256d (32): %02x%02x%02x%02x...\\n",
           double_sha[0], double_sha[1], double_sha[2], double_sha[3]);

    /* Hash160: SHA-256 then RIPEMD-160 */
    uint8_t hash160[20];
    RIPEMD160(sha256_out, 32, hash160);
    printf("Hash160  (20): %02x%02x%02x%02x...\\n",
           hash160[0], hash160[1], hash160[2], hash160[3]);

    /* One bit changed: avalanche */
    char modified[64];
    memcpy(modified, data, len);
    modified[0] ^= 1; /* flip one bit */

    uint8_t sha256_mod[32];
    SHA256((const uint8_t*)modified, len, sha256_mod);

    int diff = 0;
    for (int i = 0; i < 32; i++)
        if (sha256_out[i] != sha256_mod[i]) diff++;
    printf("Bytes different after a 1-bit change: %d/32\\n", diff);
    /* Typically 15 to 17. Explained mechanically below. */
}`;

/* ---------------------------------------------------------------------------
 * INTERMEDIATE: the complete SHA-256 from scratch. Six primitives only.
 * Both pass the test vector SHA-256("abc") = ba7816bf...15ad.
 * ------------------------------------------------------------------------- */
const rustInter = `// SHA-256 from scratch. Every step uses only six primitives:
// ROTR, SHR, AND, XOR, NOT, ADD mod 2^32. This is the algorithm.

const K: [u32; 64] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5,
    0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc,
    0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7,
    0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3,
    0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5,
    0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

const H0: [u32; 8] = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
];

fn ch(e: u32, f: u32, g: u32)  -> u32 { (e & f) ^ (!e & g) }
fn maj(a: u32, b: u32, c: u32) -> u32 { (a & b) ^ (a & c) ^ (b & c) }
fn s0(x: u32) -> u32 { x.rotate_right(2)  ^ x.rotate_right(13) ^ x.rotate_right(22) }
fn s1(x: u32) -> u32 { x.rotate_right(6)  ^ x.rotate_right(11) ^ x.rotate_right(25) }
fn g0(x: u32) -> u32 { x.rotate_right(7)  ^ x.rotate_right(18) ^ (x >> 3)  }
fn g1(x: u32) -> u32 { x.rotate_right(17) ^ x.rotate_right(19) ^ (x >> 10) }

pub fn sha256(msg: &[u8]) -> [u8; 32] {
    // Step 1: padding. Append 0x80, then zeros, then the
    // 64-bit big-endian bit length, to a 512-bit boundary.
    let mut padded = msg.to_vec();
    let bit_len = (msg.len() as u64) * 8;
    padded.push(0x80);
    while padded.len() % 64 != 56 { padded.push(0); }
    padded.extend_from_slice(&bit_len.to_be_bytes());

    let mut hash = H0;

    // Step 2: process each 512-bit chunk.
    for chunk in padded.chunks(64) {
        let mut w = [0u32; 64];
        for i in 0..16 {
            w[i] = u32::from_be_bytes(chunk[i*4..i*4+4].try_into().unwrap());
        }
        for i in 16..64 {
            w[i] = g1(w[i-2]).wrapping_add(w[i-7])
                 .wrapping_add(g0(w[i-15])).wrapping_add(w[i-16]);
        }

        let [mut a, mut b, mut c, mut d, mut e, mut f, mut g, mut h] = hash;
        for i in 0..64 {
            let t1 = h.wrapping_add(s1(e)).wrapping_add(ch(e, f, g))
                      .wrapping_add(K[i]).wrapping_add(w[i]);
            let t2 = s0(a).wrapping_add(maj(a, b, c));
            h = g; g = f; f = e; e = d.wrapping_add(t1);
            d = c; c = b; b = a; a = t1.wrapping_add(t2);
        }

        hash[0] = hash[0].wrapping_add(a);
        hash[1] = hash[1].wrapping_add(b);
        hash[2] = hash[2].wrapping_add(c);
        hash[3] = hash[3].wrapping_add(d);
        hash[4] = hash[4].wrapping_add(e);
        hash[5] = hash[5].wrapping_add(f);
        hash[6] = hash[6].wrapping_add(g);
        hash[7] = hash[7].wrapping_add(h);
    }

    let mut out = [0u8; 32];
    for (i, word) in hash.iter().enumerate() {
        out[i*4..i*4+4].copy_from_slice(&word.to_be_bytes());
    }
    out
}

#[test]
fn test_sha256_abc() {
    let expected = [
        0xba,0x78,0x16,0xbf, 0x8f,0x01,0xcf,0xea,
        0x41,0x41,0x40,0xde, 0x5d,0xae,0x22,0x23,
        0xb0,0x03,0x61,0xa3, 0x96,0x17,0x7a,0x9c,
        0xb4,0x10,0xff,0x61, 0xf2,0x00,0x15,0xad,
    ];
    assert_eq!(sha256(b"abc"), expected); // passes
}`;

const cInter = `/* SHA-256 from scratch in C. Six operations only:
 * ROTR, SHR, AND, XOR, NOT, ADD32. Passes SHA-256("abc"). */
#include <stdint.h>
#include <string.h>
#include <stdlib.h>

static const uint32_t K[64] = {
    0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,
    0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
    0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,
    0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
    0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,
    0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
    0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,
    0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
    0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,
    0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
    0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,
    0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
    0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,
    0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
    0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,
    0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
};
static const uint32_t H0[8] = {
    0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,
    0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19,
};

#define ROTR(x,n) (((x)>>(n))|((x)<<(32-(n))))
#define SHR(x,n)  ((x)>>(n))
#define CH(e,f,g)  (((e)&(f))^(~(e)&(g)))
#define MAJ(a,b,c) (((a)&(b))^((a)&(c))^((b)&(c)))
#define S0(a) (ROTR(a,2)^ROTR(a,13)^ROTR(a,22))
#define S1(e) (ROTR(e,6)^ROTR(e,11)^ROTR(e,25))
#define G0(x) (ROTR(x,7)^ROTR(x,18)^SHR(x,3))
#define G1(x) (ROTR(x,17)^ROTR(x,19)^SHR(x,10))

static uint32_t be32(const uint8_t *b) {
    return ((uint32_t)b[0]<<24)|((uint32_t)b[1]<<16)
          |((uint32_t)b[2]<< 8)|((uint32_t)b[3]);
}

void sha256(const uint8_t *msg, size_t len, uint8_t out[32]) {
    /* padding */
    size_t padded_len = len + 1;
    while (padded_len % 64 != 56) padded_len++;
    padded_len += 8;

    uint8_t *padded = calloc(padded_len, 1);
    memcpy(padded, msg, len);
    padded[len] = 0x80;
    uint64_t bit_len = (uint64_t)len * 8;
    for (int i = 0; i < 8; i++)
        padded[padded_len-8+i] = (bit_len >> (56-8*i)) & 0xFF;

    uint32_t hash[8];
    memcpy(hash, H0, sizeof hash);

    for (size_t off = 0; off < padded_len; off += 64) {
        uint32_t w[64];
        for (int i=0;i<16;i++) w[i] = be32(padded+off+i*4);
        for (int i=16;i<64;i++)
            w[i] = G1(w[i-2]) + w[i-7] + G0(w[i-15]) + w[i-16];

        uint32_t a=hash[0],b=hash[1],c=hash[2],d=hash[3],
                 e=hash[4],f=hash[5],g=hash[6],h=hash[7];

        for (int i=0;i<64;i++) {
            uint32_t t1 = h + S1(e) + CH(e,f,g) + K[i] + w[i];
            uint32_t t2 = S0(a) + MAJ(a,b,c);
            h=g; g=f; f=e; e=d+t1;
            d=c; c=b; b=a; a=t1+t2;
        }

        hash[0]+=a; hash[1]+=b; hash[2]+=c; hash[3]+=d;
        hash[4]+=e; hash[5]+=f; hash[6]+=g; hash[7]+=h;
    }

    for (int i=0;i<8;i++) {
        out[i*4]   = hash[i]>>24;
        out[i*4+1] = hash[i]>>16;
        out[i*4+2] = hash[i]>>8;
        out[i*4+3] = hash[i];
    }
    free(padded);
}
/* sha256("abc") = ba7816bf8f01cfea414140de5dae2223...
 * If you get that, the implementation is correct. */`;

/* ---------------------------------------------------------------------------
 * ADVANCED: HMAC, BIP-32 key derivation, and slow password hashing. Rust uses
 * the hmac and argon2 crates; C uses OpenSSL HMAC with EVP_sha256/512.
 * ------------------------------------------------------------------------- */
const rustAdv = `// Add to Cargo.toml: hmac = "0.12", sha2 = "0.10", argon2 = "0.5"
use sha2::Sha256;
use hmac::{Hmac, Mac};

type HmacSha256 = Hmac<Sha256>;

fn hmac_demo() {
    let key     = b"bitcoin_secret_key_do_not_share";
    let message = b"amount=100&to=Alice";

    // HMAC-SHA256: immune to length extension, unlike raw SHA-256.
    let mut mac = HmacSha256::new_from_slice(key).unwrap();
    mac.update(message);
    let tag = mac.finalize().into_bytes();
    println!("HMAC-SHA256: {:02x?}", &tag[..8]);

    // Verify with a constant-time comparison (no timing leak).
    let mut mac2 = HmacSha256::new_from_slice(key).unwrap();
    mac2.update(message);
    mac2.verify_slice(&tag).expect("valid");
    println!("HMAC verification: passed");
    // Bitcoin BIP-32 uses HMAC-SHA512 the same way:
    // left 32 bytes = master key, right 32 = chain code.
}

// Password hashing with Argon2: deliberately slow and memory-hard.
fn password_hashing_demo() {
    use argon2::{
        password_hash::{
            rand_core::OsRng, PasswordHash, PasswordHasher,
            PasswordVerifier, SaltString,
        },
        Argon2,
    };

    let password = b"my_bitcoin_wallet_passphrase";

    // A random salt stops precomputed rainbow tables and gives
    // two identical passwords two different hashes.
    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    // ~100ms per attempt by design. A GPU does 10^9 SHA-256/sec;
    // Argon2's memory-hardness drops that to a handful per second.
    let hash = argon2.hash_password(password, &salt).unwrap().to_string();
    println!("Argon2: {}...", &hash[..30]);

    let parsed = PasswordHash::new(&hash).unwrap();
    let ok = argon2.verify_password(password, &parsed).is_ok();
    println!("Verified: {}", ok);
}`;

const cAdv = `/* Compile: gcc hmac.c -o hmac -lssl -lcrypto */
#include <openssl/hmac.h>
#include <openssl/evp.h>
#include <openssl/sha.h>
#include <string.h>
#include <stdio.h>

/* HMAC-SHA256 in C. Used in Bitcoin BIP-32, TLS, JWT, API auth. */
void hmac_demo(void) {
    const char *key = "bitcoin_secret_key_do_not_share";
    const char *msg = "amount=100&to=Alice";

    uint8_t  tag[32];
    unsigned tag_len = sizeof tag;
    HMAC(EVP_sha256(), key, (int)strlen(key),
         (const uint8_t*)msg, strlen(msg), tag, &tag_len);
    printf("HMAC-SHA256: ");
    for (int i = 0; i < 8; i++) printf("%02x", tag[i]);
    printf("...\\n");

    /* BIP-32 master key derivation uses HMAC-SHA512:
     * left 32 bytes = master private key,
     * right 32 bytes = master chain code. */
    uint8_t  out[64];
    unsigned out_len = sizeof out;
    const uint8_t seed[16] = {0}; /* test seed */
    HMAC(EVP_sha512(), "Bitcoin seed", 12,
         seed, sizeof seed, out, &out_len);
    printf("BIP-32 master key:  ");
    for (int i = 0; i < 8; i++) printf("%02x", out[i]);
    printf("...\\n");
    printf("BIP-32 chain code:  ");
    for (int i = 32; i < 40; i++) printf("%02x", out[i]);
    printf("...\\n");
}

/* Why HMAC exists: raw SHA-256(secret || msg) is vulnerable
 * to length extension. An attacker who knows the hash and the
 * length of secret can compute SHA-256(secret || msg || extra)
 * without the secret, because SHA-256's output IS its internal
 * state. HMAC nests two hashes, so the published tag is not a
 * resumable state. Never use raw SHA-256 as a MAC. */`;

export const hashDeepDive: PageContent = {
  slug: "hash-deep-dive",
  hexLabel: "0x1E",
  category: "cryptography",
  hero: {
    eyebrow: "root.system / 0x1E / hash-deep-dive",
    title: `You have used SHA-256 on twelve pages.<br><span class="highlight">Here is what it actually does.</span>`,
    lede: `The hashing page explained what SHA-256 is: one-way, fixed output, avalanche effect. This page explains how. 64 rounds, 8 state words, 64 constants. XOR gates and bit rotations running billions of times per second on every Bitcoin miner on Earth. You already know every operation involved. You learned them on page two and page four. This page shows you how they combine.`,
    narrativeHtml: `<p>Page thirteen introduced SHA-256. You learned it was one-way, that it had an avalanche effect, that it secured Bitcoin.</p>
<p>Then you used it. On page fourteen. And fifteen. And sixteen. And nineteen. And twenty-eight. And twenty-nine. Twelve pages, always a black box. hash(data) goes in, a 256-bit fingerprint comes out, trust us.</p>
<p>Today you open the box. Inside you will find something surprising.</p>
<p>No multiplication. No division. No floating point. No complex mathematics. Just this: XOR, AND, NOT, bit rotation, bit shift, and modular addition. The same six operations from page two and page four, applied 64 times to eight 32-bit words.</p>
<p>That is SHA-256. Not magic, not complexity. Structure: deliberate, precise, analysed structure, applied to simple operations until the output becomes unpredictable.</p>
<p>You already understand every single primitive this algorithm uses. You just have never seen them arranged this way before.</p>`,
  },
  levels: [
    /* =================================================================
       LEVEL 01 . BEGINNER
       ================================================================= */
    {
      level: "beginner",
      number: "01",
      title: "The SHA-256 family and why it **exists**",
      blocks: [
        {
          kind: "prose",
          html: `<p>SHA stands for Secure Hash Algorithm. SHA-256 is the 256-bit member of the SHA-2 family, designed by the NSA and published in 2001. Not because older hashes were slow. Because older hashes were broken.</p>`,
        },
        { kind: "diagram", name: "hash-timeline" },
        {
          kind: "prose",
          html: `<p>MD5 (1991) produced 128 bits and was fully collision-broken by 2004: two different files, one hash. SHA-1 (1995) produced 160 bits and fell in 2017, when Google published two different PDFs with identical SHA-1 hashes (the SHAttered attack). SHA-2 (2001) has resisted every attack for over twenty years, and it is what Bitcoin uses. SHA-3 (2015) is a completely different design, the Keccak sponge; Ethereum uses Keccak-256, which is close to but not identical to the final NIST SHA-3.</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "SHA-256 (double)",
              value: "Bitcoin's workhorse",
              desc: "Proof of work, transaction IDs and Merkle trees all use double SHA-256. The double hash defeats length extension: knowing SHA-256(x) lets you extend it, but SHA-256(SHA-256(x)) does not. So Bitcoin double-hashes everywhere.",
            },
            {
              label: "RIPEMD-160",
              value: "only for addresses",
              desc: "Hash160(pubkey) = RIPEMD-160(SHA-256(pubkey)), a 20-byte output for shorter addresses. A different algorithm, so if SHA-256 is ever broken, RIPEMD-160 is a second independent layer. Defense in depth.",
            },
            {
              label: "Keccak-256",
              value: "Ethereum, not Bitcoin",
              desc: "Ethereum uses Keccak-256, the original competition submission, which NIST tweaked before publishing SHA-3. They look alike but are not the same, a classic source of interoperability bugs. Always check which variant your library ships.",
            },
          ],
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBeginner, label: "compare.rs" },
            c: { language: "c", code: cBeginner, label: "compare.c" },
          },
        },
        { kind: "widget", name: "sha256-explorer" },
      ],
    },
    /* =================================================================
       LEVEL 02 . INTERMEDIATE
       ================================================================= */
    {
      level: "intermediate",
      number: "02",
      title: "Inside SHA-256: the **round function**",
      blocks: [
        {
          kind: "prose",
          html: `<p>SHA-256 processes data in 512-bit chunks. Each chunk runs 64 rounds over 8 state words, and the output is those 8 words concatenated. Four steps get us there.</p>
<p><strong>Padding.</strong> Append a single 1 bit, then zeros, then the original message length as a 64-bit big-endian integer, landing on a 512-bit boundary. This guarantees that different-length messages produce different padded inputs.</p>
<p><strong>Initial values H0..H7.</strong> Eight fixed 32-bit words, the fractional parts of the square roots of the first eight primes. <strong>Round constants K0..K63.</strong> Sixty-four words, the fractional parts of the cube roots of the first 64 primes. These are "nothing up my sleeve" numbers: derived from public constants, verifiable by anyone, with nowhere to hide a backdoor.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// H0..H7: fractional parts of square roots of 2, 3, 5, 7, 11, 13, 17, 19",
          body: `0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19. Take the square root of 2, keep the fractional part, express it as a 32-bit fixed-point number, and you get 0x6a09e667. Nothing is chosen in secret, which is exactly why the world trusts these constants.`,
        },
        {
          kind: "prose",
          html: `<p><strong>Message schedule W0..W63.</strong> The 512-bit chunk is read as 16 words W0..W15. The other 48 are computed by mixing earlier words: for i from 16 to 63, W[i] = W[i-16] + g0(W[i-15]) + W[i-7] + g1(W[i-2]) mod 2^32, where g0 and g1 are combinations of rotate-right and shift-right. Then the 64 rounds run over the 8 working variables a..h, initialised from H0..H7.</p>`,
        },
        { kind: "diagram", name: "sha256-round" },
        {
          kind: "prose",
          html: `<p>Every round is built from exactly six operations, all of which you already know.</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            { label: "ROTR", value: "rotate right", desc: "Bits move right and the ones that fall off the right reappear on the left. ROTR2 of 01101011 is 11011010. From page two." },
            { label: "SHR", value: "shift right", desc: "Bits move right and the left fills with zeros. The bits that fall off are gone. SHR3 of 01101011 is 00001101. From page two." },
            { label: "XOR", value: "differ", desc: "1 only where the two bits differ. The single most-used operation in the algorithm. From page four." },
            { label: "AND", value: "both", desc: "1 only where both bits are 1. Used inside the ch and maj functions every round. From page four." },
            { label: "NOT", value: "flip", desc: "Flip every bit. Appears in ch as NOT e AND g. From page four." },
            { label: "ADD mod 2^32", value: "wrapping add", desc: "Ordinary 32-bit integer addition that wraps at 2^32. The same wrap your CPU already does on every u32 add." },
          ],
        },
        {
          kind: "prose",
          html: `<p><strong>Why the avalanche happens.</strong> The ch function, (e AND f) XOR (NOT e AND g), is a per-bit selector: where a bit of e is 1 it takes that bit from f, where e is 0 it takes it from g. Flip one bit of e and you re-route which of f or g feeds the output at every affected position. That flows through S1 into temp1, temp1 becomes the next a, and a feeds back into the round. By round five or six the change has diffused into all eight working variables; by round 64 the output is unrecognisable. The avalanche effect from page 13 is not magic. It is carefully designed bit mixing.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustInter, label: "sha256.rs" },
            c: { language: "c", code: cInter, label: "sha256.c" },
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
      title: "HMAC, length extension, and **password hashing**",
      blocks: [
        {
          kind: "prose",
          html: `<p>SHA-256 has a subtle property. Bitcoin's double hashing avoids it, but it is essential to understand. Given SHA-256(secret || message), an attacker who knows only the output and the length of secret can compute SHA-256(secret || message || extra) without ever knowing secret. The reason: SHA-256's internal state after processing is exactly the output hash, so knowing the hash lets you resume the compression function with more data.</p>
<p>This is the <strong>length extension attack</strong>. A server that authenticates with token = SHA-256(secret_key || "amount=100") can have a valid token forged for "amount=100" plus padding plus "&amount=9999999". It is a real attack, used against Flickr's API in 2009 and several naive MAC schemes since.</p>`,
        },
        { kind: "diagram", name: "hmac-nesting" },
        {
          kind: "prose",
          html: `<p>The fix is <strong>HMAC</strong>: HMAC(key, message) = SHA-256((key XOR opad) || SHA-256((key XOR ipad) || message)). Two nested SHA-256 calls with XORed key pads. The outer hash wraps the inner one, so the published tag is not a resumable internal state, and length extension fails. HMAC is everywhere: Bitcoin BIP-32 uses HMAC-SHA512 for key derivation, TLS uses HMAC to authenticate records, and JWT tokens use HMAC-SHA256.</p>`,
        },
        { kind: "heading", text: "Why SHA-256 is wrong for passwords" },
        {
          kind: "prose",
          html: `<p>SHA-256 is designed to be fast, and a modern GPU computes around 10 billion SHA-256 hashes per second. Point that at a leaked password hash and it tries 10 billion guesses per second. Password hashing needs the opposite: it needs to be slow, deliberately, by design.</p>`,
        },
        {
          kind: "grid",
          columns: 3,
          cards: [
            { label: "BCRYPT (1999)", value: "tunable cost", desc: "Built to be expensive, with a cost factor that sets how many rounds run. Higher cost means slower means harder to crack. Still widely used, limited to 72-byte passwords." },
            { label: "ARGON2 (2015)", value: "memory-hard", desc: "Winner of the Password Hashing Competition. Requires large amounts of RAM as well as CPU, and a GPU has far less RAM per core, so memory-hardness makes GPU cracking impractical. Recommended for new systems." },
            { label: "SCRYPT", value: "also memory-hard", desc: "Memory-hard like Argon2, and used by Litecoin for proof of work to resist ASIC mining at launch. Now standard in most crypto libraries." },
          ],
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustAdv, label: "hmac.rs" },
            c: { language: "c", code: cAdv, label: "hmac.c" },
          },
        },
        { kind: "heading", text: "SHA-256 inside Bitcoin: the complete map" },
        {
          kind: "prose",
          html: `<p>Every Bitcoin operation touches SHA-256, and now you know exactly what happens inside each one.</p>`,
        },
        {
          kind: "grid",
          columns: 2,
          cards: [
            { label: "TRANSACTION IDs", value: "double SHA-256", desc: "txid = SHA-256(SHA-256(raw_tx)). The 32-byte value you see in every block explorer, double-hashed to block length extension." },
            { label: "MERKLE ROOT", value: "double SHA-256, recursively", desc: "Each level hashes SHA-256(SHA-256(left || right)). A tree of 4096 transactions is 12 levels of double hashing, compressed into one 32-byte root in the header." },
            { label: "PROOF OF WORK", value: "double SHA-256 of the header", desc: "block_hash = SHA-256(SHA-256(80-byte header)), repeated until it falls below target. The network runs on the order of 500 exahashes per second, every second." },
            { label: "BIP-32 + ADDRESS", value: "HMAC-SHA512, then SHA-256 + RIPEMD-160", desc: "Key derivation is HMAC-SHA512; addresses are SHA-256 then RIPEMD-160 then Base58Check. Two different hash families, so both must break to compromise an address." },
          ],
        },
        {
          kind: "callout",
          variant: "warn",
          title: "// 128 rounds of six operations, 500 exahashes per second",
          body: `Each double-SHA-256 is 128 rounds of the algorithm above, every round just ROTR, SHR, AND, XOR, NOT and wrapping add on eight 32-bit words. Multiply that by roughly 500 times 10^18 per second across every miner on Earth, and that is proof of work. All of it built from the XOR gates and bit rotations you learned on page two and page four. Remove SHA-256 and Bitcoin does not exist.`,
        },
      ],
    },
  ],
  connections: {
    title: "Where hash functions touch ScrapyBytes",
    introHtml: `<p>SHA-256 is the most-reused primitive in the whole curriculum, and it is built entirely from things you already learned. Here is where it connects.</p>`,
    items: [
      {
        slug: "hashing",
        text: `Page 13 introduced SHA-256; this page explains it. The avalanche effect named there is the ch and maj functions diffusing a one-bit change through all eight state words by round six. Together the two pages are one complete account.`,
      },
      {
        slug: "logic-gates",
        text: `XOR is the most-used gate in SHA-256, with AND and NOT in ch and maj every round. The round function is logic gates arranged deliberately to make the output unpredictable. Page four is the hardware behind this page.`,
      },
      {
        slug: "binary",
        text: `SHA-256 runs entirely on 32-bit words: every ROTR, SHR, XOR and AND is binary, the constants are binary, the output is 256 bits. The binary page taught every operation the algorithm uses.`,
      },
      {
        slug: "cpu",
        text: `Modern CPUs have SHA-NI instructions, and SHA256RNDS2 does two rounds per cycle. A Bitcoin ASIC is a CPU with only SHA-256 logic and nothing else. The fetch-decode-execute from the CPU page is what every miner runs.`,
      },
      {
        slug: "memory",
        text: `The eight state words fit in eight registers, so SHA-256 runs entirely in register memory: no cache pressure, no heap. That is why it was designed with exactly eight 32-bit words.`,
      },
      {
        slug: "arrays",
        text: `The message schedule W[0..63], the constants K[0..63], and the 8-word state are all arrays of 32-bit words. SHA-256 is array operations at every step.`,
      },
      {
        slug: "digital-signatures",
        text: `ECDSA signs SHA-256(SHA-256(transaction)), never the data itself. If SHA-256 were breakable you could find two transactions with one hash, sign one and spend the other. Every signature's security rests on its collision resistance.`,
      },
      {
        slug: "public-key-cryptography",
        text: `Bitcoin addresses are SHA-256 then RIPEMD-160 of the public key, and HD wallet keys use HMAC-SHA512. The public key page used these functions; this page is their internals.`,
      },
      {
        slug: "recursion",
        text: `A long message is hashed one 512-bit chunk at a time, each chunk's output state feeding the next. Merkle trees apply SHA-256 recursively across transaction hashes, and HMAC nests it twice.`,
      },
      {
        slug: "networking",
        text: `Every TLS session uses HMAC-SHA256 to authenticate each record. The networking page moved the packets; HMAC is what proves they were not tampered with in transit.`,
      },
      {
        slug: "blockchain",
        text: `Transaction IDs, Merkle roots and proof of work are double SHA-256; key derivation is HMAC-SHA512; addresses add RIPEMD-160. Remove SHA-256 and the blockchain page's entire system collapses.`,
      },
      {
        slug: "sorting",
        text: `Miners sort transactions by fee rate, then commit that order into the Merkle root they hash into the header. Change the order and the root changes. Sorting and hashing are inseparable in block construction.`,
      },
    ],
  },
  nextUp: {
    eyebrow: "next up / 0x1F",
    title: "Ten rounds of XOR with structure: symmetric encryption and AES.",
    href: "/aes",
    label: "symmetric encryption and AES",
    variant: "magenta",
  },
};
