"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { LogOut, Shield, User, Terminal, Menu, X } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If user is unauthenticated, hide Navbar content
  if (!user || !role) {
    return null;
  }

  // Segment navigation links based on user role
  const customerLinks = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Chat Support", href: "/chat" },
    { name: "My Tickets", href: "/tickets" },
  ];

  const managerLinks = [
    { name: "Manager Dashboard", href: "/manager/dashboard" },
    { name: "Pending Approvals", href: "/manager/approvals" },
    { name: "Telemetry Metrics", href: "/manager/telemetry" },
  ];

  const navLinks = role === "manager" ? managerLinks : customerLinks;

  const isActive = (href: string) => {
    if (href === "/" && pathname !== "/") return false;
    return pathname.startsWith(href);
  };

  return (
    <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Logo & Navigation Links */}
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2 font-bold text-zinc-900 dark:text-white">
              {role === "manager" ? (
                <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              ) : (
                <Terminal className="w-5 h-5 text-zinc-900 dark:text-zinc-100" />
              )}
              <span className="tracking-tight text-lg">Triager.io</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex space-x-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`text-sm font-medium px-3 py-2 rounded-md transition-colors ${
                    isActive(link.href)
                      ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
                  }`}
                >
                  {link.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Right Header Operations */}
          <div className="hidden md:flex items-center space-x-4">
            
            {/* User Profile Tag */}
            <div className="flex items-center space-x-2 text-sm text-zinc-600 dark:text-zinc-400 border-l border-zinc-200 dark:border-zinc-800 pl-4">
              <User className="w-4 h-4" />
              <span className="max-w-[150px] truncate font-medium">{user.email}</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-700 dark:text-zinc-300">
                {role}
              </span>
            </div>

            {/* Logout Trigger */}
            <button
              onClick={logout}
              className="flex items-center space-x-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center md:hidden space-x-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 px-2 pt-2 pb-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white"
                  : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              }`}
            >
              {link.name}
            </Link>
          ))}
          <div className="border-t border-zinc-200 dark:border-zinc-800 my-2 pt-2 px-3 flex flex-col space-y-2">
            <div className="text-sm text-zinc-500 dark:text-zinc-400 flex items-center space-x-2">
              <User className="w-4 h-4" />
              <span className="truncate">{user.email}</span>
              <span className="text-[10px] uppercase font-semibold tracking-wider bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-700 dark:text-zinc-300">
                {role}
              </span>
            </div>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                logout();
              }}
              className="flex items-center space-x-2 text-sm font-medium text-red-600 dark:text-red-400 py-1"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
