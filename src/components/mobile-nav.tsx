"use client";

import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { PublicContentFor } from "@content/public-content";

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
}

export function PrimaryNavigation({
  copy,
}: {
  copy: PublicContentFor<"global">;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousOverflowRef = useRef("");
  const links: Array<{ href: Route; label: string }> = [
    { href: "/about", label: copy.navAbout },
    { href: "/activities", label: copy.navActivities },
    { href: "/members", label: copy.navMembers },
    { href: "/practice", label: copy.navPractice },
    { href: "/journal", label: copy.navJournal },
  ];

  useEffect(() => {
    return () => {
      document.body.style.overflow = previousOverflowRef.current;
    };
  }, []);

  function openMenu() {
    const dialog = dialogRef.current;

    if (!dialog || dialog.open) {
      return;
    }

    previousOverflowRef.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setOpen(true);
    dialog.showModal();
    closeRef.current?.focus();
  }

  function closeMenu() {
    const dialog = dialogRef.current;

    if (dialog?.open) {
      dialog.close();
    }
  }

  function handleClose() {
    document.body.style.overflow = previousOverflowRef.current;
    setOpen(false);
    triggerRef.current?.focus();
  }

  function containDialogFocus(event: React.KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") {
      return;
    }

    const dialog = dialogRef.current;
    const focusable = dialog
      ? Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => element.getClientRects().length > 0)
      : [];

    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable.at(-1);
    const active = document.activeElement;

    if (event.shiftKey && (active === first || !dialog?.contains(active))) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <nav className="primary-nav" aria-label={copy.primaryNavigationLabel}>
        <div className="desktop-nav">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="nav-link"
              aria-current={isActive(pathname, link.href) ? "page" : undefined}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/contact?intent=join"
            className="nav-join"
            aria-current={pathname === "/contact" ? "page" : undefined}
          >
            {copy.navJoin}
          </Link>
        </div>

        <button
          ref={triggerRef}
          type="button"
          className="menu-trigger"
          aria-expanded={open}
          aria-haspopup="dialog"
          aria-controls="mobile-menu"
          aria-label={open ? copy.menuCloseLabel : copy.menuOpenLabel}
          onClick={openMenu}
        >
          <Bars3Icon aria-hidden width={23} height={23} strokeWidth={2} />
        </button>
      </nav>

      <dialog
        ref={dialogRef}
        id="mobile-menu"
        className="mobile-menu"
        aria-labelledby="mobile-menu-title"
        onClose={handleClose}
        onKeyDown={containDialogFocus}
        onClick={(event) => {
          if (event.target === dialogRef.current) {
            closeMenu();
          }
        }}
      >
        <div className="mobile-menu-panel">
          <div className="mobile-menu-head">
            <p id="mobile-menu-title">{copy.menuTitle}</p>
            <button
              ref={closeRef}
              type="button"
              className="mobile-menu-close"
              aria-label={copy.menuCloseLabel}
              onClick={closeMenu}
            >
              <XMarkIcon width={23} height={23} strokeWidth={2} aria-hidden />
            </button>
          </div>

          <nav className="mobile-menu-links" aria-label={copy.mobileNavigationLabel}>
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="mobile-menu-link"
                aria-current={isActive(pathname, link.href) ? "page" : undefined}
                onClick={closeMenu}
              >
                <span>{link.label}</span>
              </Link>
            ))}
            <Link
              href="/contact?intent=join"
              className="mobile-menu-join"
              onClick={closeMenu}
            >
              <span>{copy.menuJoin}</span>
            </Link>
          </nav>

          <p className="mobile-menu-note">{copy.menuNote}</p>
        </div>
      </dialog>
    </>
  );
}
