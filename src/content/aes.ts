import type { PageContent } from "@/types/content";

/* ---------------------------------------------------------------------------
 * BEGINNER: AES-256-CTR, a stream mode with no padding. Rust uses the aes/ctr
 * crates; C uses the OpenSSL EVP interface.
 * ------------------------------------------------------------------------- */
const rustBeginner = `// Add to Cargo.toml:
//   aes = "0.8"
//   ctr = "0.9"
//   cipher = { version = "0.4", features = ["block-padding"] }
use aes::Aes256;
use ctr::Ctr128BE;
use cipher::{KeyIvInit, StreamCipher};

fn aes_ctr_demo() {
    // AES-256-CTR: stream mode, no padding, any length.
    let key   = [0x42u8; 32]; // 32 bytes = AES-256
    let nonce = [0x00u8; 16]; // 16-byte nonce
    // NEVER reuse the same key and nonce pair. Reuse is
    // catastrophic: XORing two ciphertexts under the same
    // keystream cancels the encryption. The same root mistake
    // as nonce reuse in ECDSA. Different algorithm, same bug.

    let mut buf = b"Send 1 BTC to Alice".to_vec();
    println!("Plaintext:  {:?}", String::from_utf8_lossy(&buf));

    // Encrypt in place.
    let mut cipher = Ctr128BE::<Aes256>::new(key.as_slice().into(), nonce.as_slice().into());
    cipher.apply_keystream(&mut buf);
    println!("Ciphertext: {:02x?}", &buf[..8]);

    // Decrypt: apply the same keystream again. CTR is self-inverse.
    let mut cipher2 = Ctr128BE::<Aes256>::new(key.as_slice().into(), nonce.as_slice().into());
    cipher2.apply_keystream(&mut buf);
    println!("Decrypted:  {:?}", String::from_utf8_lossy(&buf));
    // XOR twice with the same keystream returns the original.
    // That self-inverse property comes straight from page two.
}`;

const cBeginner = `/* AES-256-CTR with OpenSSL.
 * Compile: gcc ctr.c -o ctr -lssl -lcrypto */
#include <openssl/evp.h>
#include <string.h>
#include <stdio.h>

void aes_ctr_demo(void) {
    const char    *plaintext = "Send 1 BTC to Alice";
    size_t         plen = strlen(plaintext);
    unsigned char  key[32]; /* AES-256: 32 bytes */
    unsigned char  iv[16];  /* CTR nonce: 16 bytes */
    unsigned char  ciphertext[64], decrypted[64];
    int            len = 0, total = 0;

    /* In production, derive key and IV from ECDH + HKDF. */
    memset(key, 0x42, sizeof key);
    memset(iv,  0x00, sizeof iv);

    /* Encrypt */
    EVP_CIPHER_CTX *ctx = EVP_CIPHER_CTX_new();
    EVP_EncryptInit_ex(ctx, EVP_aes_256_ctr(), NULL, key, iv);
    EVP_EncryptUpdate(ctx, ciphertext, &len,
                      (const unsigned char*)plaintext, plen);
    total = len;
    EVP_EncryptFinal_ex(ctx, ciphertext + len, &len);
    total += len;
    EVP_CIPHER_CTX_free(ctx);

    printf("Ciphertext (first 8): ");
    for (int i = 0; i < 8; i++) printf("%02x ", ciphertext[i]);
    printf("\\n");

    /* Decrypt: same key and IV */
    ctx = EVP_CIPHER_CTX_new();
    EVP_DecryptInit_ex(ctx, EVP_aes_256_ctr(), NULL, key, iv);
    EVP_DecryptUpdate(ctx, decrypted, &len, ciphertext, total);
    EVP_DecryptFinal_ex(ctx, decrypted + len, &len);
    EVP_CIPHER_CTX_free(ctx);

    decrypted[plen] = 0;
    printf("Decrypted: %s\\n", decrypted);
    /* CTR: encryption equals decryption. Same keystream,
     * XOR with the data. The self-inverse XOR of page two. */
}`;

/* ---------------------------------------------------------------------------
 * INTERMEDIATE: block-level AES and the full S-box. Rust uses the aes crate;
 * C uses the OpenSSL low-level AES interface. Both carry the FIPS-197 vector.
 * ------------------------------------------------------------------------- */
