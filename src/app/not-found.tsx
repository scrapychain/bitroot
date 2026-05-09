import Link from "next/link";

export default function NotFound() {
  return (
    <section className="hero">
      <div className="eyebrow fade-up">root.system / 0x404 / lost</div>
      <h1 className="title fade-up delay-1">
        404.<br />
        <span className="highlight">Bit not found.</span>
      </h1>
      <p className="lede fade-up delay-2">
        That page doesn&apos;t exist, or it never did. The address resolved to a region of memory
        that was never allocated.
      </p>
      <div className="next-up" style={{ marginTop: "3rem" }}>
        <div className="next-up-text">
          <div className="next-up-eyebrow">return</div>
          <div className="next-up-title">Back to the root.</div>
        </div>
        <Link href="/" className="btn">
          home <span>→</span>
        </Link>
      </div>
    </section>
  );
}
