"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import {
  AcademicCapIcon,
  ArrowLeftStartOnRectangleIcon,
  Bars3Icon,
  BookOpenIcon,
  ChartBarSquareIcon,
  ChevronRightIcon,
  ClipboardDocumentIcon,
  DocumentTextIcon,
  HomeIcon,
  IdentificationIcon,
  PaintBrushIcon,
  PhotoIcon,
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
    href: "/admin/assessments",
    label: "Assessments",
    description: "Forms, questions, and review gates",
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
    href: "/admin/activity",
    label: "Activity",
    description: "Owner audit trail",
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
  if (/invalid credentials/i.test(message)) {
    return "The email or password is incorrect.";
  }
  if (/already exists|already.*account/i.test(message)) {
    return "An account already exists for this email address.";
  }
  const finalLine = message.split("\n").at(-1)?.trim();
  return finalLine && finalLine.length <= 220
    ? finalLine.replace(/^Uncaught Error:\s*/i, "")
    : "The request could not be completed. Try again.";
}

export function AdminSignIn({
  allowInitialAccountSetup = false,
}: {
  allowInitialAccountSetup?: boolean;
}) {
  const { signIn } = useAuthActions();
  const [requestedFlow, setRequestedFlow] = useState<"signIn" | "signUp">(
    "signIn",
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();
  const flow = allowInitialAccountSetup ? requestedFlow : ("signIn" as const);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");

    const form = new FormData(event.currentTarget);
    form.set("flow", flow);

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
          <h1 id="admin-auth-title">
            {flow === "signUp"
              ? "Create the initial account."
              : "Return to the workspace."}
          </h1>
          <p>
            {flow === "signUp"
              ? "This creates a signed identity only. The deployment operator must still grant that identity owner access."
              : "Sign in with the account issued for English Club administration."}
          </p>
        </div>

        <form className={styles.authForm} onSubmit={handleSubmit}>
          {flow === "signUp" ? (
            <label className={styles.field} htmlFor={nameId}>
              <span>Display name</span>
              <input
                id={nameId}
                name="name"
                type="text"
                autoComplete="name"
                minLength={2}
                maxLength={100}
                required
              />
            </label>
          ) : null}

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
              autoComplete={flow === "signUp" ? "new-password" : "current-password"}
              minLength={12}
              maxLength={128}
              required
            />
            {flow === "signUp" ? (
              <small className={styles.fieldHint}>
                Use 12 or more characters with upper-case, lower-case, and numeric characters.
              </small>
            ) : null}
          </label>

          {message ? (
            <p className={styles.formError} role="alert">
              {message}
            </p>
          ) : null}

          <button className={styles.primaryButton} type="submit" disabled={pending}>
            {pending
              ? flow === "signUp"
                ? "Creating identity…"
                : "Checking account…"
              : flow === "signUp"
                ? "Create initial identity"
                : "Sign in"}
            <ChevronRightIcon aria-hidden width={18} height={18} />
          </button>
        </form>

        {allowInitialAccountSetup ? (
          <button
            className={styles.textButton}
            type="button"
            disabled={pending}
            onClick={() => {
              setMessage("");
              setRequestedFlow((current) =>
                current === "signIn" ? "signUp" : "signIn",
              );
            }}
          >
            {flow === "signUp"
              ? "Return to sign in"
              : "Set up the first administrator account"}
          </button>
        ) : null}

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
  const identity = useQuery(api.adminUsers.whoAmI, {});
  const [copied, setCopied] = useState(false);

  async function copyIdentity() {
    if (!identity?.tokenIdentifier) return;
    await navigator.clipboard.writeText(identity.tokenIdentifier);
    setCopied(true);
  }

  return (
    <main className={styles.accessViewport}>
      <section className={styles.accessPanel}>
        <IdentificationIcon aria-hidden width={42} height={42} />
        <p className={styles.contextLabel}>Access required</p>
        <h1>This account is not on the admin list.</h1>
        <p>
          Ask an English Club owner to grant access to this signed identity. Creating an
          account alone never opens the CMS.
        </p>
        {identity === undefined ? (
          <div className={styles.loadingLine} aria-label="Loading account identity" />
        ) : identity === null ? null : (
          <div className={styles.identityBox}>
            <span>Your token identifier</span>
            <code>{identity.tokenIdentifier}</code>
            <button type="button" className={styles.secondaryButton} onClick={copyIdentity}>
              <ClipboardDocumentIcon aria-hidden width={18} height={18} />
              {copied ? "Copied" : "Copy identity"}
            </button>
          </div>
        )}
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

export function AdminAccessGate({
  allowInitialAccountSetup = false,
  children,
}: {
  allowInitialAccountSetup?: boolean;
  children: ReactNode;
}) {
  const { isLoading, isAuthenticated } = useConvexAuth();

  if (isLoading) return <AdminLoading />;
  if (!isAuthenticated) {
    return (
      <AdminSignIn allowInitialAccountSetup={allowInitialAccountSetup} />
    );
  }
  return <AuthenticatedAdmin>{children}</AuthenticatedAdmin>;
}
