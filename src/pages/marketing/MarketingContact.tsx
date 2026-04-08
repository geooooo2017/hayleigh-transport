import { Link } from "react-router-dom";
import { useState } from "react";
import { toast } from "sonner";
import { mailtoOffice, OFFICE_ENQUIRIES_EMAIL } from "../../lib/companyBrand";

export default function MarketingContact() {
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [message, setMessage] = useState("");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const href = mailtoOffice(`Website enquiry from ${name}`, `Name: ${name}\nReply-to: ${fromEmail}\n\n${message}`);
    window.location.assign(href);
    setSent(true);
    toast.success("Opening your email app", {
      description: `Send the message to ${OFFICE_ENQUIRIES_EMAIL} to complete your enquiry.`,
    });
  };

  return (
    <div className="border-b border-ht-border bg-white">
      <div className="border-b border-ht-border bg-ht-canvas py-10 lg:py-12">
        <div className="mx-auto max-w-6xl px-4 lg:px-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-ht-slate">Enquiries</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-ht-navy">Contact the transport office</h1>
          <p className="mt-3 max-w-2xl text-lg text-slate-600">
            Haulage quotes, account queries and general logistics — we will respond as soon as we can.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-12 lg:px-6 lg:py-16">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-ht-slate">Direct lines</h2>
          <ul className="mt-4 space-y-4 text-slate-800">
            <li className="rounded-xl border border-ht-border bg-ht-canvas/50 p-4">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Email</span>
              <a href={`mailto:${OFFICE_ENQUIRIES_EMAIL}`} className="mt-1 block font-semibold text-ht-slate hover:underline">
                {OFFICE_ENQUIRIES_EMAIL}
              </a>
            </li>
            <li className="rounded-xl border border-ht-border bg-ht-canvas/50 p-4">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Office</span>
              <a href="tel:01698480314" className="mt-1 block font-semibold text-ht-navy hover:text-ht-slate">
                01698 480314
              </a>
            </li>
            <li className="rounded-xl border border-ht-border bg-ht-canvas/50 p-4">
              <span className="text-xs font-medium uppercase tracking-wide text-slate-500">Mobile</span>
              <a href="tel:07508144225" className="mt-1 block font-semibold text-ht-navy hover:text-ht-slate">
                07508 144225
              </a>
            </li>
          </ul>
          <p className="mt-8 text-sm text-slate-600">
            Existing customers: sign in to the{" "}
            <Link to="/login" className="font-semibold text-ht-slate underline decoration-ht-amber/50 hover:no-underline">
              operations platform
            </Link>
            .
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-ht-border bg-white p-6 shadow-sm lg:p-8">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Name
            </label>
            <input
              id="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ht-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ht-slate/25"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={fromEmail}
              onChange={(e) => setFromEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ht-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ht-slate/25"
            />
          </div>
          <div>
            <label htmlFor="msg" className="block text-sm font-medium text-gray-700">
              Message
            </label>
            <textarea
              id="msg"
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 w-full rounded-lg border border-ht-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ht-slate/25"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-ht-slate py-3 text-sm font-semibold text-white hover:bg-ht-slate-dark"
          >
            {sent ? "Sent" : "Send message"}
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}
