const FLEET_IMAGE = "/marketing/hayleigh-fleet-livery.png";

export function FleetLiverySection() {
  return (
    <section className="border-b border-ht-border bg-ht-canvas py-16 lg:py-24" aria-labelledby="fleet-livery-heading">
      <div className="mx-auto max-w-6xl px-4 lg:px-6">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-widest text-ht-slate">Our fleet on the road</p>
          <h2 id="fleet-livery-heading" className="mt-2 text-3xl font-bold tracking-tight text-ht-navy lg:text-4xl">
            Liveried vans, rigids &amp; artics
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-slate-600">
            Hayleigh Transport vehicles are turned out in full corporate livery — from delivery vans and curtain-siders
            to heavy tractor units — so we are easy to recognise on site, on the motorway and at the point of delivery.
          </p>
        </div>

        <figure className="mt-10 overflow-hidden rounded-2xl border border-ht-border bg-white shadow-lg">
          <img
            src={FLEET_IMAGE}
            alt="Hayleigh Transport fleet: white liveried vans, rigid trucks and articulated vehicles with HT branding"
            className="h-auto w-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </figure>
      </div>
    </section>
  );
}