const rustInter = `use aes::Aes128;
use aes::cipher::{BlockEncrypt, BlockDecrypt, KeyInit};
use aes::cipher::generic_array::GenericArray;

fn aes_block_level() {
    // AES works on exactly one 16-byte block. Modes and
    // padding are built on top of this single operation.
    let key = GenericArray::from([
        0x2bu8,0x7e,0x15,0x16, 0x28,0xae,0xd2,0xa6,
        0xab,0xf7,0x15,0x88,   0x09,0xcf,0x4f,0x3c,
    ]);
    let mut block = GenericArray::from([
        0x32u8,0x43,0xf6,0xa8, 0x88,0x5a,0x30,0x8d,
        0x31,0x31,0x98,0xa2,   0xe0,0x37,0x07,0x34,
    ]);

    let cipher = Aes128::new(&key);
    let original = block;

    // 10 rounds of SubBytes, ShiftRows, MixColumns, AddRoundKey.
    cipher.encrypt_block(&mut block);
    // FIPS-197 known answer:
    // 39 25 84 1d 02 dc 09 fb dc 11 85 97 19 6a 0b 32
    println!("Encrypted: {:02x?}", block.as_slice());

    cipher.decrypt_block(&mut block);
    assert_eq!(block, original);
    println!("Round-trip: OK");
}

// The full AES S-box: a fixed non-linear permutation, the
// GF(2^8) inverse followed by an affine map. This is the
// source of AES's confusion property. SubBytes is one lookup
// per byte, 16 per round.
const SBOX: [u8; 256] = [
    0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
    0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
    0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
    0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
    0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
    0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
    0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
    0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
    0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
    0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
    0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
    0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
    0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
    0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
    0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
    0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16,
];

fn sub_bytes(state: &mut [u8; 16]) {
    for byte in state.iter_mut() {
        *byte = SBOX[*byte as usize];
    }
}`;

const cInter = `/* Block-level AES in C with OpenSSL, plus the full S-box.
 * Compile: gcc aes.c -o aes -lssl -lcrypto */
#include <openssl/aes.h>
#include <stdint.h>
#include <string.h>
#include <stdio.h>

void aes_block_level(void) {
    /* FIPS-197 test vector for AES-128 */
    const uint8_t key[16] = {
        0x2b,0x7e,0x15,0x16,0x28,0xae,0xd2,0xa6,
        0xab,0xf7,0x15,0x88,0x09,0xcf,0x4f,0x3c,
    };
    uint8_t input[16] = {
        0x32,0x43,0xf6,0xa8,0x88,0x5a,0x30,0x8d,
        0x31,0x31,0x98,0xa2,0xe0,0x37,0x07,0x34,
    };
    uint8_t output[16], recovered[16];

    AES_KEY enc;
    AES_set_encrypt_key(key, 128, &enc);
    AES_encrypt(input, output, &enc);
    /* Expected: 39 25 84 1d 02 dc 09 fb dc 11 85 97 19 6a 0b 32 */
    printf("Encrypted: ");
    for (int i = 0; i < 16; i++) printf("%02x ", output[i]);
    printf("\\n");

    AES_KEY dec;
    AES_set_decrypt_key(key, 128, &dec);
    AES_decrypt(output, recovered, &dec);
    printf("Round-trip: %s\\n",
           memcmp(input, recovered, 16) == 0 ? "OK" : "FAIL");
}

/* The full AES S-box: GF(2^8) inverse then an affine map.
 * A fixed one-to-one permutation. SubBytes is one lookup per byte. */
static const uint8_t SBOX[256] = {
    0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
    0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
    0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
    0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
    0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
    0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
    0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
    0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
    0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
    0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
    0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
    0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
    0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
    0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
    0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
    0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16,
};

void sub_bytes(uint8_t state[16]) {
    for (int i = 0; i < 16; i++) state[i] = SBOX[state[i]];
}`;

/* ---------------------------------------------------------------------------
 * ADVANCED: AES-256-GCM authenticated encryption. Rust uses the aes-gcm crate
 * with safe nonce generation; C uses OpenSSL EVP with explicit tag handling.
 * ------------------------------------------------------------------------- */
