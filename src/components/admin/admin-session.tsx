"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import {
  AcademicCapIcon,
  ArrowLeftStartOnRectangleIcon,
  Bars3Icon,
  BookOpenIcon,
  ChartBarSquareIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  HomeIcon,
  IdentificationIcon,
  InboxStackIcon,
  PaintBrushIcon,
  PhotoIcon,
  RectangleStackIcon,
  ShieldCheckIcon,
  UsersIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import type { FunctionReturnType } from "convex/server";
import { useConvexAuth, useQuery } from "convex/react";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentType,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type SVGProps,
} from "react";

import { api } from "../../../convex/_generated/api";

import { AdminConfirmationProvider } from "./admin-confirm-dialog";
import styles from "./admin-shell.module.css";

type AdminUser = NonNullable<FunctionReturnType<typeof api.adminUsers.me>>;
type AdminRole = AdminUser["role"];
type AdminIcon = ComponentType<SVGProps<SVGSVGElement>>;

type AdminNavigationItem = {
  href: Route;
  label: string;
  description: string;
  icon: AdminIcon;
};

const navigation: ReadonlyArray<AdminNavigationItem> = [
  {
    href: "/admin",
    label: "Overview",
    description: "Publishing work at a glance",
    icon: HomeIcon,
  },
  {
    href: "/admin/pages",
    label: "Pages",
    description: "Public copy and page content",
    icon: DocumentTextIcon,
  },
  {
    href: "/admin/journal",
    label: "Journal",
    description: "Stories, revisions, and publishing",
    icon: BookOpenIcon,
  },
  {
    href: "/admin/programs",
    label: "Programs",
    description: "Programme record and public work",
    icon: RectangleStackIcon,
  },
  {
    href: "/admin/contacts",
    label: "Contact desk",
    description: "Join, proposals, and questions",
    icon: InboxStackIcon,
  },
  {
    href: "/admin/assessments",
    label: "Practice Builder",
    description: "Formats, question rules, and review gates",
    icon: AcademicCapIcon,
  },
  {
    href: "/admin/members",
    label: "Members",
    description: "Profiles, roles, and consent",
    icon: UsersIcon,
  },
  {
    href: "/admin/media",
    label: "Media",
    description: "Reviewed R2 images",
    icon: PhotoIcon,
  },
  {
    href: "/admin/appearance",
    label: "Appearance",
    description: "Public colour system",
    icon: PaintBrushIcon,
  },
  {
    href: "/admin/audit",
    label: "Audit log",
    description: "Owner-only change history",
    icon: ChartBarSquareIcon,
  },
];

const roleLabels: Record<AdminRole, string> = {
  editor: "Editor",
  publisher: "Publisher",
  owner: "Owner",
};

const AdminSessionContext = createContext<AdminUser | null>(null);

export function useAdminSession() {
  const admin = useContext(AdminSessionContext);
  if (admin === null) {
    throw new Error("useAdminSession must be used inside the admin workspace.");
  }
  return admin;
}

export function canPublish(admin: Pick<AdminUser, "role">) {
  return admin.role === "publisher" || admin.role === "owner";
}

function cleanAuthError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (/TooManyFailedAttempts|too many (?:failed )?(?:sign-in|login) attempts/i.test(message)) {
    return "Too many sign-in attempts. Wait a moment, then try again.";
  }

  if (/InvalidAccountId|InvalidSecret|invalid credentials|invalid password/i.test(message)) {
    return "The email or password is incorrect.";
  }

  if (/already exists|already.*account/i.test(message)) {
    return "An account already exists for this email address.";
  }

  if (/enter a valid email address/i.test(message)) {
    return "Enter a valid email address.";
  }

  if (/name must be between 2 and 100 characters/i.test(message)) {
    return "Name must be between 2 and 100 characters.";
  }

  if (/password must be 12.+128 characters/i.test(message)) {
    return "Password must be 12–128 characters, fit the 72-byte security limit, and include upper-case, lower-case, and numeric characters.";
  }

  return "The request could not be completed. Try again.";
}

