const STREAM = (
  <>
    01001000 01100101 01101100 01101100 01101111 &nbsp; <span className="hot">0xDEAD</span> &nbsp;
    00100000 01010111 01101111 01110010 01101100 01100100 &nbsp;{" "}
    <span className="hot">0xBEEF</span> &nbsp; 01001000 01100101 01101100 01101100 01101111
    00100000 01010111 01101111 01110010 01101100 01100100 &nbsp;{" "}
    <span className="hot">NAND</span> &nbsp; 01001000 01100101 01101100 01101100 01101111 &nbsp;{" "}
    <span className="hot">0xCAFE</span> &nbsp; 00100000 01010111 01101111 01110010 01101100
    01100100 &nbsp; 01001000 01100101 01101100 01101100 01101111 00100000 01010111 01101111
    01110010 01101100 01100100 &nbsp; <span className="hot">XOR</span> &nbsp; 00100000 01010111
    01101111 01110010 01101100 01100100 &nbsp;
  </>
);

export function BinaryStream() {
  return (
    <div className="stream fade-up delay-3" aria-hidden="true">
      <div className="stream-track">
        {STREAM}
        {STREAM}
      </div>
    </div>
  );
}
