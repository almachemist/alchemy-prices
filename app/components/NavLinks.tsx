"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/recipes", label: "Recipes" },
  { href: "/inventory", label: "Inventory" },
  { href: "/clients", label: "Clients" },
  { href: "/orders", label: "Orders" },
  { href: "/invoices", label: "Invoices" },
  { href: "/batch-calculator", label: "Calculator" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {links.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`nav-link ${active ? "nav-link-active" : ""}`}
          >
            {label}
          </Link>
        );
      })}
    </>
  );
}