export function AdminSignIn() {
  const { signIn } = useAuthActions();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const emailId = useId();
  const passwordId = useId();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    form.set("flow", "signIn");

    try {
      await signIn("password", form);
    } catch (error) {
      setMessage(cleanAuthError(error));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className={styles.authViewport}>
      <section className={styles.authPanel} aria-labelledby="admin-auth-title">
        <div className={styles.authBrand}>
          <Image
            src="/brand/english-club-mark-placeholder.svg"
            alt=""
            width={48}
            height={48}
            priority
          />
          <span>English Club</span>
        </div>

        <div className={styles.authIntro}>
          <p className={styles.contextLabel}>Administration</p>
          <h1 id="admin-auth-title">Return to the workspace.</h1>
          <p>Sign in with an account provisioned by the deployment operator.</p>
        </div>

        <form className={styles.authForm} onSubmit={handleSubmit}>
          <input type="hidden" name="flow" value="signIn" />

          <label className={styles.field} htmlFor={emailId}>
            <span>Email address</span>
            <input
              id={emailId}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              required
            />
          </label>

          <label className={styles.field} htmlFor={passwordId}>
            <span>Password</span>
            <input
              id={passwordId}
              name="password"
              type="password"
              autoComplete="current-password"
              minLength={12}
              maxLength={128}
              required
            />
          </label>

          {message ? (
            <p className={styles.formError} role="alert">
              {message}
            </p>
          ) : null}

          <button className={styles.primaryButton} type="submit" disabled={pending}>
            {pending ? "Checking account…" : "Sign in"}
            <ChevronRightIcon aria-hidden width={18} height={18} />
          </button>
        </form>

        <Link className={styles.backToSite} href="/">
          <ArrowLeftStartOnRectangleIcon aria-hidden width={18} height={18} />
          Return to the public site
        </Link>
      </section>

      <aside className={styles.authAside} aria-label="Workspace scope">
        <ShieldCheckIcon aria-hidden width={32} height={32} />
        <p>
          Publishing permissions are checked again by Convex for every read and write.
        </p>
      </aside>
    </main>
  );
}

function AdminLoading() {
  return (
    <main className={styles.authViewport} aria-busy="true" aria-label="Loading administration">
      <section className={styles.authPanel}>
        <div className={styles.loadingMark} />
        <div className={styles.loadingLine} />
        <div className={styles.loadingBlock} />
        <span className="visually-hidden">Loading administration workspace</span>
      </section>
    </main>
  );
}

function AdminAccessPending() {
  const { signOut } = useAuthActions();

  return (
    <main className={styles.accessViewport}>
      <section className={styles.accessPanel}>
        <IdentificationIcon aria-hidden width={42} height={42} />
        <p className={styles.contextLabel}>Access required</p>
        <h1>This account is not on the admin list.</h1>
        <p>
          Ask the deployment operator to provision this account internally. Browser
          account creation is disabled.
        </p>
        <button className={styles.textButton} type="button" onClick={() => void signOut()}>
          Sign out
        </button>
      </section>
    </main>
  );
}