const rustAdv = `// Add to Cargo.toml: aes-gcm = "0.10"
use aes_gcm::{
    aead::{Aead, AeadCore, KeyInit, OsRng},
    Aes256Gcm,
};

fn aes_gcm_demo() {
    // AES-256-GCM: confidentiality + integrity + authenticity.
    // What TLS 1.3 and Signal use for every message.
    let key = Aes256Gcm::generate_key(OsRng);
    let cipher = Aes256Gcm::new(&key);

    // 96-bit nonce, unique per key. Generated safely here.
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng);
    let plaintext = b"Send 1 BTC to Alice";

    // Encrypt: ciphertext carries a 16-byte authentication tag.
    let ciphertext = cipher.encrypt(&nonce, plaintext.as_ref())
        .expect("encryption failed");
    println!("Ciphertext: {} bytes", ciphertext.len()); // plaintext + 16

    // Decrypt: the tag is verified first. No partial output.
    let decrypted = cipher.decrypt(&nonce, ciphertext.as_ref())
        .expect("decryption failed");
    println!("Decrypted: {:?}", String::from_utf8_lossy(&decrypted));

    // Tamper with one byte and decryption is rejected outright.
    let mut tampered = ciphertext.clone();
    tampered[0] ^= 1;
    let result = cipher.decrypt(&nonce, tampered.as_ref());
    println!("Tampered: {}", if result.is_err() { "REJECTED" } else { "accepted" });
    // The 16-byte GCM tag catches any modification. This is
    // authenticated encryption: tampering fails closed.
}`;

const cAdv = `/* AES-256-GCM with OpenSSL EVP: authenticated encryption.
 * Compile: gcc gcm.c -o gcm -lssl -lcrypto */
#include <openssl/evp.h>
#include <openssl/rand.h>
#include <string.h>
#include <stdio.h>

void aes_gcm_demo(void) {
    uint8_t key[32], nonce[12], tag[16];
    RAND_bytes(key, sizeof key);     /* secure random key   */
    RAND_bytes(nonce, sizeof nonce); /* unique per message  */

    const char *plaintext = "Send 1 BTC to Alice";
    size_t plen = strlen(plaintext);
    uint8_t ciphertext[64], decrypted[64];
    int len = 0;

    /* Encrypt */
    EVP_CIPHER_CTX *ctx = EVP_CIPHER_CTX_new();
    EVP_EncryptInit_ex(ctx, EVP_aes_256_gcm(), NULL, NULL, NULL);
    EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_IVLEN, 12, NULL);
    EVP_EncryptInit_ex(ctx, NULL, NULL, key, nonce);
    EVP_EncryptUpdate(ctx, ciphertext, &len,
                      (const uint8_t*)plaintext, plen);
    EVP_EncryptFinal_ex(ctx, ciphertext + len, &len);
    EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_GET_TAG, 16, tag);
    EVP_CIPHER_CTX_free(ctx);

    printf("Ciphertext (first 8): ");
    for (int i = 0; i < 8; i++) printf("%02x ", ciphertext[i]);
    printf("\\n");

    /* Decrypt and verify the tag */
    ctx = EVP_CIPHER_CTX_new();
    EVP_DecryptInit_ex(ctx, EVP_aes_256_gcm(), NULL, NULL, NULL);
    EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_IVLEN, 12, NULL);
    EVP_DecryptInit_ex(ctx, NULL, NULL, key, nonce);
    EVP_DecryptUpdate(ctx, decrypted, &len, ciphertext, plen);
    EVP_CIPHER_CTX_ctrl(ctx, EVP_CTRL_GCM_SET_TAG, 16, tag);
    int ok = EVP_DecryptFinal_ex(ctx, decrypted + len, &len);
    EVP_CIPHER_CTX_free(ctx);
    decrypted[plen] = 0;

    printf("Decrypted: %s\\n",
           ok > 0 ? (char*)decrypted : "[TAG VERIFICATION FAILED]");
    /* Tamper with the ciphertext and EVP_DecryptFinal_ex
     * returns negative. No partial plaintext is released. */
}`;

