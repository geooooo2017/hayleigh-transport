import { Link } from "react-router-dom";

export default function MarketingAbout() {
  return (
    <div className="border-b border-ht-border bg-white">
      <div className="border-b border-ht-border bg-ht-navy py-12 text-white lg:py-16">
        <div className="mx-auto max-w-3xl px-4 lg:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/90">About us</p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight">Hayleigh Transport</h1>
          <p className="mt-4 max-w-2xl text-lg text-slate-300">
            A logistics partner focused on reliability, compliance and straight talking — the way a serious haulage
            operator should work.
          </p>
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 py-14 lg:px-6 lg:py-20">
        <p className="text-lg leading-relaxed text-slate-600">
          We combine hands-on road transport experience with modern planning and tracking tools. Our aim is simple: your
          freight moves safely, on schedule, and with full visibility — whether it is a one-off load or regular work
          into your supply chain.
        </p>
        <h2 className="mt-12 text-xs font-semibold uppercase tracking-widest text-ht-slate">Our approach</h2>
        <p className="mt-6 text-slate-600">
          Our lorries and vans carry full Hayleigh livery — your loads are moved in clearly marked, professional
          vehicles, from delivery vans through to articulated combinations (see the home page for our fleet in action).
        </p>
        <ul className="mt-8 space-y-3 text-slate-600">
          <li className="flex gap-3 border-l-2 border-ht-amber pl-4">
            <span>Clear communication from booking through to proof of delivery</span>
          </li>
          <li className="flex gap-3 border-l-2 border-ht-border pl-4">
            <span>Flexible haulage — full load, part load, dedicated vehicles and timed deliveries</span>
          </li>
          <li className="flex gap-3 border-l-2 border-ht-border pl-4">
            <span>Commitment to safety, compliance and environmental responsibility</span>
          </li>
        </ul>
        <p className="mt-10 rounded-xl border border-ht-border bg-ht-canvas/80 p-6 text-slate-700">
          For contracted customers and partners, our{" "}
          <Link to="/login" className="font-semibold text-ht-slate underline decoration-ht-amber/60 hover:no-underline">
            Transport Operations Platform
          </Link>{" "}
          provides job tracking, scheduling and reporting in one secure place.
        </p>
      </div>
    </div>
  );
}