function isActiveRoute(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavigationLinks({
  pathname,
  onNavigate,
  compact = false,
}: {
  pathname: string;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  return (
    <nav className={compact ? styles.mobileNavList : styles.sidebarNav} aria-label="Admin navigation">
      {navigation.map((item) => {
        const Icon = item.icon;
        const active = isActiveRoute(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={styles.adminNavLink}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
          >
            <Icon aria-hidden width={21} height={21} strokeWidth={1.8} />
            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function AdminMobileMenu({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const previousOverflow = useRef("");

  useEffect(() => () => {
    document.body.style.overflow = previousOverflow.current;
  }, []);

  function openMenu() {
    if (!dialogRef.current || dialogRef.current.open) return;
    previousOverflow.current = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    setOpen(true);
    dialogRef.current.showModal();
    closeRef.current?.focus();
  }

  function closeMenu() {
    if (dialogRef.current?.open) dialogRef.current.close();
  }

  function afterClose() {
    document.body.style.overflow = previousOverflow.current;
    setOpen(false);
    triggerRef.current?.focus();
  }

  function containFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") return;
    const elements = dialogRef.current
      ? Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        ).filter((element) => element.getClientRects().length > 0)
      : [];
    const first = elements[0];
    const last = elements.at(-1);
    if (!first || !last) {
      event.preventDefault();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={styles.mobileMenuTrigger}
        aria-label={open ? "Close admin navigation" : "Open admin navigation"}
        aria-expanded={open}
        aria-controls="admin-mobile-navigation"
        onClick={openMenu}
      >
        <Bars3Icon aria-hidden width={23} height={23} />
      </button>
      <dialog
        ref={dialogRef}
        id="admin-mobile-navigation"
        className={styles.mobileMenuDialog}
        aria-labelledby="admin-mobile-menu-title"
        onClose={afterClose}
        onKeyDown={containFocus}
        onClick={(event) => {
          if (event.target === dialogRef.current) closeMenu();
        }}
      >
        <div className={styles.mobileMenuPanel}>
          <div className={styles.mobileMenuHead}>
            <div>
              <span>English Club</span>
              <strong id="admin-mobile-menu-title">Administration</strong>
            </div>
            <button
              ref={closeRef}
              type="button"
              className={styles.iconButton}
              aria-label="Close admin navigation"
              onClick={closeMenu}
            >
              <XMarkIcon aria-hidden width={22} height={22} />
            </button>
          </div>
          <NavigationLinks pathname={pathname} onNavigate={closeMenu} compact />
        </div>
      </dialog>
    </>
  );
}

export function AdminShellView({
  admin,
  pathname,
  onSignOut,
  children,
}: {
  admin: AdminUser;
  pathname: string;
  onSignOut: () => void;
  children: ReactNode;
}) {
  return (
    <AdminSessionContext.Provider value={admin}>
      <div className={styles.adminRoot}>
        <AdminConfirmationProvider>
          <a className={styles.adminSkipLink} href="#admin-main">
            Skip to workspace
          </a>

          <aside className={styles.sidebar}>
            <Link href="/admin" className={styles.adminBrand} aria-label="English Club admin overview">
              <Image
                src="/brand/english-club-mark-placeholder.svg"
                alt=""
                width={42}
                height={42}
                priority
              />
              <span>
                <strong>English Club</strong>
                <small>Administration</small>
              </span>
            </Link>
            <NavigationLinks pathname={pathname} />
            <div className={styles.sidebarFooter}>
              <span className={styles.roleStamp}>{roleLabels[admin.role]}</span>
              <strong>{admin.displayName}</strong>
              {admin.email ? <small>{admin.email}</small> : null}
              <button type="button" className={styles.signOutButton} onClick={onSignOut}>
                <ArrowLeftStartOnRectangleIcon aria-hidden width={19} height={19} />
                Sign out
              </button>
            </div>
          </aside>

          <div className={styles.adminWorkArea}>
            <header className={styles.mobileTopbar}>
              <Link href="/admin" className={styles.mobileBrand} aria-label="English Club admin overview">
                <Image
                  src="/brand/english-club-mark-placeholder.svg"
                  alt=""
                  width={38}
                  height={38}
                  priority
                />
                <span>EC Admin</span>
              </Link>
              <AdminMobileMenu pathname={pathname} />
            </header>
            <main id="admin-main" className={styles.adminMain} tabIndex={-1}>
              {children}
            </main>
          </div>
        </AdminConfirmationProvider>
      </div>
    </AdminSessionContext.Provider>
  );
}

function AuthenticatedAdmin({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const admin = useQuery(api.adminUsers.me, {});
  const { signOut } = useAuthActions();

  if (admin === undefined) return <AdminLoading />;
  if (admin === null) return <AdminAccessPending />;

  return (
    <AdminShellView
      admin={admin}
      pathname={pathname}
      onSignOut={() => void signOut()}
    >
      {children}
    </AdminShellView>
  );
}

export function AdminAccessGate({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useConvexAuth();

  useEffect(() => {
    document.documentElement.dataset.adminHydrated = "true";
    return () => {
      delete document.documentElement.dataset.adminHydrated;
    };
  }, []);

  if (isLoading) return <AdminLoading />;
  if (!isAuthenticated) {
    return <AdminSignIn />;
  }
  return <AuthenticatedAdmin>{children}</AuthenticatedAdmin>;
}