export const aes: PageContent = {
  slug: "aes",
  hexLabel: "0x1F",
  category: "cryptography",
  hero: {
    eyebrow: "root.system / 0x1F / aes",
    title: `Ten rounds of XOR.<br><span class="highlight">Unbreakable for a billion years.</span>`,
    lede: `You have already used AES today. Every HTTPS request you made, every WhatsApp message you sent, every file on your encrypted drive. All of it: AES. One algorithm, running everywhere, built from the same XOR gate you learned on page four. This page shows you what happens inside those ten rounds.`,
    narrativeHtml: `<p>In 1997 the US government had a problem. DES was dying.</p>
<p>The Data Encryption Standard had protected government and commercial secrets since 1977, but brute force was catching up to its 56-bit keys. In 1999 a purpose-built machine cracked DES in 22 hours.</p>
<p>So the government ran a competition. Any team in the world could submit a new encryption algorithm, to be analysed, attacked, and scrutinised by the best cryptographers alive.</p>
<p>Five years later a winner was chosen: two Belgian cryptographers, Joan Daemen and Vincent Rijmen, with an algorithm called Rijndael. Renamed AES, the Advanced Encryption Standard. It has been the global standard for symmetric encryption since 2001, and no practical attack exists. Not then, not now.</p>
<p>When you look inside it you find the same thing you found inside SHA-256. No multiplication. No complex mathematics. No secret sauce. Just XOR, applied with structure, ten rounds, on sixteen bytes at a time.</p>
<p>You already know XOR from page four. You already know what rounds mean from page thirty. This page connects both.</p>`,
  },
  levels: [
    /* =================================================================
       LEVEL 01 . BEGINNER
       ================================================================= */
    {
      level: "beginner",
      number: "01",
      title: "What symmetric encryption **solves**",
      blocks: [
        {
          kind: "prose",
          html: `<p>Symmetric encryption solves one problem: hide data from anyone who does not have the key. The same key encrypts and decrypts. Fast, efficient, and unbreakable when used correctly. The catch is key distribution, but you already solved that on the public key cryptography page. ECDH establishes the symmetric key; AES uses it. Every secure connection on Earth works exactly this way.</p>`,
        },
        { kind: "diagram", name: "symmetric-flow" },
        {
          kind: "grid",
          columns: 3,
          cards: [
            {
              label: "AES-128",
              value: "10 rounds . 16-byte key",
              desc: "2^128 brute force attempts, longer than the universe has existed. The workhorse of most TLS connections and WPA2 WiFi.",
            },
            {
              label: "AES-192",
              value: "12 rounds . 24-byte key",
              desc: "2^192 attempts. The middle option, used in some government applications. Rare in everyday software.",
            },
            {
              label: "AES-256",
              value: "14 rounds . 32-byte key",
              desc: "2^256 attempts, the impossibility the Big O page named, and the reason AES-256 is treated as quantum-resistant in practice. Used by BitLocker, VeraCrypt, Signal, and Bitcoin BIP-38 encrypted keys.",
            },
          ],
        },
        {
          kind: "prose",
          html: `<p>AES always operates on 16 bytes at a time, a fixed block, regardless of key size. Longer messages split into 16-byte blocks; shorter ones are padded. That block is called the <strong>state</strong>, and AES thinks of it as a 4x4 grid of bytes. Everything in the algorithm transforms this grid.</p>
<p>Each round applies exactly four operations in order. <strong>SubBytes</strong> replaces every byte through a lookup table (the S-box). <strong>ShiftRows</strong> rotates the bytes in each row. <strong>MixColumns</strong> mixes each column with Galois Field arithmetic. <strong>AddRoundKey</strong> XORs the state with the round key. Only AddRoundKey touches the key; the other three are fixed transformations providing confusion and diffusion.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustBeginner, label: "ctr.rs" },
            c: { language: "c", code: cBeginner, label: "ctr.c" },
          },
        },
        { kind: "widget", name: "aes-explorer" },
      ],
    },
    /* =================================================================
       LEVEL 02 . INTERMEDIATE
       ================================================================= */
    {
      level: "intermediate",
      number: "02",
      title: "Inside AES: the **four operations**",
      blocks: [
        { kind: "diagram", name: "aes-round" },
        {
          kind: "prose",
          html: `<p><strong>SubBytes.</strong> Why not just XOR? XOR is linear, and a linear cipher can be solved for the key algebraically from a few plaintext-ciphertext pairs. The S-box is non-linear, with no algebraic shortcut: it is the multiplicative inverse in GF(2^8) followed by an affine transformation. Every byte of the state is replaced by its S-box value, 16 lookups per round, 160 per AES-128 block. It is a permutation, a one-to-one mapping, and 0x53 maps to 0xED.</p>
<p><strong>ShiftRows.</strong> Row 0 is left alone, row 1 rotates left by 1, row 2 by 2, row 3 by 3. This pushes bytes across column boundaries so that the next MixColumns blends bytes that started in different columns. Without it, each column would be encrypted independently, which is four weak independent ciphers.</p>`,
        },
        {
          kind: "prose",
          html: `<p><strong>MixColumns.</strong> The most mathematically involved step. Each column of four bytes is treated as a polynomial over GF(2^8) and multiplied by a fixed polynomial, the matrix [[2,3,1,1],[1,2,3,1],[1,1,2,3],[3,1,1,2]], where 2 and 3 mean multiplication in the field. Each output byte depends on all four input bytes. After ShiftRows plus MixColumns, changing one input byte eventually affects all 16 state bytes: the AES avalanche. In practice it runs as table lookups, no polynomial arithmetic at runtime. MixColumns is skipped in the final round, which the designers found adds no security while costing speed.</p>
<p><strong>AddRoundKey.</strong> The only step that uses the key: 16 bytes of state XORed with 16 bytes of round key, bit by bit. The round keys come from the key schedule.</p>`,
        },
        {
          kind: "callout",
          variant: "info",
          title: "// key expansion",
          body: `AES expands the original key into 11 round keys for AES-128, one per round plus the initial AddRoundKey, 176 bytes of key material in total. The expansion uses the S-box again, XOR with public round constants (Rcon, powers of 2 in GF(2^8)), and byte rotation. Any single round key reveals nothing useful about the original key without the full schedule.`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustInter, label: "block.rs" },
            c: { language: "c", code: cInter, label: "block.c" },
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
      title: "Modes, authenticated encryption, and **AES in Bitcoin**",
      blocks: [
        {
          kind: "prose",
          html: `<p>A block cipher only encrypts 16 bytes. A <strong>mode of operation</strong> turns it into something that encrypts real messages, and the choice of mode matters more than people expect.</p>
<p><strong>ECB</strong> (Electronic Codebook) encrypts each block independently with the same key. The fatal flaw: identical plaintext blocks always produce identical ciphertext blocks, so patterns survive.</p>`,
        },
        { kind: "diagram", name: "ecb-penguin" },
        {
          kind: "prose",
          html: `<p>The famous demonstration is the Linux Tux penguin encrypted in ECB: the silhouette is still clearly visible, because the large solid regions are identical blocks that encrypt identically. Never use ECB. For anything. At any key size.</p>
<p><strong>CBC</strong> (Cipher Block Chaining) XORs each plaintext block with the previous ciphertext block before encrypting, and the first block with a random IV. Patterns vanish, but encryption is sequential and cannot be parallelised, and it needs padding (PKCS7) to fill the last block.</p>
<p><strong>CTR</strong> (Counter) encrypts a counter to make a keystream, then XORs the keystream with the plaintext. No padding, any length, fully parallelisable, the same XOR-as-cipher idea but with a keystream from AES instead of a weak PRNG.</p>`,
        },
        {
          kind: "callout",
          variant: "warn",
          title: "// the nonce must never repeat, again",
          body: `In CTR mode the nonce must be unique per key. Reuse it and the keystream repeats, so XORing two ciphertexts made under the same keystream cancels the keystream and leaves Plaintext1 XOR Plaintext2, exposing both. This is the exact same category of mistake as reusing the nonce k in ECDSA on the digital signatures page. Different algorithm, identical root cause: a number that must be used once gets used twice, and the security collapses.`,
        },
        {
          kind: "prose",
          html: `<p><strong>GCM</strong> (Galois Counter Mode) is CTR plus authentication. It provides confidentiality and integrity together: alongside the ciphertext it produces a 16-byte authentication tag computed over the data with Galois Field multiplication. Tamper with the ciphertext and decryption fails the tag check, releasing no plaintext at all. AES-256-GCM is the authenticated-encryption standard, what TLS 1.3 uses for every HTTPS session and Signal uses for every message.</p>`,
        },
        {
          kind: "codepair",
          pair: {
            rust: { language: "rust", code: rustAdv, label: "gcm.rs" },
            c: { language: "c", code: cAdv, label: "gcm.c" },
          },
        },
        { kind: "heading", text: "Where AES appears in Bitcoin" },
        {
          kind: "prose",
          html: `<p>AES is not part of Bitcoin's consensus rules. No transaction uses it directly. But it is everywhere around Bitcoin, the symmetric shell wrapped around all the asymmetric operations.</p>`,
        },
        {
          kind: "grid",
          columns: 2,
          cards: [
            { label: "BIP-38", value: "encrypted private keys", desc: "Exporting a private key with a passphrase produces BIP-38 format: AES-256-CBC over the 32-byte key, with the AES key derived from the passphrase via scrypt. This is how paper wallets and encrypted cold-storage backups stay safe even when printed in the open." },
            { label: "HARDWARE WALLETS", value: "AES at rest, PIN on top", desc: "Ledger and Trezor store the private key encrypted with AES, and the key protecting that AES key is derived from your PIN. Without the PIN the storage is useless, and secure elements wipe the device after too many wrong tries." },
            { label: "V2 TRANSPORT (BIP-324)", value: "encrypted node links", desc: "Bitcoin Core's V2 peer transport encrypts the connection with ChaCha20-Poly1305 after an ECDH handshake. ChaCha20 is the modern AES alternative for hardware without AES acceleration. The switch from plaintext V1 exists to stop ISPs from spotting and blocking Bitcoin traffic." },
            { label: "LIGHTNING (BOLT 8)", value: "Noise-based transport", desc: "Lightning nodes talk over the Noise Protocol Framework, also using ChaCha20-Poly1305. Same authenticated-encryption shape as AES-GCM, a different underlying cipher." },
          ],
        },
        {
          kind: "callout",
          variant: "info",
          title: "// seven pages, one transaction",
          body: `Broadcasting a transaction over the V2 transport stacks the whole curriculum: ECDH key exchange (public key cryptography), HMAC key derivation (hash deep dive), AES-GCM or ChaCha20-Poly1305 encryption (this page), TCP transmission (networking), then the peer decrypts, verifies the ECDSA signature (digital signatures), and looks the UTXO up in a LevelDB B-tree (trees). Seven pages. One transaction. All connected.`,
        },
      ],
    },
  ],
  connections: {
    title: "Where symmetric encryption appears in ScrapyBytes",
    introHtml: `<p>AES is the symmetric layer wrapped around everything, and it is built from primitives you already know. Here is where it connects.</p>`,
    items: [
      {
        slug: "logic-gates",
        text: `XOR is the most important gate in AES: AddRoundKey is 128 XOR gates in parallel, and MixColumns is XOR plus GF multiplication. Page four built every operation AES uses except the field multiply.`,
      },
      {
        slug: "binary",
        text: `AES works on 128 bits at a time, 16 bytes as a 4x4 grid. AddRoundKey is XOR, ShiftRows is byte rotation, every step is binary arithmetic. The binary page is the substrate every round runs on.`,
      },
      {
        slug: "cpu",
        text: `Modern x86 has AES-NI: AESENC does one round per cycle, so AES-128 is ten cycles per block, hundreds of millions of blocks a second. Hardware acceleration is why AES is everywhere; without it software AES is 10 to 20 times slower.`,
      },
      {
        slug: "hashing",
        text: `AES and SHA-256 share a philosophy: fixed rounds of simple operations, no trapdoors, security from the combination not any one step. SHA-256 is 64 rounds of six operations, AES is 10 rounds of four. Same idea, different algorithm.`,
      },
      {
        slug: "memory",
        text: `The 16-byte state fits in one cache line and the 176-byte AES-128 key schedule stays in L1, so encryption runs with no cache misses. The memory page explained cache lines; AES was designed to exploit them.`,
      },
      {
        slug: "public-key-cryptography",
        text: `ECDH lets two strangers agree on a shared secret, which becomes the AES key. Public key crypto for the exchange, AES for the bulk. Together the two pages describe every secure channel on Earth.`,
      },
      {
        slug: "networking",
        text: `Every HTTPS connection negotiates an AES key via ECDH, then AES-GCM encrypts the session. The networking page showed the packets; AES is what makes them private.`,
      },
      {
        slug: "digital-signatures",
        text: `AES encrypts, signatures authenticate, and AES-GCM does both: its 16-byte tag is a message authentication code giving the same tamper-detection guarantee as a signature, by a different mechanism.`,
      },
      {
        slug: "big-o",
        text: `Brute forcing AES-128 is 2^128 attempts, AES-256 is 2^256, both impossible by the Big O page's own argument, and no practical quantum computer changes that for AES-256. The key size is the proof.`,
      },
      {
        slug: "operating-system",
        text: `The OS supplies the randomness for keys and nonces, /dev/urandom or CryptGenRandom. A bad OS RNG breaks AES no matter how correct the cipher is. Crypto depends on the kernel getting randomness right.`,
      },
      {
        slug: "blockchain",
        text: `BIP-38 encrypts private keys with AES, hardware wallets store keys with AES, and V2 and Lightning transport use ChaCha20. AES is the symmetric shell around all of Bitcoin's asymmetric operations.`,
      },
    ],
  },
  nextUp: {
    eyebrow: "next up / 0x20",
    title: "Prove you know a secret without revealing it: zero knowledge proofs, the finale of Series 2.",
    href: "/zero-knowledge-proofs",
    label: "zero knowledge proofs",
    variant: "magenta",
  },
};
