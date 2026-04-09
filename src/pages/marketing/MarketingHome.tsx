import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Navigation, Shield, Truck } from "lucide-react";
import { FleetLiverySection } from "../../components/marketing/FleetLiverySection";

const heroImg =
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1600&q=80&auto=format&fit=crop";
const secondaryImg =
  "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=1600&q=80&auto=format&fit=crop";

const trustItems = [
  { Icon: Truck, label: "General & specialist haulage", sub: "Full loads, part loads & dedicated runs" },
  { Icon: MapPin, label: "UK-wide & international", sub: "Planned routes, clear ETAs" },
  { Icon: Shield, label: "Professional standards", sub: "Safety, compliance & clear communication" },
];

export default function MarketingHome() {
  return (
    <>
      <section className="relative overflow-hidden bg-ht-navy text-white">
        <div className="absolute inset-0 opacity-35">
          <img src={heroImg} alt="" className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-ht-navy via-ht-navy/95 to-ht-navy/75" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 lg:px-6 lg:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-400/95">
            Road haulage &amp; logistics
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-bold leading-tight tracking-tight lg:text-5xl">
            Reliable transport for freight that has to arrive on time
          </h1>
          <p className="mt-6 max-w-lg text-lg text-slate-300">
            Hayleigh Transport provides professional haulage, distribution and logistics support — from collection to
            delivery, with the accountability you expect from an established operator.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-lg bg-ht-amber px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 transition hover:bg-ht-amber-dark"
            >
              Speak to our team
              <ArrowRight size={18} />
            </Link>
            <Link
              to="/quote"
              className="inline-flex items-center gap-2 rounded-lg border border-white/35 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20"
            >
              Request a quote
            </Link>
          </div>
          <div className="mt-8 max-w-2xl rounded-xl border border-white/20 bg-white/5 p-4 backdrop-blur-sm sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300/95">Driver portal</p>
            <p className="mt-2 text-sm leading-relaxed text-slate-200">
              Use the button below with the <span className="text-white/95">name, vehicle registration and job number</span>{" "}
              the office has given you. You will only see <span className="text-white/95">your own jobs</span> — not the
              rest of the operations system.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              You can choose to share your live location so planners can see you on the map; that is always optional.{" "}
              <span className="font-medium text-white">Office and admin staff use a different login</span> on this site.
            </p>
            <Link
              to="/driver"
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-emerald-500"
            >
              <Navigation size={18} aria-hidden />
              Driver sign-in
            </Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-white/10 pt-6">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">Office &amp; planners</span>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-ht-slate/80 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-white/40 hover:bg-ht-slate"
            >
              Staff / operations login
            </Link>
          </div>
        </div>
        <div className="relative border-t border-white/10 bg-black/25 backdrop-blur-sm">
          <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:grid-cols-3 lg:px-6">
            {trustItems.map(({ Icon, label, sub }) => (
              <div key={label} className="flex gap-3 text-left">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ht-amber/20 text-amber-400">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-ht-border bg-white">
        <div className="mx-auto max-w-6xl px-4 py-16 lg:px-6 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-ht-slate">What we do</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-ht-navy lg:text-4xl">Haulage built around your operation</h2>
              <p className="mt-6 text-lg leading-relaxed text-slate-600">
                We move goods for businesses that need dependable road transport — scheduled collections, clear
                paperwork, and drivers who understand tight delivery windows. Whether you need UK distribution or support
                for cross-border movements, we plan the job properly and keep you informed.
              </p>
              <Link
                to="/about"
                className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-ht-slate hover:text-ht-slate-dark"
              >
                Learn more about us
                <ArrowRight size={16} />
              </Link>
            </div>
            <div className="overflow-hidden rounded-2xl border border-ht-border shadow-lg">
              <img
                src={heroImg}
                alt="Commercial vehicles and logistics yard"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <FleetLiverySection />

      <section className="bg-white py-16 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            <div className="order-2 overflow-hidden rounded-2xl border border-ht-border shadow-lg lg:order-1">
              <img
                src={secondaryImg}
                alt="Highway logistics and connectivity"
                className="aspect-[4/3] w-full object-cover"
              />
            </div>
            <div className="order-1 lg:order-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-ht-slate">Coverage</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-ht-navy lg:text-4xl">Nationwide &amp; beyond</h2>
              <p className="mt-6 leading-relaxed text-slate-600">
                Our planners coordinate routes across the UK and support international legs where required. You get a
                single point of contact, agreed rates, and the operational discipline you expect from a professional
                haulage company.
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  to="/quote"
                  className="rounded-lg bg-ht-amber px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-ht-amber-dark"
                >
                  Get a transport quote
                </Link>
                <Link
                  to="/contact"
                  className="rounded-lg border border-ht-border bg-white px-5 py-2.5 text-sm font-semibold text-ht-navy shadow-sm hover:bg-slate-50"
                >
                  Contact the office
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
